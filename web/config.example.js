// Скопируйте этот файл в web/config.js и подставьте свои значения.
// Ключи Firebase для веба не секретны — они видны любому, кто откроет страницу.
// Доступ к данным закрывают не они, а вход через Google и правила из web/firestore.rules.

window.FINANCE_FIREBASE_CONFIG = {
  apiKey: "СЮДА-apiKey",
  authDomain: "СЮДА-projectId.firebaseapp.com",
  projectId: "СЮДА-projectId",
  storageBucket: "СЮДА-projectId.appspot.com",
  messagingSenderId: "СЮДА-числа",
  appId: "СЮДА-appId"
};

// Кого пускать в приложение. Тот же список должен стоять в web/firestore.rules —
// здесь он только чтобы человек сразу увидел понятное «нет доступа» вместо ошибки базы.
window.FINANCE_ALLOWED_EMAILS = ["anuarbekyt@gmail.com"];
