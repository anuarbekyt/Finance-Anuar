// Дымовой тест: проходит по всем вкладкам, создаёт данные, печатает результат.
// Падает, если на странице возникла ошибка JS.
//   npm i -D playwright && node dev/build.js && node tests/smoke.js
const { chromium } = require("playwright");
const path = require("path");

const page_url = "file://" + path.join(__dirname, "..", "dev", "test.html");
const clean = (s) => s.replace(/ | /g, " ").replace(/\n/g, " | ");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(page_url);
  await page.waitForTimeout(400);

  if (await page.locator("#dbBanner").isVisible()) {
    console.log("!! баннер ошибки хранилища виден:", await page.locator("#dbBannerText").textContent());
  }
  console.log("облако:", await page.locator("#cloudText").textContent());

  // --- регулярные платежи и доходы ---
  const addRec = async (kind, name, amount, day, extra = {}) => {
    await page.click('.tab[data-tab="recurring"]'); await page.waitForTimeout(120);
    await page.click(`[data-addrec="${kind}"]`); await page.waitForTimeout(150);
    await page.fill("#rName", name);
    await page.fill("#rAmount", String(amount));
    await page.fill("#rDay", String(day));
    if (extra.term) await page.fill("#rTerm", String(extra.term));
    if (extra.start) await page.fill("#rStart", extra.start);
    await page.click("#saveRecBtn"); await page.waitForTimeout(250);
  };
  await addRec("income", "Зарплата", 300000, 5);
  await addRec("credit", "Кредит Kaspi", 45000, 15, { term: 12 });
  await addRec("bill", "Аренда квартиры", 150000, 1);
  await addRec("subscription", "Yandex Plus", 1200, 20);
  console.log("кредиты:", clean(await page.locator("#recurringListCredits").innerText()).slice(0, 200));

  // --- расходы ---
  const addExpense = async (cat, amount) => {
    await page.click('.tab[data-tab="reports"]'); await page.waitForTimeout(120);
    await page.click("#repAddExpense"); await page.waitForTimeout(150);
    await page.selectOption("#fCategorySel", cat);
    await page.fill("#fAmount", String(amount));
    await page.click("#saveEntryBtn"); await page.waitForTimeout(220);
  };
  await addExpense("Продукты", 45000);
  await addExpense("Транспорт", 12000);

  // --- разбор диктовки ---
  await page.click('.tab[data-tab="dashboard"]'); await page.waitForTimeout(150);
  await page.fill("#quickInput", "я должен Ануару 240000");
  await page.click("#quickParseBtn"); await page.waitForTimeout(200);
  await page.fill("#fTerm", "6");
  await page.click("#saveEntryBtn"); await page.waitForTimeout(250);
  await page.click('.tab[data-tab="debts"]'); await page.waitForTimeout(200);
  console.log("долги:", clean(await page.locator("#oweList").innerText()).slice(0, 200));

  // --- план месяца ---
  await page.click('.tab[data-tab="plan"]'); await page.waitForTimeout(250);
  await page.click("#planOpeningBtn"); await page.waitForTimeout(150);
  await page.fill("#obInput", "250000");
  await page.click("#obSave"); await page.waitForTimeout(300);
  console.log("план:", {
    начало: clean(await page.locator("#planOpening").textContent()),
    текущий: clean(await page.locator("#planNow").textContent()),
    доход: clean(await page.locator("#planIncome").textContent()),
    расход: clean(await page.locator("#planExpense").textContent()),
    остаток: clean(await page.locator("#planLeft").textContent()),
    платежи: clean(await page.locator("#planDueLeft").textContent())
  });

  // сдвиг платежа на следующий месяц
  const names = await page.locator("#planDueList .plan-name .t").allInnerTexts();
  const idx = names.indexOf("Yandex Plus");
  if (idx >= 0) {
    await page.locator("#planDueList [data-plan-push]").nth(idx).click();
    await page.waitForTimeout(350);
    console.log("после сдвига:", await page.locator("#planDueList .plan-name .t").allInnerTexts());
  }

  // --- цель ---
  await page.click('.tab[data-tab="goals"]'); await page.waitForTimeout(150);
  await page.click("#addGoalBtn"); await page.waitForTimeout(150);
  await page.fill("#gName", "Оборудование");
  await page.fill("#gTarget", "1200000");
  await page.fill("#gDeadline", "2027-09-01");
  await page.fill("#gStart", "200000");
  await page.click("#saveGoalBtn"); await page.waitForTimeout(300);
  console.log("цели:", clean(await page.locator("#goalsList").innerText()).slice(0, 220));

  // --- календарь ---
  await page.click('.tab[data-tab="calendar"]'); await page.waitForTimeout(250);
  console.log("календарь:", await page.locator("#calTitle").textContent(),
    "|", clean(await page.locator("#calSummary").textContent()),
    "| дней:", await page.locator("#calGrid .cal-cell:not(.blank)").count());

  // --- отчёты: раскрыть статью и отредактировать запись ---
  await page.click('.tab[data-tab="reports"]'); await page.waitForTimeout(250);
  await page.locator("#reportBars .bar-click").first().click(); await page.waitForTimeout(250);
  console.log("записей в статье:", await page.locator("#reportBars .bar-details .row").count());

  console.log(errors.length ? "\nОШИБКИ:\n" + errors.join("\n") : "\nОшибок нет");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
