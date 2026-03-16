import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeNativeApp, isNative } from "./lib/native";
import './lib/i18n';

if (isNative()) {
  initializeNativeApp();

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith('/')) {
      url = `https://aok.care${url}`;
    }
    const newInit = { ...init };
    if (newInit.credentials === 'include') {
      newInit.credentials = 'omit';
    }
    return originalFetch(url, newInit);
  };
}

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
