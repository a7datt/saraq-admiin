import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App, { ErrorBoundary } from './App.tsx';
import './index.css';

const originalPushState = window.history.pushState.bind(window.history);
const originalReplaceState = window.history.replaceState.bind(window.history);

const guardAdminRoute = (url: string | URL | null | undefined) => {
  if (typeof url === 'string') {
    const nextPath = new URL(url, window.location.origin).pathname;
    if (window.location.pathname === '/saraqib-store-admin1' && nextPath === '/home') {
      return '/saraqib-store-admin1';
    }
    return url;
  }

  if (url instanceof URL) {
    const nextPath = url.pathname;
    if (window.location.pathname === '/saraqib-store-admin1' && nextPath === '/home') {
      return '/saraqib-store-admin1';
    }
    return url;
  }

  return url;
};

window.history.pushState = ((state: unknown, title: string, url?: string | URL | null) => {
  return originalPushState(state, title, guardAdminRoute(url));
}) as typeof window.history.pushState;

window.history.replaceState = ((state: unknown, title: string, url?: string | URL | null) => {
  return originalReplaceState(state, title, guardAdminRoute(url));
}) as typeof window.history.replaceState;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

// [FIX] إخفاء شاشة التحميل الثابتة (index.html) بعد أن يُركّب React فعلياً — تُزال بعد أول
// إطار رسم (requestAnimationFrame) لضمان أن المحتوى الحقيقي أصبح جاهزاً على الشاشة قبل الإخفاء،
// فيبدو الانتقال سلساً بدل ظهور المحتوى تدريجياً فوق شاشة فارغة/شفافة.
requestAnimationFrame(() => {
  const splash = document.getElementById('initial-splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 250);
  }
});
