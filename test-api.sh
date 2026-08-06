#!/bin/bash

# Pastikan Anda sudah menjalankan server backend terlebih dahulu
# dengan perintah: npm run dev
# di terminal atau tab yang terpisah!

BASE_URL="http://localhost:8000/api/v1"

echo "============================================="
echo "   PENGUJIAN API BACKEND RECOGNITION       "
echo "============================================="
echo ""

# 1. TEST LOGIN MOBILE
echo "1. Menguji Endpoint Login Mobile (POST /mobile/auth/login)"
LOGIN_RES=$(curl -s -X POST $BASE_URL/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "budi@test.com", "password": "password123"}')

# Cek apakah response mengandung kata token
if echo "$LOGIN_RES" | grep -q '"token"'; then
    echo "✅ [SUCCESS] Login berhasil!"
    # Ekstrak token menggunakan nodejs bawaan
    TOKEN=$(node -pe "try { JSON.parse(process.argv[1]).data.token } catch(e) { '' }" "$LOGIN_RES")
else
    echo "❌ [FAILED] Login gagal. Pastikan server sudah jalan."
    echo "Response: $LOGIN_RES"
    exit 1
fi

echo ""
# 2. TEST JADWAL MOBILE HARI INI
echo "2. Menguji Endpoint Jadwal Hari Ini (GET /mobile/schedule/today)"
SCHEDULE_RES=$(curl -s -X GET $BASE_URL/mobile/schedule/today \
  -H "Authorization: Bearer $TOKEN")

if echo "$SCHEDULE_RES" | grep -q '"success":true'; then
    echo "✅ [SUCCESS] Berhasil mengambil jadwal!"
    echo "Detail Jadwal:"
    echo "$SCHEDULE_RES" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0, 'utf-8')).data, null, 2)"
else
    echo "❌ [FAILED] Gagal mengambil jadwal."
    echo "Response: $SCHEDULE_RES"
fi

echo ""
# 3. TEST KIRIM ABSENSI (MENSIMULASIKAN AI / CCTV)
echo "3. Menguji Endpoint Absensi (POST /attendance)"
# Mengambil waktu saat ini dalam format ISO
NOW=$(node -pe "new Date().toISOString()")

ATTENDANCE_RES=$(curl -s -X POST $BASE_URL/attendance \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-ml-api-key-change-in-production" \
  -d '{
    "employee_id": "EMP001",
    "camera_id": "cctv-pintu-depan",
    "event_type": "CHECK_IN",
    "detected_at": "'$NOW'"
  }')

# Karena kalau berhasil /attendance mengembalikan 201 Created atau success message
if echo "$ATTENDANCE_RES" | grep -q -e '"success":true' -e '"message"'; then
    echo "✅ [SUCCESS] Absensi berhasil diproses!"
    echo "Response Absensi:"
    echo "$ATTENDANCE_RES" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0, 'utf-8')), null, 2)"
else
    echo "❌ [FAILED] Absensi gagal."
    echo "Response: $ATTENDANCE_RES"
fi

echo ""
# 4. TEST NOTIFIKASI MOBILE
echo "4. Menguji Endpoint Notifikasi Mobile (GET /mobile/notifications)"
NOTIF_RES=$(curl -s -X GET $BASE_URL/mobile/notifications \
  -H "Authorization: Bearer $TOKEN")

if echo "$NOTIF_RES" | grep -q '"success":true'; then
    echo "✅ [SUCCESS] Berhasil mengambil daftar notifikasi!"
    echo "Detail Notifikasi:"
    echo "$NOTIF_RES" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0, 'utf-8')).data, null, 2)"
    
    NOTIF_ID=$(node -pe "try { JSON.parse(process.argv[1]).data[0].id } catch(e) { '' }" "$NOTIF_RES")
    if [ -n "$NOTIF_ID" ]; then
        echo ""
        echo "4b. Menguji Mark as Read Notifikasi (PATCH /mobile/notifications/$NOTIF_ID/read)"
        READ_RES=$(curl -s -X PATCH $BASE_URL/mobile/notifications/$NOTIF_ID/read \
          -H "Authorization: Bearer $TOKEN")
        echo "Response Mark as Read:"
        echo "$READ_RES" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0, 'utf-8')), null, 2)"
    fi
else
    echo "❌ [FAILED] Gagal mengambil notifikasi."
    echo "Response: $NOTIF_RES"
fi

echo ""
echo "============================================="
echo "        SEMUA PENGUJIAN SELESAI            "
echo "============================================="

