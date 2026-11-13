// Browser helpers called from Dart (lib/platform/platform_web.dart). Everything returns plain strings/booleans.
window.movin = (function () {
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  function b64(bytes) {
    let s = ''; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(s);
  }
  async function jpeg(bitmap, max, quality) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
    return b64(new Uint8Array(await blob.arrayBuffer()));
  }
  function pickPhoto() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      let done = false;
      input.addEventListener('change', async () => {
        done = true;
        const f = input.files && input.files[0];
        input.remove();
        if (!f) { resolve(null); return; }
        try {
          const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
          resolve(JSON.stringify({ full: await jpeg(bmp, 1280, 0.85), thumb: await jpeg(bmp, 360, 0.8) }));
        } catch (e) { reject(new Error('That photo could not be read. Try another one.')); }
      });
      window.addEventListener('focus', () => setTimeout(() => { if (!done) { input.remove(); resolve(null); } }, 1500), { once: true });
      input.click();
    });
  }
  function urlB64ToUint8Array(s) {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
  }
  function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    return Notification.permission; // granted | denied | default
  }
  async function pushSubscribe(vapidKey) {
    if (pushState() === 'unsupported') throw new Error(isIOS() && !isStandalone()
      ? 'On iPhone, add the app to your Home Screen first, then open it from there.' : 'This browser cannot show reminders.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Reminders are blocked. Turn on notifications for this app in your phone settings.');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidKey) });
    return JSON.stringify(sub.toJSON());
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { return false; }
  }
  return { isIOS, isStandalone, pickPhoto, pushState, pushSubscribe, copy, open: (u) => window.open(u, '_blank', 'noopener') };
})();
