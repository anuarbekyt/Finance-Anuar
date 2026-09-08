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

// Кого пускать в приложение. Тот же список стоит в web/firestore.rules — здесь он
// только чтобы чужой аккаунт увидел понятное «нет доступа», а не ошибку базы.
window.FINANCE_ALLOWED_EMAILS = ["anuarbekyt@gmail.com"];
