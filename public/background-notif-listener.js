// Background notification listener
// Ini script yang dijalankan di background untuk monitor database changes
// dan trigger FCM notifications

importScripts('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

let supabase = null;
let lastRecord = null;

// Initialize Supabase
function initSupabase() {
  if (!supabase && typeof supabase !== 'undefined') {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

// Check for component changes
function checkChanges(current, prev) {
  const alerts = [];

  if (!prev) return alerts;

  // Kompressor
  if (current.comp_on !== prev.comp_on && prev.comp_on === 1 && current.comp_on === 0) {
    alerts.push({ title: '🔴 Kompressor Mati', body: 'Kompressor telah berhenti' });
  }
  if (current.comp_fault !== prev.comp_fault && prev.comp_fault === 0 && current.comp_fault === 1) {
    alerts.push({ title: '🔧 Kompressor Error', body: 'Kompressor mengalami gangguan/error' });
  }

  // Evaporator
  if (current.evap_on !== prev.evap_on && prev.evap_on === 1 && current.evap_on === 0) {
    alerts.push({ title: '🔴 Evaporator Mati', body: 'Evaporator telah berhenti' });
  }
  if (current.evap_fault !== prev.evap_fault && prev.evap_fault === 0 && current.evap_fault === 1) {
    alerts.push({ title: '❄️ Evaporator Error', body: 'Evaporator mengalami gangguan/error' });
  }

  // Condenser
  if (current.cond_on !== prev.cond_on && prev.cond_on === 1 && current.cond_on === 0) {
    alerts.push({ title: '🔴 Kondenser Mati', body: 'Kondenser telah berhenti' });
  }
  if (current.cond_fault !== prev.cond_fault && prev.cond_fault === 0 && current.cond_fault === 1) {
    alerts.push({ title: '🌊 Kondenser Error', body: 'Kondenser mengalami gangguan/error' });
  }

  // System
  if (current.power_on !== prev.power_on && prev.power_on === 1 && current.power_on === 0) {
    alerts.push({ title: '⚡ Sistem Mati', body: 'Sistem cold storage telah mati' });
  }

  // Temperature
  if (current.temp_fault !== prev.temp_fault && prev.temp_fault === 0 && current.temp_fault === 1) {
    alerts.push({ title: '🚨 Temperature Sensor Fault', body: 'Terjadi gangguan pada sensor suhu' });
  }

  return alerts;
}

// Send FCM via edge function
async function sendFCM(title, body) {
  try {
    const response = await fetch(SUPABASE_URL + '/functions/v1/send-fcm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body })
    });
    console.log('[BG] FCM sent:', await response.json());
  } catch (err) {
    console.error('[BG] FCM error:', err);
  }
}

// Listen to messages from main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'CHECK_CHANGES') {
    const alerts = checkChanges(data.current, data.prev);
    alerts.forEach(alert => {
      sendFCM(alert.title, alert.body);
    });
  }
});

console.log('[BG] Background notification listener loaded');
