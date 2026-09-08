// Собирает docs/ — версию приложения для обычного хостинга (GitHub Pages).
// Отличий от артефакта два: index.html нужно обернуть в полноценный документ и
// подставить хранилище — window.claude.use("db") здесь делает web/firebase-adapter.js.
//
//   node dev/build-web.js
//
// docs/ коммитится: GitHub Pages раздаёт папку прямо из репозитория, сборки на их
// стороне нет. Поэтому после правки index.html эту команду надо прогнать заново.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const web = path.join(root, "web");
const out = path.join(root, "docs");

const FIREBASE = "11.10.0";
const build = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

fs.mkdirSync(out, { recursive: true });

/* ---------- config.js ---------- */
// Настройки Firebase у каждого свои и в репозитории их нет, поэтому в docs/ кладём
// либо реальный web/config.js, либо заглушку — с ней страница откроется и объяснит,
// чего не хватает, вместо белого экрана.
const cfgSrc = path.join(web, "config.js");
if (fs.existsSync(cfgSrc)) {
  fs.copyFileSync(cfgSrc, path.join(out, "config.js"));
} else {
  fs.writeFileSync(path.join(out, "config.js"),
    "// Заглушка: создайте web/config.js по образцу web/config.example.js\n" +
    "window.FINANCE_FIREBASE_CONFIG = { apiKey: \"СЮДА-apiKey\" };\n" +
    "window.FINANCE_ALLOWED_EMAILS = [];\n");
  console.log("!! web/config.js не найден — в docs/ положена заглушка");
}

/* ---------- index.html ---------- */
const body = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(web, "firebase-adapter.js"), "utf8");

const sdk = ["app", "auth", "firestore"].map(function (m) {
  return '<script src="https://www.gstatic.com/firebasejs/' + FIREBASE + "/firebase-" + m + '-compat.js"></' + "script>";
}).join("\n");

const head =
  '<!doctype html>\n<html lang="ru">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#0F1319">\n' +
  '<meta name="description" content="Учёт доходов, расходов, долгов и платежей">\n' +
  '<link rel="manifest" href="./manifest.webmanifest">\n' +
  '<link rel="icon" href="./icon-192.png">\n' +
  '<link rel="apple-touch-icon" href="./icon-192.png">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
  // те же сбросы, что добавляет обёртка артефакта: без них не работает [hidden]
  "<style>body{margin:0;padding:0}img{max-width:100%}" +
  "[hidden]:not([hidden=until-found]){display:none!important}</style>\n" +
  "</head>\n<body>\n";

const boot =
  '<script src="./config.js?v=' + build + '"></' + "script>\n" +
  sdk + "\n" +
  "<script>\n" + adapter + "\n</" + "script>\n";

const sw =
  "<script>\n" +
  "if ('serviceWorker' in navigator) {\n" +
  "  window.addEventListener('load', function () {\n" +
  "    navigator.serviceWorker.register('./sw.js').catch(function () {});\n" +
  "  });\n" +
  "}\n" +
  "</" + "script>\n";

fs.writeFileSync(path.join(out, "index.html"), head + boot + body + "\n" + sw + "</body>\n</html>\n");

/* ---------- манифест ---------- */
fs.writeFileSync(path.join(out, "manifest.webmanifest"), JSON.stringify({
  name: "Финансы",
  short_name: "Финансы",
  description: "Учёт доходов, расходов, долгов и платежей",
  lang: "ru",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0F1319",
  theme_color: "#0F1319",
  icons: [
    { src: "./icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "./icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "./icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2) + "\n");

/* ---------- service worker ---------- */
// Оболочка берётся из кэша, обновление подхватывается при следующем открытии.
// Всё чужое (Firestore, шрифты) идёт мимо: кэшировать ответы базы нельзя,
// оффлайн-режим у неё свой, через enablePersistence.
fs.writeFileSync(path.join(out, "sw.js"),
  "var CACHE = 'finance-" + build + "';\n" +
  "var SHELL = ['./', './index.html', './config.js', './manifest.webmanifest',\n" +
  "             './icon-192.png', './icon-512.png', './icon-maskable.png'];\n" +
  "\n" +
  "self.addEventListener('install', function (e) {\n" +
  "  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })\n" +
  "    .then(function () { return self.skipWaiting(); }).catch(function () {}));\n" +
  "});\n" +
  "\n" +
  "self.addEventListener('activate', function (e) {\n" +
  "  e.waitUntil(caches.keys().then(function (keys) {\n" +
  "    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));\n" +
  "  }).then(function () { return self.clients.claim(); }));\n" +
  "});\n" +
  "\n" +
  "self.addEventListener('fetch', function (e) {\n" +
  "  var url = new URL(e.request.url);\n" +
  "  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;\n" +
  "  // Страницу берём из сети, чтобы новая сборка приезжала сразу; кэш — на случай оффлайна.\n" +
  "  if (e.request.mode === 'navigate') {\n" +
  "    e.respondWith(fetch(e.request).then(function (r) {\n" +
  "      var copy = r.clone();\n" +
  "      caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });\n" +
  "      return r;\n" +
  "    }).catch(function () { return caches.match('./index.html'); }));\n" +
  "    return;\n" +
  "  }\n" +
  "  e.respondWith(caches.match(e.request).then(function (hit) { return hit || fetch(e.request); }));\n" +
  "});\n");

/* ---------- иконки и служебные файлы ---------- */
["icon-192.png", "icon-512.png", "icon-maskable.png"].forEach(function (f) {
  const src = path.join(web, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, f));
  else console.log("!! нет " + f + " — соберите иконки: node dev/make-icons.js");
});
// иначе GitHub Pages прогонит папку через Jekyll и выкинет файлы, начинающиеся с _
fs.writeFileSync(path.join(out, ".nojekyll"), "");

console.log("docs/ собран (сборка " + build + ", Firebase " + FIREBASE + ")");
