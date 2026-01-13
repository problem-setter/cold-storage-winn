import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

/* ================= FIREBASE CONFIG ================= */
const firebaseConfig = {
  apiKey: "AIzaSyDEaWKVY0ZItkDxNqztE6ElbBx2PkabIR8",
  authDomain: "monitor-cold-storage.firebaseapp.com",
  projectId: "monitor-cold-storage",
  storageBucket: "monitor-cold-storage.firebasestorage.app",
  messagingSenderId: "457687913114",
  appId: "1:457687913114:web:b9ba3e7e708dd8e7a78523"
}

/* ================= INIT ================= */
const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export const requestFCMToken = async () => {
  try {
    console.log('🔄 Starting FCM token request...')

    if (!('serviceWorker' in navigator)) {
      console.error('❌ Service Worker tidak didukung di browser ini')
      return null
    }
    if (!('Notification' in window)) {
      console.error('❌ Notification API tidak didukung')
      return null
    }

    // REQUEST PERMISSION FIRST
    console.log('🔄 Requesting notification permission...')
    const permission = await Notification.requestPermission()
    console.log('🔔 Permission status:', permission)

    if (permission !== 'granted') {
      console.error('❌ User denied notification permission or permission is:', permission)
      return null
    }

    // 🔥 PENTING: Tunggu sampai SW benar-benar ready
    console.log('🔄 Checking service worker registration...')
    let registration = await navigator.serviceWorker.getRegistration('/')

    if (!registration) {
      console.log('📝 Registrasi Service Worker baru...')
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      })

      // Tunggu sampai benar-benar aktif
      if (registration.installing) {
        console.log('⏳ Waiting for service worker to activate...')
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('SW activation timeout')), 10000)
          registration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
              clearTimeout(timeout)
              resolve()
            }
          })
        })
      }
    } else {
      console.log('✅ Service Worker sudah terdaftar')
    }

    // Update SW jika ada versi baru
    console.log('🔄 Updating service worker...')
    await registration.update()

    console.log('🔄 Getting FCM token...')
    console.log('📋 Registration details:', {
      active: !!registration.active,
      scope: registration.scope,
      installing: !!registration.installing,
      waiting: !!registration.waiting
    })
    
    const token = await getToken(messaging, {
      vapidKey: 'BIhjle0uOXfsqoHjHzHBAx_HOfyPiurz7fSAY3zHr7weDIAqOonhF9fFTsHyI6-u0lbnMyq-aiANKqFaofLlG_Q', 
      // vapidKey: 'BBp0_jRFhug2mIO6qmgcQxK8hlj116mi6QGn4m1CE6Uk5IZd8lSSohwNalkIIsAKpjadIYlByvgLPdqwjqeQK-8', // not yours.
      serviceWorkerRegistration: registration
    })

    if (!token) {
      console.error('❌ Gagal mendapatkan FCM token - token kosong')
      return null
    }

    console.log('✅ FCM token acquired:', token.substring(0, 20) + '...')
    localStorage.setItem('fcm_token', token)

    // Send token to Supabase for storage (works without login)
    try {
      const { supabase } = await import('./lib/supabase')
      
      // Try to get user, but save token even if not logged in
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('fcm_tokens').upsert({
        user_id: user?.id || 'anonymous', // Allow anonymous tokens
        token: token,
        device_info: navigator.userAgent.substring(0, 100), // Store device info
        created_at: new Date().toISOString()
      })
      console.log('✅ Token saved to database')
    } catch (dbError) {
      console.warn('⚠️ Failed to save token to database:', dbError)
    }

    return token
  } catch (err) {
    console.error('❌ FCM ERROR:', err)
    return null
  }
}

export const onMessageListener = (callback) => {
  return onMessage(messaging, (payload) => {
    console.log('📩 Foreground message:', payload)
    if (callback) callback(payload)
  })
}

// Show notification via Service Worker (works in WebView & browsers)
export const showNotificationViaServiceWorker = async (title, options = {}) => {
  try {
    const registration = await navigator.serviceWorker.ready
    if (registration && registration.showNotification) {
      // Close all previous notifications with the same tag to force refresh
      if (registration.getNotifications) {
        try {
          // Try direct tag-filtered fetch first
          if (options.tag) {
            const byTag = await registration.getNotifications({ tag: options.tag })
            if (byTag && byTag.length) byTag.forEach(n => n.close())
            else {
              // Fallback: fetch all and filter manually (better WebView support)
              const all = await registration.getNotifications()
              all
                .filter(n => n.tag === options.tag || n.data?.type === options.data?.type)
                .forEach(n => n.close())
            }
          } else {
            // If no tag provided but a type exists, close by type
            if (options.data?.type) {
              const all = await registration.getNotifications()
              all
                .filter(n => n.data?.type === options.data.type)
                .forEach(n => n.close())
            }
          }
        } catch (e) {
          console.warn('⚠️ getNotifications not fully supported, skipping close step:', e)
        }
      }
      
      await registration.showNotification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        tag: options.tag || `notif-${Date.now()}`,
        ...options
      })
      console.log('✅ Notification shown via SW:', title)
    } else {
      console.warn('⚠️ Service Worker registration not available')
    }
  } catch (err) {
    console.error('❌ Failed to show notification:', err)
  }
}
