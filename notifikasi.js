// Turns notifications on for this device: asks permission, subscribes with the app's public key,
// and hands the subscription back to the web app with the one-time code from its Settings link.
const EXEC = 'https://script.google.com/macros/s/AKfycby9UzJj48Er3CODSEjSyXlWVwJw_jjctG5-7qLUbxU6vxkV4TFBLTrGrSHLkkjMBfAq/exec';
const VAPID_PUBLIC = 'BI6YualpXodyUorvg4JnHoKEUYyU384TYhRYO6UBGhodLc65Bxp-Rmhs1Qm_y3nFfll5xN_M1DsFa963-NZ6mkQ';

const $ = (id) => document.getElementById(id);
const say = (text, bad = false) => { $('msg').textContent = text; $('msg').className = `msg ${bad ? 'bad' : ''}`; };
const code = new URLSearchParams(location.search).get('n') || '';
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /android/i.test(ua) ? 'Android' : /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : 'Perangkat';
  const browser = /edg\//i.test(ua) ? 'Edge' : /firefox/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : '';
  return [os, browser].filter(Boolean).join(' · ');
}
const keyBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

if (!code) {
  $('allow').hidden = true;
  say('Buka halaman ini dari aplikasi: Pengaturan → Notifikasi di HP → Aktifkan di perangkat ini.');
} else if (ios && !installed) {
  $('allow').hidden = true;
  $('ios').hidden = false;
  say('Di iPhone, notifikasi hanya bisa untuk aplikasi yang sudah dipasang di layar utama.');
} else if (!supported) {
  $('allow').hidden = true;
  say('Browser ini tidak mendukung notifikasi. Coba Chrome di Android, atau Safari di iPhone yang sudah dipasang di layar utama.', true);
}

$('allow').addEventListener('click', async () => {
  $('allow').disabled = true;
  say('Meminta izin…');
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      say('Izin ditolak. Buka pengaturan situs di browser, izinkan notifikasi untuk karjimut.vercel.app, lalu coba lagi.', true);
      $('allow').disabled = false;
      return;
    }
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) });
    say('Menyimpan ke aplikasi…');
    const q = new URLSearchParams({ tab: 'settings', n: code, label: deviceLabel(), push: JSON.stringify(sub.toJSON()) });
    location.replace(`${EXEC}?${q}`);
  } catch (e) {
    say(`Belum berhasil: ${e.message}`, true);
    $('allow').disabled = false;
  }
});
