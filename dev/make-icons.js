// Рисует иконки приложения в web/: янтарный знак ₸ на графите — то же, что лампа в шапке.
// Знак нарисован фигурами, а не набран шрифтом: у моношрифта ₸ занимает малую часть
// площадки и сидит на базовой линии, так что в квадрате иконки он выходит мелким и
// смещённым вверх. Png-кодировщика в проекте нет, зато есть Playwright — им и снимаем.
//
//   node dev/make-icons.js
//
// Запускать только после правки самой иконки: файлы лежат в репозитории.
const { chromium } = require("playwright");
const path = require("path");

const WEB = path.join(__dirname, "..", "web");

async function launchBrowser() {
  const variants = [{}, { channel: "chrome" }, { channel: "msedge" }];
  let last = null;
  for (const opts of variants) {
    try { return await chromium.launch(opts); } catch (e) { last = e; }
  }
  throw last;
}

// ₸ в координатах 100×104: две перекладины и ножка по центру.
const GLYPH =
  '<rect x="0" y="0" width="100" height="14" rx="2"/>' +
  '<rect x="0" y="22" width="100" height="14" rx="2"/>' +
  '<rect x="43" y="36" width="14" height="68" rx="2"/>';

// width — ширина знака в долях стороны иконки. У maskable системы срезают края
// под свою форму, поэтому там знак мельче: иначе на круглой маске обрежет перекладины.
const html = (size, width, radius) => `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent}
  .i{width:${size}px;height:${size}px;background:#0F1319;
     border-radius:${Math.round(size * radius)}px;
     display:flex;align-items:center;justify-content:center}
  svg{width:${Math.round(size * width)}px;height:auto;display:block;fill:#F2A93B}
</style>
<div class="i"><svg viewBox="0 0 100 104" xmlns="http://www.w3.org/2000/svg">${GLYPH}</svg></div>`;

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

  const shot = async (file, size, width, radius) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html(size, width, radius));
    await page.locator(".i").screenshot({ path: path.join(WEB, file), scale: "css" });
    console.log("web/" + file);
  };

  await shot("icon-512.png", 512, 0.46, 0.1875);
  await shot("icon-192.png", 192, 0.46, 0.1875);
  await shot("icon-maskable.png", 512, 0.34, 0);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
