// Собирает dev/test.html: оборачивает index.html в документ и подключает заглушку базы.
// Нужен потому, что index.html — это тело страницы, а не полный HTML-документ.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const body = fs.readFileSync(path.join(root, "index.html"), "utf8");

const head =
  '<!doctype html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  // те же сбросы, что добавляет обёртка артефакта — без них [hidden] не работает
  '<style>:root{color-scheme:light}body{margin:0;padding:0;' +
  'font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}' +
  'img{max-width:100%}[hidden]:not([hidden=until-found]){display:none!important}</style>' +
  '</head><body>\n<script src="shim.js"></script>\n';

fs.writeFileSync(path.join(__dirname, "test.html"), head + body + "\n</body></html>");
console.log("dev/test.html собран — открывайте его в браузере");
