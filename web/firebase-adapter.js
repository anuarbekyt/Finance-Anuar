// Подменяет window.claude.use("db") на Firestore, чтобы index.html работал вне артефакта.
// Внутренний API базы у приложения уже firestore-образный (collection().orderBy().limit()
// .onSnapshot(), doc().set/update/delete/get), поэтому переходник получается тонким:
// весь смысл файла — вход через Google и понятные экраны, когда войти не получилось.
(function () {
  "use strict";

  var CFG = window.FINANCE_FIREBASE_CONFIG;
  var ALLOWED = (window.FINANCE_ALLOWED_EMAILS || []).map(function (e) {
    return String(e).toLowerCase();
  });

  // Приложение ждёт этот промис в initDb(). Резолвим его один раз — после входа.
  var resolveDb = null;
  var dbPromise = new Promise(function (res) { resolveDb = res; });
  var resolved = false;

  window.claude = {
    use: function (what) {
      return what === "db" ? dbPromise : Promise.resolve(null);
    }
  };

  /* ---------- экран поверх приложения ---------- */
  // Приложение прячем сразу, ещё до разбора остальной страницы: проверка входа
  // занимает доли секунды, но без этого успевает мигнуть дашборд с чужими цифрами.
  var hider = document.createElement("style");
  hider.textContent = ".wrap,.navbar,.toast-wrap,#modalRoot{visibility:hidden}";
  (document.head || document.documentElement).appendChild(hider);
  function revealApp() { if (hider.parentNode) hider.parentNode.removeChild(hider); }

  // Своя вёрстка, а не модалка приложения: модалки живут внутри его IIFE,
  // а этот экран должен показаться раньше, чем приложение вообще запустится.
  var veil = null;
  function screen(html) {
    if (!veil) {
      veil = document.createElement("div");
      veil.id = "authVeil";
      veil.setAttribute("style",
        "position:fixed;inset:0;z-index:400;display:flex;align-items:center;" +
        "justify-content:center;padding:24px;background:var(--paper,#0F1319);" +
        "color:var(--ink,#E8ECF3);font-family:var(--font-ui,system-ui),sans-serif;text-align:center;");
      (document.body || document.documentElement).appendChild(veil);
    }
    veil.innerHTML = '<div style="max-width:340px">' + html + "</div>";
    veil.hidden = false;
  }
  function hideScreen() { if (veil) veil.hidden = true; revealApp(); }

  var LOGO =
    '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:22px">' +
      '<span style="width:34px;height:34px;border-radius:10px;display:flex;align-items:center;' +
      'justify-content:center;font-family:var(--font-num,monospace);font-weight:700;font-size:17px;' +
      'background:var(--well,#0A0D12);border:1px solid var(--line,#262F3C);color:var(--accent,#F2A93B)">₸</span>' +
      '<span style="font-family:var(--font-display,sans-serif);font-weight:700;font-size:21px;letter-spacing:-0.03em">Финансы</span>' +
    "</div>";

  function btn(id, label) {
    return '<button id="' + id + '" style="width:100%;border:none;cursor:pointer;border-radius:12px;' +
      "padding:13px 18px;font:700 14.5px var(--font-ui,system-ui),sans-serif;" +
      'background:var(--accent,#F2A93B);color:var(--accent-ink,#17120A)">' + label + "</button>";
  }
  function note(text) {
    return '<p style="margin:0 0 20px;font-size:13.5px;line-height:1.55;color:var(--ink-soft,#98A4B5)">' + text + "</p>";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- запуск ---------- */
  function boot() {
    screen(LOGO + note("Проверяем вход…"));
    if (!CFG || !CFG.apiKey || String(CFG.apiKey).indexOf("СЮДА") === 0) {
      screen(LOGO + note(
        "Не заполнен файл <b>config.js</b> — приложению некуда сохранять записи.<br><br>" +
        "Скопируйте <b>web/config.example.js</b> в <b>web/config.js</b>, подставьте настройки " +
        "своего проекта Firebase и соберите страницу заново."));
      return;
    }
    if (typeof firebase === "undefined") {
      screen(LOGO + note("Не загрузился Firebase — проверьте связь и обновите страницу.") +
        btn("authRetry", "Обновить"));
      var r = document.getElementById("authRetry");
      if (r) r.addEventListener("click", function () { location.reload(); });
      return;
    }

    firebase.initializeApp(CFG);
    var auth = firebase.auth();

    // Локальный кэш Firestore: с ним приложение открывается и без сети, а записи,
    // сделанные оффлайн, уходят сами. Не включается в приватном окне и во второй
    // вкладке — это нормально, тогда просто работаем онлайн.
    try { firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}

    auth.onAuthStateChanged(function (user) {
      if (!user) { showSignIn(auth); return; }
      var email = (user.email || "").toLowerCase();
      if (ALLOWED.length && ALLOWED.indexOf(email) < 0) { showDenied(auth, user); return; }

      window.financeAuth = {
        email: user.email || "",
        signOut: function () { auth.signOut().then(function () { location.reload(); }); }
      };
      hideScreen();
      if (!resolved) { resolved = true; resolveDb(firebase.firestore()); }
    });
  }

  function showSignIn(auth) {
    screen(LOGO + note("Войдите тем же аккаунтом Google, что и на других устройствах — " +
      "записи и настройки подтянутся сами.") + btn("authGo", "Войти через Google"));
    document.getElementById("authGo").addEventListener("click", function () {
      var provider = new firebase.auth.GoogleAuthProvider();
      // Всплывающее окно надёжнее редиректа: браузеры режут сторонние cookie,
      // и обратный переход с redirect на чужом домене часто теряет вход.
      auth.signInWithPopup(provider).catch(function (err) {
        var code = (err && err.code) || "";
        if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
          auth.signInWithRedirect(provider);
          return;
        }
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
        screen(LOGO + note("Войти не удалось (код: " + esc(code || "неизвестно") + ").") +
          btn("authGo2", "Попробовать ещё раз"));
        document.getElementById("authGo2").addEventListener("click", function () { showSignIn(auth); });
      });
    });
  }

  function showDenied(auth, user) {
    screen(LOGO + note("У аккаунта <b>" + esc(user.email || "") + "</b> нет доступа к этим данным.") +
      btn("authOther", "Войти другим аккаунтом"));
    document.getElementById("authOther").addEventListener("click", function () {
      auth.signOut().then(function () { showSignIn(auth); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
