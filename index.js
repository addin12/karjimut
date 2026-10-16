// The short link: opens the app (on the screen a path asks for), or once offers to install it.
const EXEC = 'https://script.google.com/macros/s/AKfycby9UzJj48Er3CODSEjSyXlWVwJw_jjctG5-7qLUbxU6vxkV4TFBLTrGrSHLkkjMBfAq/exec';
const SCREENS = { tambah: 'add', cek: 'review', ringkasan: 'dashboard', transaksi: 'transactions', pengaturan: 'settings' };

const seg = location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
const target = EXEC + (SCREENS[seg] ? `?tab=${SCREENS[seg]}` : '');
const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private window: asked again next time */ } },
};

// The service worker makes the site installable and receives notifications.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

if (installed || (seg !== 'pasang' && store.get('cf.skipInstall') === '1')) {
  location.replace(target);
} else {
  const $ = (id) => document.getElementById(id);
  $('landing').hidden = false;
  $('open').href = target;
  $('open').addEventListener('click', () => store.set('cf.skipInstall', '1'));
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let prompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    prompt = e;
    $('install').hidden = false;
    $('other').hidden = true;
  });
  $('install').addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    prompt = null;
    $('install').hidden = true;
    if (outcome === 'accepted') $('done').hidden = false;
  });
  window.addEventListener('appinstalled', () => { store.set('cf.skipInstall', '1'); $('done').hidden = false; $('install').hidden = true; });
  if (ios) $('ios').hidden = false;
  else setTimeout(() => { if (!prompt) $('other').hidden = false; }, 1500);
}
