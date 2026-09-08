// Дымовой тест: проходит по всем вкладкам, создаёт данные, печатает результат.
// Падает, если на странице возникла ошибка JS.
//   npm i -D playwright && node dev/build.js && node tests/smoke.js
const { chromium } = require("playwright");
const path = require("path");

const page_url = "file://" + path.join(__dirname, "..", "dev", "test.html");
const clean = (s) => s.replace(/ | /g, " ").replace(/\n/g, " | ");

// Скачанный playwright-ом Chromium есть не везде; если его нет — берём уже
// установленный в системе Chrome или Edge, тест от этого не меняется.
async function launchBrowser() {
  const variants = [{}, { channel: "chrome" }, { channel: "msedge" }];
  let last = null;
  for (const opts of variants) {
    try { return await chromium.launch(opts); } catch (e) { last = e; }
  }
  throw last;
}

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 430, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));


  // Вкладки на узком экране живут в нижней панели, а «Долги», «Цели», «Отчёты»
  // и «Все записи» — под кнопкой «Ещё». Тест ходит по разделам через этот помощник,
  // чтобы не зависеть от того, какая навигация видна при текущей ширине.
  const go = async (tab, wait = 250) => {
    const top = page.locator('#tabbar .tab[data-tab="' + tab + '"]');
    const bottom = page.locator('#bottomNav [data-tab="' + tab + '"]');
    if (await top.isVisible()) await top.click();
    else if ((await bottom.count()) && (await bottom.isVisible())) await bottom.click();
    else {
      await page.click("#navMore");
      await page.waitForTimeout(220);
      await page.click('.more-item[data-goto="' + tab + '"]');
    }
    await page.waitForTimeout(wait);
  };

  await page.goto(page_url);
  await page.waitForTimeout(400);

  if (await page.locator("#dbBanner").isVisible()) {
    console.log("!! баннер ошибки хранилища виден:", await page.locator("#dbBannerText").textContent());
  }
  console.log("облако:", await page.locator("#cloudText").textContent());

  // --- регулярные платежи и доходы ---
  const addRec = async (kind, name, amount, day, extra = {}) => {
    await go("recurring", 120);
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
    await go("reports", 120);
    await page.click("#repAddExpense"); await page.waitForTimeout(150);
    await page.selectOption("#fCategorySel", cat);
    await page.fill("#fAmount", String(amount));
    await page.click("#saveEntryBtn"); await page.waitForTimeout(220);
  };
  await addExpense("Продукты", 45000);
  await addExpense("Транспорт", 12000);

  // --- разбор диктовки ---
  await go("dashboard", 150);
  await page.fill("#quickInput", "я должен Ануару 240000");
  await page.click("#quickParseBtn"); await page.waitForTimeout(200);
  await page.fill("#fTerm", "6");
  await page.click("#saveEntryBtn"); await page.waitForTimeout(250);
  await go("debts", 200);
  console.log("долги:", clean(await page.locator("#oweList").innerText()).slice(0, 200));

  // --- план месяца ---
  await go("plan", 250);
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

  // сдвиг платежа на следующий месяц. Кнопка есть не у всех строк (у кредита её нет),
  // поэтому ищем её внутри нужной строки, а не по номеру в общем списке.
  const pushRow = page.locator("#planDueList .plan-row", { hasText: "Yandex Plus" });
  if (await pushRow.locator("[data-plan-push]").count()) {
    await pushRow.locator("[data-plan-push]").first().click();
    await page.waitForTimeout(350);
    console.log("после сдвига:", await page.locator("#planDueList .plan-name .t").allInnerTexts());
  }

  // --- цель ---
  await go("goals", 150);
  await page.click("#addGoalBtn"); await page.waitForTimeout(150);
  await page.fill("#gName", "Оборудование");
  await page.fill("#gTarget", "1200000");
  await page.fill("#gDeadline", "2027-09-01");
  await page.fill("#gStart", "200000");
  await page.click("#saveGoalBtn"); await page.waitForTimeout(300);
  console.log("цели:", clean(await page.locator("#goalsList").innerText()).slice(0, 220));

  // --- календарь ---
  await go("calendar", 250);
  console.log("календарь:", await page.locator("#calTitle").textContent(),
    "|", clean(await page.locator("#calSummary").textContent()),
    "| дней:", await page.locator("#calGrid .cal-cell:not(.blank)").count());

  // --- отчёты: раскрыть статью и отредактировать запись ---
  await go("reports", 250);
  await page.locator("#reportBars .bar-click").first().click(); await page.waitForTimeout(250);
  console.log("записей в статье:", await page.locator("#reportBars .bar-details .row").count());

  // --- проверки на ранее найденные баги ---
  const check = async (name, fn) => {
    try {
      const ok = await fn();
      console.log((ok ? "ок  " : "БАГ ") + name);
      if (!ok) errors.push("ПРОВЕРКА НЕ ПРОШЛА: " + name);
    } catch (e) { errors.push("ПРОВЕРКА УПАЛА (" + name + "): " + e.message); }
  };

  // у кредита не должно быть кнопки «Сдвинуть →»: она переставляет весь график платежей
  await check("у кредита нет кнопки «Сдвинуть»", async () => {
    await go("plan", 250);
    const rows = page.locator("#planDueList .plan-row");
    for (let i = 0; i < await rows.count(); i++) {
      const row = rows.nth(i);
      if ((await row.innerText()).includes("Кредит Kaspi")) return (await row.locator("[data-plan-push]").count()) === 0;
    }
    return false;
  });

  // перерасход по статье должен быть виден, а не подтягивать план под факт
  await check("перерасход по статье виден в плане", async () => {
    await go("reports", 150);
    await page.click("#repAddExpense"); await page.waitForTimeout(150);
    await page.fill("#fCategoryNew", "Тест перерасхода");
    await page.fill("#fAmount", "90000");
    await page.click("#saveEntryBtn"); await page.waitForTimeout(350);
    await go("plan", 200);
    const row = page.locator("#planCatList .plan-row", { hasText: "Тест перерасхода" });
    await row.locator("[data-budget]").click(); await page.waitForTimeout(200);
    await page.fill("#bdInput", "10000");
    await page.click("#bdSave"); await page.waitForTimeout(400);
    const text = clean(await page.locator("#planCatList .plan-row", { hasText: "Тест перерасхода" }).innerText());
    return text.includes("перерасход 80 000");
  });

  // ввод существующей статьи вручную не должен плодить дубли
  await check("дубли статей не создаются", async () => {
    await go("reports", 150);
    await page.click("#repAddExpense"); await page.waitForTimeout(150);
    await page.fill("#fCategoryNew", "  продукты ");
    await page.fill("#fAmount", "1000");
    await page.click("#saveEntryBtn"); await page.waitForTimeout(400);
    await go("history", 200);
    const opts = await page.locator("#fCategory option").allInnerTexts();
    return opts.filter((o) => o.trim().toLowerCase() === "продукты").length === 1;
  });

  // итоги по долгам должны учитывать отмеченные месяцы рассрочки
  await check("рассрочка уменьшает итог по долгам", async () => {
    await go("debts", 250);
    const before = clean(await page.locator("#debtOweTotal").textContent());
    await page.locator("#oweList [data-debt-pay]").first().click(); await page.waitForTimeout(400);
    const after = clean(await page.locator("#debtOweTotal").textContent());
    return before !== after;
  });

  // статья должна угадываться по словам фразы, без слова «статья»
  await check("статья угадывается по фразе", async () => {
    await go("dashboard", 150);
    await page.fill("#quickInput", "такси 1500");
    await page.click("#quickParseBtn"); await page.waitForTimeout(250);
    const val = await page.locator("#fCategorySel").inputValue();
    await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    return val === "Транспорт";
  });

  // одна фраза с несколькими суммами должна разложиться на несколько записей
  await check("несколько записей одной фразой", async () => {
    await go("dashboard", 150);
    await page.fill("#quickInput", "такси 1500, обед 3000 и сигареты 1200");
    await page.click("#quickParseBtn"); await page.waitForTimeout(250);
    const rows = await page.locator(".batch-row").count();
    if (rows !== 3) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); return false; }
    const before = await page.locator("#recentList .row").count();
    await page.click("#batchSave"); await page.waitForTimeout(500);
    return (await page.locator("#recentList .row").count()) === before + 3;
  });

  // а фраза с датой возврата — по-прежнему одна запись, не две
  await check("«до 10 сентября» не дробит фразу", async () => {
    await page.fill("#quickInput", "долг Бердияру 10 000тг он мне должен до 10 сентября");
    await page.click("#quickParseBtn"); await page.waitForTimeout(250);
    const batch = await page.locator(".batch-row").count();
    const person = await page.locator("#fPerson").inputValue();
    await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    return batch === 0 && person === "Бердияру";
  });

  // «повторить» кладёт копию записи сегодняшним днём.
  // Считаем по карточке «Сегодня»: «Последние записи» обрезаны восемью строками.
  await check("кнопка «повторить» дублирует запись", async () => {
    const before = await page.locator("#todayList .row").count();
    await page.locator("#todayList [data-repeat]").first().click(); await page.waitForTimeout(450);
    return (await page.locator("#todayList .row").count()) === before + 1;
  });

  // фильтр по месяцу и итоги в «Все записи»
  await check("фильтр по месяцу и итог в «Все записи»", async () => {
    await go("history", 250);
    const months = await page.locator("#fPeriod option").count();
    const sum = clean(await page.locator("#histSum").innerText());
    return months >= 2 && /записе?[йи]|запись/.test(sum) && sum.includes("Расходы");
  });

  // просроченный платёж должен отмечаться бейджем на вкладке
  await check("бейдж просрочки на вкладке «Платежи»", async () => {
    return await page.locator("#badgeRecurring.on").count() === 1;
  });

  // переключатель темы должен ходить по кругу тёмная → светлая → как в системе
  await check("переключатель темы работает", async () => {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      await page.click("#themeBtn"); await page.waitForTimeout(120);
      seen.push(String(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))));
    }
    return seen.join(",") === "light,null,dark";
  });

  // запись, не ушедшая в облако, должна лечь в очередь и уйти при восстановлении связи
  await check("очередь досылает записи после обрыва связи", async () => {
    await go("dashboard", 150);
    await page.evaluate(() => { window.__failAdd = "entries"; });
    await page.fill("#quickInput", "такси 700");
    await page.click("#quickParseBtn"); await page.waitForTimeout(200);
    await page.click("#saveEntryBtn"); await page.waitForTimeout(400);
    const queued = clean(await page.locator("#queueChipText").textContent());
    if (!queued.includes("1")) return false;
    await page.evaluate(() => { window.__failAdd = null; });
    await page.click("#queueSendBtn"); await page.waitForTimeout(600);
    return clean(await page.locator("#queueChipText").textContent()).includes("0")
      && await page.locator("#queueChip").isHidden();
  });

  console.log(errors.length ? "\nОШИБКИ:\n" + errors.join("\n") : "\nОшибок нет");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
