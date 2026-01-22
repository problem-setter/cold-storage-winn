importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')

console.log('🔥 Service Worker loaded')

firebase.initializeApp({
  apiKey: "AIzaSyDEaWKVY0ZItkDxNqztE6ElbBx2PkabIR8",
  authDomain: "monitor-cold-storage.firebaseapp.com",
  projectId: "monitor-cold-storage",
  storageBucket: "monitor-cold-storage.firebasestorage.app",
  messagingSenderId: "457687913114",
  appId: "1:457687913114:web:b9ba3e7e708dd8e7a78523"
})

const messaging = firebase.messaging()

// Store previous state for change detection
let lastKnownState = null;
let lastNotificationTime = {}; // Track last notification time

// Check for changes periodically (every 2 seconds - lebih cepat)
setInterval(() => {
  try {
    const stored = localStorage.getItem('latest_cold_storage');
    if (stored) {
      const current = JSON.parse(stored);
      if (lastKnownState && current.data && lastKnownState.data) {
        checkAndNotify(current.data, lastKnownState.data);
      }
      lastKnownState = current;
    }
  } catch (err) {
    console.error('[SW] Error checking state:', err);
  }
}, 2000);

// Check for changes and send FCM - dengan multiple alerts support
function checkAndNotify(current, prev) {
  if (!prev) return;

  const alerts = [];
  const now = Date.now();
  const MIN_INTERVAL = 500; // 500ms antar notifikasi tipe sama

  // Check cooldown per alert type
  const canSendAlert = (alertKey) => {
    if (!lastNotificationTime[alertKey] || (now - lastNotificationTime[alertKey]) > MIN_INTERVAL) {
      lastNotificationTime[alertKey] = now;
      return true;
    }
    return false;
  };

  // Kompressor
  if (current.comp_on !== prev.comp_on && prev.comp_on === 1 && current.comp_on === 0) {
    if (canSendAlert('comp_off')) alerts.push({ title: '🔴 Kompressor Mati', body: 'Kompressor telah berhenti', key: 'comp_off' });
  }
  if (current.comp_fault !== prev.comp_fault && prev.comp_fault === 0 && current.comp_fault === 1) {
    if (canSendAlert('comp_fault')) alerts.push({ title: '🔧 Kompressor Error', body: 'Kompressor mengalami gangguan/error', key: 'comp_fault' });
  }

  // Evaporator
  if (current.evap_on !== prev.evap_on && prev.evap_on === 1 && current.evap_on === 0) {
    if (canSendAlert('evap_off')) alerts.push({ title: '🔴 Evaporator Mati', body: 'Evaporator telah berhenti', key: 'evap_off' });
  }
  if (current.evap_fault !== prev.evap_fault && prev.evap_fault === 0 && current.evap_fault === 1) {
    if (canSendAlert('evap_fault')) alerts.push({ title: '❄️ Evaporator Error', body: 'Evaporator mengalami gangguan/error', key: 'evap_fault' });
  }

  // Condenser
  if (current.cond_on !== prev.cond_on && prev.cond_on === 1 && current.cond_on === 0) {
    if (canSendAlert('cond_off')) alerts.push({ title: '🔴 Kondenser Mati', body: 'Kondenser telah berhenti', key: 'cond_off' });
  }
  if (current.cond_fault !== prev.cond_fault && prev.cond_fault === 0 && current.cond_fault === 1) {
    if (canSendAlert('cond_fault')) alerts.push({ title: '🌊 Kondenser Error', body: 'Kondenser mengalami gangguan/error', key: 'cond_fault' });
  }

  // System
  if (current.power_on !== prev.power_on && prev.power_on === 1 && current.power_on === 0) {
    if (canSendAlert('power_off')) alerts.push({ title: '⚡ Sistem Mati', body: 'Sistem cold storage telah mati', key: 'power_off' });
  }

  // Send all alerts immediately
  alerts.forEach(alert => {
    const uniqueTag = `alert-${alert.key}-${Date.now()}`;
    self.registration.showNotification(alert.title, {
      body: alert.body,
      tag: uniqueTag,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
    
    // Juga kirim ke FCM
    sendFCMNotification(alert.title, alert.body);
  });
}

// Send FCM via edge function
function sendFCMNotification(title, body) {
  try {
    // Get dari localStorage yang di-set di App.js, atau fallback
    const supabaseUrl = localStorage.getItem('supabase_url') || window.SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[SW] Supabase URL not available');
      return;
    }
    fetch(supabaseUrl + '/functions/v1/send-fcm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body })
    }).catch(err => console.error('[SW] FCM error:', err));
  } catch (err) {
    console.error('[SW] FCM send error:', err);
  }
}

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 📨 Background message received:', payload)
  console.log('[SW] Full payload:', JSON.stringify(payload, null, 2))

  const notificationTitle = payload?.notification?.title || 'Cold Storage Alert'
  const notificationOptions = {
    body: payload?.notification?.body || 'Ada notifikasi baru dari Cold Storage',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'cold-storage-notification', // Prevent duplicate notifications
    requireInteraction: true, // Keep notification visible until user interacts
    vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
    silent: false, // Ensure sound plays
    data: payload.data || {}, // Pass data for click handling
    actions: [
      {
        action: 'view',
        title: 'Lihat'
      }
    ]
  }

  console.log('[SW] Showing notification with options:', notificationOptions)

  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[SW] ✅ Notification shown successfully')
    })
    .catch((error) => {
      console.error('[SW] ❌ Failed to show notification:', error)
    })
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👆 Notification clicked:', event)
  
  event.notification.close()
  
  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            return client.focus()
          }
        }
        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow('/dashboard')
        }
      })
  )
})

console.log('✅ Service Worker initialized')