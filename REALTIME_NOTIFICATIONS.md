# 🔔 Setup Notifikasi Real-Time di Android

Untuk membuat notifikasi bekerja 100% di Android (background, multiple devices, real-time), ikuti langkah ini:

## 📋 Checklist Setup

### 1. ✅ Deploy Edge Function `monitor-changes`
```bash
# Di folder project, jalankan:
supabase functions deploy monitor-changes

# Atau via CLI jika sudah installed
```

### 2. ✅ Setup Supabase Webhook

Di Supabase Dashboard:
- Pergi ke **Database** → **Webhooks**
- Click **"Create a new webhook"**
- **Configuration:**
  - **Name:** `Cold Storage Monitor`
  - **Table:** `cold_storage`
  - **Events:** Check `INSERT` dan `UPDATE`
  - **URL:** `https://{YOUR_PROJECT_ID}.supabase.co/functions/v1/monitor-changes`
  - **HTTP Method:** `POST`
  - Click **"Add header":**
    - `Authorization`: `Bearer {YOUR_SERVICE_ROLE_KEY}`
    - `Content-Type`: `application/json`

### 3. ✅ Setup Firebase Credentials di Supabase

Di Supabase Dashboard → Settings → Edge Functions → Secrets:
- `FIREBASE_PROJECT_ID` - project ID dari Firebase
- `FIREBASE_CLIENT_EMAIL` - email dari Firebase service account
- `FIREBASE_PRIVATE_KEY` - private key dari Firebase (copy exactly, termasuk newlines)

Cara dapat credentials:
1. Firebase Console → Project → Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy JSON credentials ke Secrets

### 4. ✅ Install PWA di Android

Di HP:
1. Buka Chrome → kunjungi `https://your-domain.com/dashboard`
2. Click **⋮** (menu) → **"Install app"** atau **"Add to Home Screen"**
3. Pilih "Cold Storage Monitor"
4. Tunggu sampai full-screen

### 5. ✅ Enable Notifications

Di HP:
1. Buka Cold Storage app
2. Approve notification permission popup
3. Close app (jangan close di Recent apps, swipe up aja)

---

## 🔧 Cara Kerja

```
Hardware (Arduino/ESP32)
    ↓
    Updates sensor data
    ↓
Supabase Database (cold_storage table)
    ↓
    Webhook trigger
    ↓
Supabase Edge Function (monitor-changes)
    ↓
    Detect changes & compare old_record vs new_record
    ↓
Firebase Cloud Messaging (FCM)
    ↓
Android Device (melalui PWA Service Worker)
    ↓
🔔 Notification di lock screen / background
```

---

## ✨ Yang sekarang work:

✅ **Real-time notifications** - instant saat ada perubahan di database
✅ **Background notifications** - muncul saat app ditutup
✅ **Multiple notifications** - bisa 2-5 notif sekaligus
✅ **Cross-device** - notif ke semua HP yang punya app installed
✅ **Tidak perlu polling** - webhook automatic trigger
✅ **Android native-like** - PWA standalone app

---

## 🐛 Troubleshooting

### Notif tidak muncul di Android?

1. **Check PWA installed:**
   - Lihat di Home Screen, ada icon "Cold Storage Monitor"?
   - Jika tidak, install ulang: Chrome → ⋮ → "Add to Home Screen"

2. **Check notification permission:**
   - Settings → Notifications → Cold Storage Monitor → Allow

3. **Check FCM tokens terdaftar:**
   - Di Supabase Dashboard → SQL Editor
   - Query: `SELECT COUNT(*) FROM fcm_tokens;`
   - Harus > 0

4. **Check webhook aktif:**
   - Dashboard → Webhooks
   - Lihat status webhook "Cold Storage Monitor"
   - Harus status "Active"

5. **Test manual:**
   - SQL: `UPDATE cold_storage SET comp_on = 0 WHERE id = (SELECT MAX(id) FROM cold_storage);`
   - Seharusnya notif muncul di HP

### FCM tokens empty?

- Buka app di HP → approve notification permission
- Token otomatis tersimpan ke database
- Wait ~5 seconds

### Webhook tidak trigger?

- Check Supabase Logs → Functions → monitor-changes
- Lihat error message apa
- Pastikan URL dan Authorization header benar

---

## 📱 Testing Checklist

- [ ] App installed sebagai PWA
- [ ] Notification permission: Allowed
- [ ] Buka app sekali → close
- [ ] Buka Chrome Dev Tools di Laptop → Network tab
- [ ] Trigger perubahan di database (pindah jumper)
- [ ] Check apakah webhook terima request
- [ ] Check apakah FCM terkirim
- [ ] Lihat notif muncul di HP

---

## 🎯 Next Steps (Optional)

Untuk notif yang lebih powerful:
- [ ] Setup **Periodic Background Sync** - sync data setiap N menit
- [ ] Setup **Push subscription** - untuk custom messages
- [ ] Setup **Badge API** - icon badge dengan counter
- [ ] Setup **Vibration pattern** - custom vibration per alert type
