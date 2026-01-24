import { useEffect, useRef, useState } from 'react';
import './DashboardPage.css';
import { supabase } from '../lib/supabase';
import { showNotificationViaServiceWorker } from '../firebase-messaging';

/* ===== GREETING ===== */
const getJakartaGreeting = () => {
  const hour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const h = new Date(hour).getHours();
  if (h >= 5 && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 18) return 'sore';
  return 'malam';
};

/* ===== KONSTANTA ===== */
const ALERT_COOLDOWN = 2 * 1000; // Kurangi dari 30s ke 2s untuk allow multiple notif
const TEMP_REPEAT_INTERVAL_MS = 15000;
const TEMP_DELTA_THRESHOLD = 0.2;

const DashboardPage = () => {
  const [greeting, setGreeting] = useState(getJakartaGreeting());
  const [latest, setLatest] = useState(null);

  const [tempMin, setTempMin] = useState('35');
  const [tempMax, setTempMax] = useState('80');
  const [savingTemp, setSavingTemp] = useState(false);

  const isTempEmpty =
    tempMin === '' ||
    tempMax === '' ||
    tempMin === null ||
    tempMax === null;

  const minNum = Number(tempMin);
  const maxNum = Number(tempMax);

  const isRangeInvalid =
    !isTempEmpty &&
    !isNaN(minNum) &&
    !isNaN(maxNum) &&
    minNum >= maxNum;

  const prevRef = useRef(null);
  const alertTime = useRef({});
  const lastTempNotifyRef = useRef({ time: 0, value: null });

  /* ===== RANGE SUHU REF UNTUK REALTIME ===== */
  const tempRangeRef = useRef({ min: tempMin, max: tempMax });

  useEffect(() => {
    tempRangeRef.current = { min: Number(tempMin), max: Number(tempMax) };
  }, [tempMin, tempMax]);

  const canNotify = (key) => {
    const now = Date.now();
    if (!alertTime.current[key] || now - alertTime.current[key] > ALERT_COOLDOWN) {
      alertTime.current[key] = now;
      return true;
    }
    return false;
  };

  const resetCooldown = (key) => {
    alertTime.current[key] = 0;
  };

  const notify = (title, body) => {
    if (Notification.permission === 'granted') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const isTemp = title.includes('Temperature');
      const baseTag = isTemp ? 'temp' : 'alert';
      const fullBody = `[${timeStr}] ${body}`;

      // Show notification on frontend dengan unique tag
      const uniqueTag = `notif-${title.replace(/[^a-z0-9]/gi, '')}-${Date.now()}`;
      showNotificationViaServiceWorker(title, {
        body: fullBody,
        tag: uniqueTag,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });

      // Send to backend for FCM (akan dikirim ke semua device)
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      if (supabaseUrl) {
        fetch(`${supabaseUrl}/functions/v1/send-fcm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('supabase_token') || ''}`
          },
          body: JSON.stringify({
            title: title,
            body: fullBody
          })
        }).catch(err => console.log('FCM send error:', err));
      }
    }
  };

  /* ===== LOAD RANGE SUHU DARI DB ===== */
  useEffect(() => {
    const loadTempRange = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('temp_min, temp_max')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setTempMin(data.temp_min);
        setTempMax(data.temp_max);
      }
    };
    loadTempRange();
  }, []);

  /* ===== REALTIME SINKRON RANGE SUHU ===== */
  useEffect(() => {
    const channel = supabase
      .channel('settings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, (p) => {
        if (p.new) {
          setTempMin(p.new.temp_min);
          setTempMax(p.new.temp_max);
          resetCooldown('temp_fault');
          lastTempNotifyRef.current = { time: 0, value: null };
          // prevRef.current = null;
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ===== SIMPAN RANGE SUHU USER ===== */
  const saveTempRange = async () => {
    const min = Number(tempMin);
    const max = Number(tempMax);

    if (isNaN(min) || isNaN(max)) {
      alert('Range suhu tidak boleh kosong');
      return;
    }

    if (min >= max) {
      alert('Temp MIN harus lebih kecil dari Temp MAX');
      return;
    }

    setSavingTemp(true);

    await supabase.from('system_settings').insert({
      temp_min: min,
      temp_max: max
    });

    resetCooldown('temp_fault');
    lastTempNotifyRef.current = { time: 0, value: null };

    setSavingTemp(false);
    alert('Range suhu berhasil disimpan');
  };

  /* ===== GREETING UPDATE ===== */
  useEffect(() => {
    const i = setInterval(() => setGreeting(getJakartaGreeting()), 60000);
    return () => clearInterval(i);
  }, []);

  const processData = (current) => {
  if (!current) return;

  const prev = prevRef.current;
  const { min, max } = tempRangeRef.current;

  /* 🔔 FIRST LOAD CHECK */
  if (!prev) {
    const tempFault = current.suhu < min || current.suhu > max;
    if (tempFault && canNotify('temp_fault')) {
      notify(
        '🌡️ Temperature Out of Range',
        `Suhu ${current.suhu.toFixed(1)}°C di luar batas aman (${min}–${max}°C)`
      );
    }

    if (current.temp_fault === 1 && canNotify('temp_pin')) {
      notify(
        '🚨 Temperature Sensor Fault',
        'Terjadi gangguan pada sensor suhu'
      );
    }

    // Check component OFF on first load
    if (current.comp_fault === 1 && canNotify('comp_fault')) {
      notify(
        '🔧 Compressor Fault',
        'Kompressor mengalami gangguan'
      );
    }

    if (current.evap_fault === 1 && canNotify('evap_fault')) {
      notify(
        '❄️ Evaporator Fault',
        'Evaporator mengalami gangguan'
      );
    }

    if (current.cond_fault === 1 && canNotify('cond_fault')) {
      notify(
        '🌊 Condenser Fault',
        'Kondenser mengalami gangguan'
      );
    }

    prevRef.current = current;
    return;
  }

  /* 1️⃣ TEMP RANGE */
  const prevTempFault = prev.suhu < min || prev.suhu > max;
  const currTempFault = current.suhu < min || current.suhu > max;

  if (!prevTempFault && currTempFault && canNotify('temp_fault')) {
    notify(
      '🌡️ Temperature Out of Range',
      `Suhu ${current.suhu.toFixed(1)}°C di luar batas aman (${min}–${max}°C)`
    );
  }

  if (prevTempFault && !currTempFault) {
    resetCooldown('temp_fault');
  }

  /* 2️⃣ SENSOR PIN */
  const prevTempPinFault = prev.temp_fault === 1;
  const currTempPinFault = current.temp_fault === 1;

  if (!prevTempPinFault && currTempPinFault && canNotify('temp_pin')) {
    notify(
      '🚨 Temperature Sensor Fault',
      'Terjadi gangguan pada sensor suhu'
    );
  }

  if (prevTempPinFault && !currTempPinFault) {
    resetCooldown('temp_pin');
  }

  /* 3️⃣ COMPRESSOR STATUS (ON/OFF) */
  const prevCompOn = prev.comp_on === 1;
  const currCompOn = current.comp_on === 1;

  if (prevCompOn && !currCompOn && canNotify('comp_off')) {
    notify(
      '🔴 Kompressor Mati',
      'Kompressor telah berhenti'
    );
  }

  if (!prevCompOn && currCompOn) {
    resetCooldown('comp_off');
  }

  /* 4️⃣ COMPRESSOR FAULT */
  const prevCompFault = prev.comp_fault === 1;
  const currCompFault = current.comp_fault === 1;

  if (!prevCompFault && currCompFault && canNotify('comp_fault')) {
    notify(
      '🔧 Kompressor Error',
      'Kompressor mengalami gangguan/error'
    );
  }

  if (prevCompFault && !currCompFault) {
    resetCooldown('comp_fault');
  }

  /* 5️⃣ EVAPORATOR STATUS (ON/OFF) */
  const prevEvapOn = prev.evap_on === 1;
  const currEvapOn = current.evap_on === 1;

  if (prevEvapOn && !currEvapOn && canNotify('evap_off')) {
    notify(
      '🔴 Evaporator Mati',
      'Evaporator telah berhenti'
    );
  }

  if (!prevEvapOn && currEvapOn) {
    resetCooldown('evap_off');
  }

  /* 6️⃣ EVAPORATOR FAULT */
  const prevEvapFault = prev.evap_fault === 1;
  const currEvapFault = current.evap_fault === 1;

  if (!prevEvapFault && currEvapFault && canNotify('evap_fault')) {
    notify(
      '❄️ Evaporator Error',
      'Evaporator mengalami gangguan/error'
    );
  }

  if (prevEvapFault && !currEvapFault) {
    resetCooldown('evap_fault');
  }

  /* 7️⃣ CONDENSER STATUS (ON/OFF) */
  const prevCondOn = prev.cond_on === 1;
  const currCondOn = current.cond_on === 1;

  if (prevCondOn && !currCondOn && canNotify('cond_off')) {
    notify(
      '🔴 Kondenser Mati',
      'Kondenser telah berhenti'
    );
  }

  if (!prevCondOn && currCondOn) {
    resetCooldown('cond_off');
  }

  /* 8️⃣ CONDENSER FAULT */
  const prevCondFault = prev.cond_fault === 1;
  const currCondFault = current.cond_fault === 1;

  if (!prevCondFault && currCondFault && canNotify('cond_fault')) {
    notify(
      '🌊 Kondenser Error',
      'Kondenser mengalami gangguan/error'
    );
  }

  if (prevCondFault && !currCondFault) {
    resetCooldown('cond_fault');
  }

  /* 9️⃣ SYSTEM POWER STATUS (ON/OFF) */
  const prevPowerOn = prev.power_on === 1;
  const currPowerOn = current.power_on === 1;

  if (prevPowerOn && !currPowerOn && canNotify('power_off')) {
    notify(
      '⚡ Sistem Mati',
      'Sistem cold storage telah mati'
    );
  }

  if (!prevPowerOn && currPowerOn) {
    resetCooldown('power_off');
  }

  prevRef.current = current;
};

  /* ===== LOAD AWAL ===== */
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('cold_storage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data?.length) {
        setLatest(data[0]);
        // prevRef.current = data[0];
      }
    };
    load();
  }, []);

  /* ===== REALTIME ===== */
  useEffect(() => {
    const channel = supabase
      .channel('cold-storage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cold_storage' }, (p) => {
        setLatest(p.new);
        processData(p.new);

        // Broadcast to all tabs via SharedWorker or localStorage
        try {
          localStorage.setItem('latest_cold_storage', JSON.stringify({
            data: p.new,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.log('Could not update localStorage');
        }

        // Notify service worker
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'DATA_UPDATE',
            data: p.new
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ===== POLLING BACKUP (untuk sync saat SW inactive) ===== */
  useEffect(() => {
    const i = setInterval(async () => {
      const { data } = await supabase
        .from('cold_storage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data?.length) {
        setLatest(data[0]);
        processData(data[0]);
      }
    }, 5000);

    return () => clearInterval(i);
  }, []);

  const machineStatuses = latest
    ? [
        { label: 'Compressor', status: latest.comp_on ? 'ON' : 'OFF' },
        { label: 'Evaporator', status: latest.evap_on ? 'ON' : 'OFF' },
        { label: 'Condenser', status: latest.cond_on ? 'ON' : 'OFF' },
        { label: 'System', status: latest.power_on ? 'ON' : 'OFF' }
      ]
    : [];

  return (
    <main className="page dashboard-page">
      <div className="dashboard-title">
        <h1>Dashboard</h1>
        <span>Selamat {greeting}!</span>
      </div>

      {/* ===== CARD SUHU DI PALING ATAS ===== */}
      <div className="temperature card">
        <div className="temperature-title">
          <span>Suhu saat ini:</span>
          <span className="temperature-value">
            {latest ? `${latest.suhu.toFixed(1)}°C` : '--'}
          </span>
        </div>
      </div>

      {/* ===== INPUT RANGE SUHU ===== */}
      <div className="card temp-range-card">
        <h3 className="temp-range-title">Pengaturan Range Suhu</h3>
        <div className="temp-range-inputs">
          <div className="temp-input-group">
            <label>Min (°C)</label>
            <input
              type="number"
              value={tempMin}
              onChange={(e) => setTempMin(e.target.value)}
              className="temp-input"
            />
          </div>
          <div className="temp-input-group">
            <label>Max (°C)</label>
            <input
              type="number"
              value={tempMax}
              onChange={(e) => setTempMax(e.target.value)}
              className="temp-input"
            />
          </div>
          <button onClick={saveTempRange} disabled={savingTemp || isTempEmpty || isRangeInvalid} className="temp-save-btn">
            {savingTemp ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* ===== STATUS MACHINE ===== */}
      <div className="dashboard-main">
        <div className="machine card">
          {machineStatuses.map((m) => (
            <div key={m.label} className="machine-row">
              <div className="machine-label">{m.label}</div>
              <div className="machine-status" data-state={m.status.toLowerCase()}>
                {m.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
