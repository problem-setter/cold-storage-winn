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
const ALERT_COOLDOWN = 30 * 1000;
const TEMP_REPEAT_INTERVAL_MS = 15000;
const TEMP_DELTA_THRESHOLD = 0.2;

const DashboardPage = () => {
  const [greeting, setGreeting] = useState(getJakartaGreeting());
  const [latest, setLatest] = useState(null);

  const [tempMin, setTempMin] = useState(35);
  const [tempMax, setTempMax] = useState(80);
  const [savingTemp, setSavingTemp] = useState(false);

  const prevRef = useRef(null);
  const alertTime = useRef({});
  const lastTempNotifyRef = useRef({ time: 0, value: null });

  /* ===== RANGE SUHU REF UNTUK REALTIME ===== */
  const tempRangeRef = useRef({ min: tempMin, max: tempMax });

  useEffect(() => {
    tempRangeRef.current = { min: tempMin, max: tempMax };
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

      showNotificationViaServiceWorker(title, {
        body: `[${timeStr}] ${body}`,
        tag: isTemp ? 'temp-alert' : `${baseTag}-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
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
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ===== SIMPAN RANGE SUHU USER ===== */
  const saveTempRange = async () => {
    if (tempMin >= tempMax) {
      alert('Temp MIN harus lebih kecil dari Temp MAX');
      return;
    }

    setSavingTemp(true);

    await supabase.from('system_settings').insert({
      temp_min: tempMin,
      temp_max: tempMax
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

  /* ===== LOGIKA NOTIF ===== */
  const processData = (current) => {
    if (!current) return;

    const { min, max } = tempRangeRef.current;

    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = current;
      return;
    }

    const prevTempFault = prev.suhu < min || prev.suhu > max;
    const currTempFault = current.suhu < min || current.suhu > max;

    if (!prevTempFault && currTempFault && canNotify('temp_fault')) {
      notify(
        '🌡️ Temperature Fault',
        `Suhu ${current.suhu.toFixed(1)}°C di luar batas aman (${min}–${max}°C)`
      );
      lastTempNotifyRef.current = { time: Date.now(), value: current.suhu };
    }

    if (currTempFault && prevTempFault) {
      const now = Date.now();
      const last = lastTempNotifyRef.current;
      const timeOk = now - last.time >= TEMP_REPEAT_INTERVAL_MS;
      const deltaOk =
        typeof last.value === 'number'
          ? Math.abs(current.suhu - last.value) >= TEMP_DELTA_THRESHOLD
          : true;

      if (timeOk || deltaOk) {
        notify(
          '🌡️ Temperature Fault',
          `Suhu ${current.suhu.toFixed(1)}°C di luar batas aman (${min}–${max}°C)`
        );
        lastTempNotifyRef.current = { time: now, value: current.suhu };
      }
    }

    if (prevTempFault && !currTempFault) {
      resetCooldown('temp_fault');
      lastTempNotifyRef.current = { time: 0, value: null };
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
        prevRef.current = data[0];
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
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ===== POLLING BACKUP ===== */
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
              onChange={(e) => setTempMin(Number(e.target.value))}
              className="temp-input"
            />
          </div>
          <div className="temp-input-group">
            <label>Max (°C)</label>
            <input
              type="number"
              value={tempMax}
              onChange={(e) => setTempMax(Number(e.target.value))}
              className="temp-input"
            />
          </div>
          <button onClick={saveTempRange} disabled={savingTemp} className="temp-save-btn">
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
