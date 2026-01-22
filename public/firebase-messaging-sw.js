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

// Check for changes periodically (every 5 seconds)
setInterval(() => {
  try {
    const stored = localStorage.getItem('latest_cold_storage');
    if (stored) {
      const current = JSON.parse(stored);
      if (lastKnownState && current.data) {
        checkAndNotify(current.data, lastKnownState.data);
      }
      lastKnownState = current;
    }
  } catch (err) {
    console.error('[SW] Error checking state:', err);
  }
}, 5000);

// Check for changes and send FCM
function checkAndNotify(current, prev) {
  if (!prev) return;

  const alerts = [];

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

  // Send all alerts
  alerts.forEach(alert => {
    sendFCMNotification(alert.title, alert.body);
  });
}

// Send FCM via edge function
function sendFCMNotification(title, body) {
  try {
    const supabaseUrl = 'https://your-supabase-url.supabase.co'; // Will be replaced by environment
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