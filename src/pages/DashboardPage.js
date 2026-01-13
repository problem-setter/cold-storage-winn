import { useEffect, useRef, useState } from 'react';
import './DashboardPage.css';
import { supabase } from '../lib/supabase';
import { requestFCMToken, onMessageListener } from '../firebase-messaging';

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
const TEMP_MIN = 30;
const TEMP_MAX = 80;
const ALERT_COOLDOWN = 5 * 60 * 1000;

const DashboardPage = () => {
  const [greeting, setGreeting] = useState(getJakartaGreeting());
  const [latest, setLatest] = useState(null);

  useEffect(() => {
  const initNotifications = async () => {
    console.log('🔔 Initializing notifications...')
    
    // Request permission & token
    const token = await requestFCMToken()
    
    if (token) {
      console.log('✅ Notifications ready')
      
      // Setup foreground message listener
      onMessageListener((payload) => {
        console.log('📨 Foreground message:', payload)
        const { title, body } = payload.notification || {}
        if (title && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/logo192.png',
            tag: 'cold-storage-notification',
            requireInteraction: true
          })
        }
      })
    } else {
      console.warn('⚠️ Notifications not available')
    }
  }
  
  initNotifications()
}, [])

  // SIMPAN DATA SEBELUMNYA
  const prevRef = useRef(null);

  // TRACKER WAKTU NOTIF
  const alertTime = useRef({});

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
      new Notification(title, { body, icon: '/logo192.png' });
    }
  };

  /* ===== PERMISSION & FCM ===== */
  // useEffect(() => {
  //   if (!('Notification' in window)) return;
  //   Notification.requestPermission().then((p) => {
  //     if (p === 'granted') requestFCMToken();
  //   });
  // }, []);

  // useEffect(() => {
  //   onMessageListener().then((payload) => {
  //     const { title, body } = payload.notification || {};
  //     if (title) notify(title, body);
  //   });
  // }, []);

  /* ===== GREETING UPDATE ===== */
  useEffect(() => {
    const i = setInterval(() => setGreeting(getJakartaGreeting()), 60000);
    return () => clearInterval(i);
  }, []);

  /* ===== LOGIKA NOTIF (EDGE + RESET COOLDOWN) ===== */
  const processData = (current) => {
    if (!current) return;

    const prev = prevRef.current;

    // FIRST LOAD → JANGAN NOTIF
    if (!prev) {
      prevRef.current = current;
      return;
    }

    /* ===== SYSTEM ===== */
    if (prev.power_on === 1 && current.power_on === 0 && canNotify('system_off')) {
      notify('🚨 SYSTEM OFF', 'Cold Storage SYSTEM mati');
    }
    if (prev.power_on === 0 && current.power_on === 1) {
      resetCooldown('system_off');
    }

    /* ===== COMPRESSOR ===== */
    if (prev.comp_on === 1 && current.comp_on === 0 && canNotify('comp_off')) {
      notify('⚠️ Compressor OFF', 'Compressor dalam kondisi OFF');
    }
    if (prev.comp_on === 0 && current.comp_on === 1) {
      resetCooldown('comp_off');
    }

    if (prev.comp_fault === 0 && current.comp_fault === 1 && canNotify('comp_fault')) {
      notify('🚨 Compressor Fault', 'Gangguan pada compressor');
    }
    if (prev.comp_fault === 1 && current.comp_fault === 0) {
      resetCooldown('comp_fault');
    }

    /* ===== CONDENSER ===== */
    if (prev.cond_on === 1 && current.cond_on === 0 && canNotify('cond_off')) {
      notify('⚠️ Condenser OFF', 'Condenser dalam kondisi OFF');
    }
    if (prev.cond_on === 0 && current.cond_on === 1) {
      resetCooldown('cond_off');
    }

    if (prev.cond_fault === 0 && current.cond_fault === 1 && canNotify('cond_fault')) {
      notify('🚨 Condenser Fault', 'Gangguan pada condenser');
    }
    if (prev.cond_fault === 1 && current.cond_fault === 0) {
      resetCooldown('cond_fault');
    }

    /* ===== EVAPORATOR ===== */
    if (prev.evap_on === 1 && current.evap_on === 0 && canNotify('evap_off')) {
      notify('⚠️ Evaporator OFF', 'Evaporator dalam kondisi OFF');
    }
    if (prev.evap_on === 0 && current.evap_on === 1) {
      resetCooldown('evap_off');
    }

    if (prev.evap_fault === 0 && current.evap_fault === 1 && canNotify('evap_fault')) {
      notify('🚨 Evaporator Fault', 'Gangguan pada evaporator');
    }
    if (prev.evap_fault === 1 && current.evap_fault === 0) {
      resetCooldown('evap_fault');
    }

    /* ===== TEMPERATURE ===== */
    const prevTempFault = prev.suhu < TEMP_MIN || prev.suhu > TEMP_MAX;
    const currTempFault = current.suhu < TEMP_MIN || current.suhu > TEMP_MAX;

    if (!prevTempFault && currTempFault && canNotify('temp_fault')) {
      notify(
        '🌡️ Temperature Fault',
        `Suhu ${current.suhu.toFixed(1)}°C di luar batas aman (${TEMP_MIN}–${TEMP_MAX}°C)`
      );
    }
    if (prevTempFault && !currTempFault) {
      resetCooldown('temp_fault');
    }

    // UPDATE STATE TERAKHIR (WAJIB PALING BAWAH)
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cold_storage' },
        (p) => {
          setLatest(p.new);
          processData(p.new);
        }
      )
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

  /* ===== UI (TIDAK DIUBAH) ===== */
  const machineStatuses = latest
    ? [
        { label: 'Compressor', status: latest.comp_on ? 'ON' : 'OFF' },
        { label: 'Evaporator', status: latest.evap_on ? 'ON' : 'OFF' },
        { label: 'Condenser', status: latest.cond_on ? 'ON' : 'OFF' },
        { label: 'System', status: latest.power_on ? 'ON' : 'OFF' },
      ]
    : [];

  return (
    <main className="page dashboard-page">
      <div className="dashboard-title">
        <h1>Dashboard</h1>
        <span>Selamat {greeting}!</span>
      </div>

      <div className="dashboard-main">
        <div className="temperature card">
          <div className="temperature-title">
            <span>Suhu saat ini: </span>
            <span className="temperature-value">
              {latest ? `${latest.suhu.toFixed(1)}°C` : '--'}
            </span>
          </div>
        </div>

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
