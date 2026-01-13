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