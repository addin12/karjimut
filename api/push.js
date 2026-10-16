// Sends a notification to the given devices. Called only by the Cashflow Apps Script (shared secret
// in PUSH_SECRET); the devices and the message come in each request, so nothing is stored here.
import webpush from 'web-push';
import { timingSafeEqual } from 'node:crypto';

const MAX_DEVICES = 10;
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//i;

function authorized(header) {
  const secret = process.env.PUSH_SECRET || '';
  const want = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(String(header || ''));
  return secret.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}

const validDevice = (s) => s && typeof s.endpoint === 'string' && s.endpoint.length <= 1000 && PUSH_HOSTS.test(s.endpoint)
  && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string';

const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!authorized(req.headers.authorization)) return res.status(401).json({ error: 'unauthorized' });
  const { subscriptions, notification } = req.body || {};
  if (!Array.isArray(subscriptions) || !subscriptions.length || subscriptions.length > MAX_DEVICES || !subscriptions.every(validDevice)) {
    return res.status(400).json({ error: `subscriptions: 1-${MAX_DEVICES} valid push subscriptions` });
  }
  if (!notification || !text(notification.title, 100)) return res.status(400).json({ error: 'notification.title is required' });
  const url = text(notification.url, 200);
  const payload = JSON.stringify({
    title: text(notification.title, 100), body: text(notification.body, 500), tag: text(notification.tag, 40), url: /^\/(?!\/)/.test(url) ? url : '/',
  });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const results = await Promise.all(subscriptions.map(async (s) => {
    try {
      const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, payload, { TTL: 86400, timeout: 10000 });
      return { endpoint: s.endpoint, status: r.statusCode };
    } catch (e) {
      // 404/410: the device unsubscribed; the script drops it. Nothing else about the error is returned.
      return { endpoint: s.endpoint, status: e.statusCode || 0 };
    }
  }));
  return res.status(200).json({ results });
}
