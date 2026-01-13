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
      console.warn('❌ Service Worker tidak didukung di browser ini')
      return null
    }
    if (!('Notification' in window)) {
      console.warn('❌ Notification API tidak didukung')
      return null
    }

    // REQUEST PERMISSION FIRST
    console.log('🔄 Requesting notification permission...')
    const permission = await Notification.requestPermission()
    console.log('🔔 Permission status:', permission)

    if (permission !== 'granted') {
      console.warn('❌ User denied notification permission')
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
    const token = await getToken(messaging, {
      vapidKey: 'BIhjle0uOXfsqoHjHzHBAx_HOfyPiurz7fSAY3zHr7weDIAqOonhF9fFTsHyI6-u0lbnMyq-aiANKqFaofLlG_Q',
      serviceWorkerRegistration: registration
    })

    if (!token) {
      console.error('❌ Gagal mendapatkan FCM token - token kosong')
      return null
    }

    console.log('✅ FCM token acquired:', token.substring(0, 20) + '...')
    localStorage.setItem('fcm_token', token)

    // Send token to Supabase for storage
    try {
      const { supabase } = await import('./lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('fcm_tokens').upsert({
          user_id: user.id,
          token: token,
          created_at: new Date().toISOString()
        })
        console.log('✅ Token saved to database')
      }
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

// export const onMessageListener = (callback) => {
//   onMessage(messaging, (payload) => {
//     console.log('📩 Foreground message:', payload)
//     callback(payload)
//   })
// }
