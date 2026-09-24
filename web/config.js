// Настройки проекта Firebase «finance-anuar».
// Ключи здесь не секретны — они видны любому, кто откроет страницу, и сами по себе
// ничего не открывают. Доступ к данным закрывают вход через Google и web/firestore.rules.
// measurementId не нужен: аналитику приложение не подключает.

window.FINANCE_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDZIDffJQ0H53axrF-CnXASabAGkrIVfQ",
  authDomain: "finance-anuar.firebaseapp.com",
  projectId: "finance-anuar",
  storageBucket: "finance-anuar.firebasestorage.app",
  messagingSenderId: "186051225417",
  appId: "1:186051225417:web:9aa0c11255290ef4b6dc98"
};

// Кого пускать в приложение. Пустой список — любого, кто вошёл через Google: каждый
// получает своё пространство spaces/<почта> и видит только его, чужие данные закрыты
// правилами web/firestore.rules. Непустой список пускает только перечисленных
// (тогда тот же запрет надо поставить и в правилах).
window.FINANCE_ALLOWED_EMAILS = [];

// Владелец: его данные — корневые коллекции базы, как было с самого начала.
window.FINANCE_OWNER_EMAIL = "anuarbekyt@gmail.com";

// Разбор надиктованных фраз ИИ (Gemini через Firebase AI Logic). recaptchaKey — открытый
// ключ сайта reCAPTCHA Enterprise для App Check, он не секретный. Пусто — ИИ выключен,
// фразы разбираются правилами приложения. Настройка — web/README.md, «Разбор фраз ИИ».
window.FINANCE_AI = { recaptchaKey: "6Le1WM0tAAAAAD2pV9L0KGFDflrQxGjtJE2sj4Oa", model: "gemini-3.5-flash-lite" };
