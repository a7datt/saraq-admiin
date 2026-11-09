self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// لوغو المتجر يأتي من قاعدة البيانات (الأدمن يضبطه من "مظهر المتجر"):
// 1) الأولوية لـ data.icon المرسلة من السيرفر مع الإشعار
// 2) وإلا نجلبه من /api/appearance
// 3) وإلا أيقونة احتياطية محلية
const FALLBACK_ICON = '/logo.svg';

async function getStoreIcon() {
  try {
    const res = await fetch('/api/appearance', { cache: 'no-store' });
    if (res.ok) {
      const appearance = await res.json();
      if (appearance && appearance.logo_url) return appearance.logo_url;
    }
  } catch (e) {}
  return FALLBACK_ICON;
}

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'vipro store', body: 'لديك إشعار جديد' };

  event.waitUntil((async () => {
    const icon = data.icon || (await getStoreIcon());
    const options = {
      body: data.body,
      icon: icon,
      badge: icon,
      data: data.url || '/'
    };
    await self.registration.showNotification(data.title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
