// ==========================================
// KONFIGURASI KANTOR DESA
// ==========================================
// Masukkan koordinat Latitude & Longitude Kantor Desa Anda di sini
const DESA_LAT = 1.438320130789139; // Contoh Latitude (Ubah sesuai lokasi asli)
const DESA_LNG = 124.87254853930001; // Contoh Longitude (Ubah sesuai lokasi asli)
const MAX_RADIUS_METER = 50; // Radius maksimum yang diizinkan (dalam Meter)

// Paste Web App URL dari Google Apps Script di sini
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZ2DPaeIK_YaoWCBH_UjynjfiqlIxDkcBX8I8WXKSC7SN3QJ6Gigzm6Ijb9eo3uGLcHA/exec';

// Variable State
let streamKamera = null;
let fotoDiambil = false;
let dalamRadius = false;

// DOM Elements
const video = document.getElementById("video");
const photoPreview = document.getElementById("photo-preview");
const canvas = document.getElementById("canvas");
const btnCapture = document.getElementById("btn-capture");
const btnRetake = document.getElementById("btn-retake");
const kameraSection = document.getElementById("kamera-section");
const statusGps = document.getElementById("status-gps");
const btnSubmit = document.getElementById("btn-submit");
const radioMasuk = document.getElementById("absen_masuk");
const radioPulang = document.getElementById("absen_pulang");

// 1. Live Clock
setInterval(() => {
  const now = new Date();
  document.getElementById("live-clock").innerText = now.toLocaleString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}, 1000);

// 2. Inisialisasi Kamera
async function startCamera() {
  try {
    streamKamera = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });
    video.srcObject = streamKamera;
  } catch (err) {
    Swal.fire(
      "Kamera Tidak Ditemukan",
      "Izin kamera dibutuhkan untuk melakukan Absen Masuk.",
      "error",
    );
  }
}

function stopCamera() {
  if (streamKamera) {
    streamKamera.getTracks().forEach((track) => track.stop());
  }
}

// 3. Ambil Foto (Capture)
btnCapture.addEventListener("click", () => {
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth || 300;
  canvas.height = video.videoHeight || 225;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  document.getElementById("foto_base64").value = dataUrl;
  photoPreview.src = dataUrl;

  video.classList.add("d-none");
  photoPreview.classList.remove("d-none");
  btnCapture.classList.add("d-none");
  btnRetake.classList.remove("d-none");
  fotoDiambil = true;
  checkValidasiSubmit();
});

// 4. Foto Ulang
btnRetake.addEventListener("click", () => {
  document.getElementById("foto_base64").value = "";
  photoPreview.classList.add("d-none");
  video.classList.remove("d-none");
  btnRetake.classList.add("d-none");
  btnCapture.classList.remove("d-none");
  fotoDiambil = false;
  checkValidasiSubmit();
});

// 5. Toggle Absen Masuk vs Pulang
document.querySelectorAll('input[name="tipe_absen"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "masuk") {
      kameraSection.classList.remove("d-none");
      startCamera();
    } else {
      kameraSection.classList.add("d-none");
      stopCamera();
    }
    checkValidasiSubmit();
  });
});

// 6. Cek Geolocation & Hitung Jarak (Haversine Formula)
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(updatePosition, handleErrorGPS, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  } else {
    statusGps.className = "status-badge alert alert-danger";
    statusGps.innerHTML =
      '<i class="fa-solid fa-circle-xmark"></i> Browser tidak mendukung Geolocation';
  }
}

function updatePosition(position) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;

  document.getElementById("latitude").value = userLat;
  document.getElementById("longitude").value = userLng;

  const jarak = calculateDistance(userLat, userLng, DESA_LAT, DESA_LNG);
  const jarakMendekat = Math.round(jarak);

  if (jarakMendekat <= MAX_RADIUS_METER) {
    dalamRadius = true;
    statusGps.className = "status-badge alert alert-success";
    statusGps.innerHTML = `<i class="fa-solid fa-circle-check"></i> Di Dalam Radius Kantor (${jarakMendekat} meter)`;
  } else {
    dalamRadius = false;
    statusGps.className = "status-badge alert alert-danger";
    statusGps.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Di Luar Radius Kantor (${jarakMendekat} meter dari lokasi)`;
  }
  checkValidasiSubmit();
}

function handleErrorGPS(error) {
  statusGps.className = "status-badge alert alert-danger";
  statusGps.innerHTML =
    '<i class="fa-solid fa-triangle-exclamation"></i> Gagal Mengambil Lokasi. Aktifkan GPS HP Anda!';
  dalamRadius = false;
  checkValidasiSubmit();
}

// Formula Haversine untuk hitung jarak 2 koordinat (dalam Meter)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 7. Validasi Pengiriman
function checkValidasiSubmit() {
  const isMasuk = radioMasuk.checked;
  if (isMasuk) {
    // Untuk Absen Masuk: Harus dalam radius DAN Foto sudah diambil
    btnSubmit.disabled = !(dalamRadius && fotoDiambil);
  } else {
    // Untuk Absen Pulang: Hanya perlu dalam radius
    btnSubmit.disabled = !dalamRadius;
  }
}

// 8. Submit Form Absensi
document.getElementById('absensi-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nama = document.getElementById('nama_aparat').value;
    const tipe = document.querySelector('input[name="tipe_absen"]:checked').value;

    // Validasi input nama
    if (!nama) {
        Swal.fire('Peringatan', 'Silakan pilih Nama Aparat terlebih dahulu.', 'warning');
        return;
    }

    // Ubah tombol menjadi mode loading agar user tidak klik 2 kali
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Mengirim Data...';

    // Siapkan kotak data (payload)
    const payload = {
        nama: nama,
        tipe: tipe,
        latitude: document.getElementById('latitude').value,
        longitude: document.getElementById('longitude').value,
        foto: tipe === 'masuk' ? document.getElementById('foto_base64').value : ''
    };

    try {
        // Proses mengirim data (POST) ke Google Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            // PENTING: Untuk Google Apps Script, kita mengirim data sebagai string murni
            // Jangan tambahkan header 'Content-Type': 'application/json' untuk menghindari error CORS
            body: JSON.stringify(payload)
        });

        // Menerima jawaban dari Google Apps Script (berupa JSON)
        const result = await response.json();

        // Cek status dari backend
        if (result.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'Absensi Berhasil!',
                text: result.message, // Pesan sukses dari backend
                confirmButtonColor: '#0d6efd'
            }).then(() => {
                location.reload(); // Refresh halaman agar siap untuk absen orang berikutnya
            });
        } else {
            // Jika ada peringatan dari backend (contoh: absen pulang tapi belum absen masuk)
            Swal.fire('Perhatian', result.message, 'warning');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> Kirim Absensi';
        }
        
    } catch (error) {
        // Jika internet terputus atau URL API salah
        console.error('Error saat mengirim:', error);
        Swal.fire('Gagal Terhubung', 'Pastikan koneksi internet stabil atau hubungi Admin.', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> Kirim Absensi';
    }
});

// Inisialisasi saat pertama dibuka
window.onload = () => {
  startCamera();
  getLocation();
};

// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('PWA Ready!'))
        .catch((err) => console.log('PWA Error:', err));
}

// Logika Munculkan Tombol Install PWA
let deferredPrompt;
const btnInstall = document.getElementById('btn-install');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Tampilkan tombol install jika elemennya ada
    if (btnInstall) {
        btnInstall.classList.remove('d-none');
        btnInstall.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User menginstall aplikasi');
                }
                deferredPrompt = null;
            });
        });
    }
});
