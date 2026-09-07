// Заглушка облачной базы артефакта для локальной разработки.
// Подделывает window.claude.use("db") — Firestore-подобный API поверх объекта в памяти.
// Данные живут до перезагрузки страницы. В продакшене этот файл не используется.
(function () {
  var store = {};   // коллекция -> { id: данные }
  var subs = [];    // подписки: { col, cb }
  var seq = 0;

  function notify(col) {
    subs.filter(function (s) { return s.col === col; }).forEach(function (s) {
      var docs = Object.keys(store[col] || {}).map(function (id) {
        // настоящие снимки заморожены — повторяем это, чтобы ловить те же ошибки
        var d = Object.freeze(Object.assign({}, store[col][id]));
        return { id: id, data: function () { return d; } };
      });
      s.cb({ docs: docs, size: docs.length });
    });
  }

  function docRef(col, id) {
    return {
      id: id,
      set: function (o) {
        store[col] = store[col] || {}; store[col][id] = Object.assign({}, o);
        notify(col); return Promise.resolve();
      },
      update: function (o) {
        store[col] = store[col] || {};
        store[col][id] = Object.assign({}, store[col][id] || {}, o);
        notify(col); return Promise.resolve();
      },
      delete: function () {
        if (store[col]) delete store[col][id];
        notify(col); return Promise.resolve();
      },
      get: function () {
        return Promise.resolve({
          exists: !!(store[col] && store[col][id]),
          data: function () { return store[col][id]; }
        });
      }
    };
  }

  function colRef(col) {
    var api = {
      orderBy: function () { return api; },
      limit: function () { return api; },
      onSnapshot: function (cb) { subs.push({ col: col, cb: cb }); notify(col); return function () {}; },
      add: function (o) {
        var id = "id" + (++seq);
        store[col] = store[col] || {}; store[col][id] = Object.assign({}, o);
        notify(col); return Promise.resolve(docRef(col, id));
      },
      doc: function (id) { return docRef(col, id); }
    };
    return api;
  }

  window.claude = {
    use: function (name) {
      if (name !== "db") return Promise.resolve(null);
      return Promise.resolve({
        collection: colRef,
        doc: function (p) { var a = p.split("/"); return docRef(a[0], a[1]); }
      });
    }
  };
  window.__store = store;   // для отладки из консоли
})();
