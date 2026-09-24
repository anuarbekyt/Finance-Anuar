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

// Кого пускать в приложение. Пустой список — любого, кто вошёл через Google: каждый
// получает своё пространство spaces/<почта> и видит только его, чужие данные закрыты
// правилами web/firestore.rules. Непустой список пускает только перечисленных
// (тогда тот же запрет надо поставить и в правилах).
window.FINANCE_ALLOWED_EMAILS = [];

// Владелец: его данные — корневые коллекции базы, как было с самого начала.
window.FINANCE_OWNER_EMAIL = "anuarbekyt@gmail.com";
