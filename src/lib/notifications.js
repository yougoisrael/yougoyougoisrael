// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Yougo — Firebase Cloud Messaging (إشعارات مجانية)
//  اشعارات الطلبات للمستخدمين والمتاجر
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messaging = null;

// تهيئة Firebase
async function initFirebase() {
  if (messaging) return messaging;

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getMessaging, getToken, onMessage } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js");

  const app = initializeApp({
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  });

  messaging = getMessaging(app);
  return { messaging, getToken, onMessage };
}

/**
 * طلب إذن الإشعارات والحصول على Token
 * احفظ هذا الـ Token في Supabase مع المستخدم
 * @returns {Promise<string|null>} FCM Token
 */
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const { messaging, getToken } = await initFirebase();

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    // احفظ الـ Token في Supabase
    const { supabase } = await import("./supabase.js");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_fcm_tokens")
        .upsert({ user_id: user.id, token, updated_at: new Date().toISOString() });
    }

    return token;
  } catch (err) {
    console.warn("FCM:", err.message);
    return null;
  }
}

/**
 * الاستماع للإشعارات وهو التطبيق مفتوح (Foreground)
 * @param {Function} onNotification - callback عند وصول إشعار
 */
export async function listenToNotifications(onNotification) {
  const { messaging, onMessage } = await initFirebase();
  return onMessage(messaging, (payload) => {
    onNotification({
      title: payload.notification?.title || "Yougo",
      body:  payload.notification?.body  || "",
      data:  payload.data || {},
    });
  });
}

/**
 * Hook جاهز للاستخدام في App.jsx
 */
export function useNotifications(onNotification) {
  const { useEffect } = require("react");

  useEffect(() => {
    let unsubscribe;
    listenToNotifications((notif) => {
      onNotification?.(notif);
      // اعرض Toast بسيط
      showToast(notif.title, notif.body);
    }).then(fn => { unsubscribe = fn; });

    return () => unsubscribe?.();
  }, []);
}

// Toast بسيط بدون library
function showToast(title, body) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed; top:20px; right:20px; left:20px; z-index:9999;
    background:white; border-radius:16px; padding:14px 16px;
    box-shadow:0 8px 32px rgba(0,0,0,0.15); direction:rtl;
    border-right:4px solid #C8102E; animation:slideDown 0.3s ease;
  `;
  toast.innerHTML = `
    <div style="font-weight:900;font-size:14px;color:#111">${title}</div>
    <div style="font-size:12px;color:#666;margin-top:3px">${body}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
