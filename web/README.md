# Как выложить «Финансы»

Приложение живёт на **Firebase Hosting** в проекте `finance-anuar`: там же, где база,
поэтому домен приложения уже разрешён для входа, а код остаётся приватным —
репозиторий на GitHub для работы сайта не нужен.

Проверить, что всё получилось: открыть `https://finance-anuar.web.app` с телефона,
войти через Google и записать любую трату. Если она появилась на ноутбуке — готово.

---

## Что уже сделано

- проект `finance-anuar`, Firestore создан и закрыт правилами;
- `web/config.js` заполнен, ключ проверен;
- домены `finance-anuar.web.app`, `finance-anuar.firebaseapp.com` и
  `anuarbekyt.github.io` разрешены для входа;
- `firebase.json` и `.firebaserc` настроены на этот проект;
- `docs/` собран.

## Что осталось

### 1. Включить вход через Google — в консоли

[Firebase Console](https://console.firebase.google.com/project/finance-anuar/authentication/providers)
→ **Authentication → Sign-in method → Google → Enable**. Support email — ваша почта. Save.

Без этого кнопка «Войти через Google» вернёт ошибку `auth/operation-not-allowed`.

### 2. Войти в firebase из терминала — один раз

```bash
npx firebase login
```

Откроется браузер, выберите свой аккаунт Google. Пароль вводите только вы.

### 3. Выложить

```bash
npm run deploy
```

Пересоберёт `docs/`, выложит сайт и заодно опубликует правила доступа из
`web/firestore.rules` — отдельно копировать их в консоль больше не нужно.

Адрес: **https://finance-anuar.web.app**

### 4. Поставить на телефон

Открыть адрес в Chrome → меню → **Установить приложение**
(в Safari — «Поделиться» → «На экран "Домой"»). Появится иконка ₸, приложение
запускается без адресной строки и открывается без сети.

---

## Обновить приложение после правок

```bash
npm test        # сборка тестовой страницы + прогон сценариев
npm run deploy  # пересборка docs/ и выкладка
```

`docs/` — готовая страница целиком, а не исходник: `npm run deploy` пересобирает её
сам, но если выкладываете чем-то другим, `node dev/build-web.js` обязателен, иначе
на сайте останется старая версия.

Новая версия подхватывается при следующем открытии приложения: страница берётся из
сети, кэш — запасной вариант на случай оффлайна.

## Кого пускать в приложение

Войти может любой аккаунт Google — отдельно выдавать доступ не нужно
(`FINANCE_ALLOWED_EMAILS = []` в `web/config.js`). Данные у каждого свои: владелец
(`FINANCE_OWNER_EMAIL` в `web/config.js` и почта в `isOwner()` правил) работает
с корневыми коллекциями, любой другой — только со своим пространством `spaces/<почта>`:
при первом входе у него пустая база со стандартными статьями. Друг друга они не видят.

Чтобы снова пускать только по списку, почты надо вписать в `FINANCE_ALLOWED_EMAILS`
и тем же списком ограничить `match /spaces/...` в `web/firestore.rules`. После правки —
`npm run deploy`.

Правила и есть единственное, что закрывает данные. Ключи Firebase в `docs/config.js`
публичны по устройству самого Firebase и ничего не защищают.

## Разбор фраз ИИ

Надиктованную фразу разбирает Gemini через Firebase AI Logic: сумма, статья из ваших,
дата («вчера»), долги с именем и сроком. Результат всегда показывается списком на
проверку. Ключа Gemini в коде нет — его держит Firebase; App Check с reCAPTCHA Enterprise
подтверждает, что запрос идёт с нашего сайта (с 2 ноября 2026 Firebase без этого ИИ
не пускает). Пока в `web/config.js` пустой `FINANCE_AI.recaptchaKey`, ИИ выключен
и фразы разбираются правилами приложения.

**Сделано 25.09.2026:** AI Logic включён (Gemini Developer API), ключ reCAPTCHA
Enterprise «Финансы» (`6Le1WM0t…`, домены `finance-anuar.web.app` и
`finance-anuar.firebaseapp.com`) создан, зарегистрирован в App Check и вписан
в `web/config.js`; App Check для AI Logic (`firebaseml.googleapis.com`) — Enforced.
Запрос без токена App Check получает 401.

Настройка с нуля (для другого проекта) — один раз, делает владелец аккаунта:

1. [Firebase → AI Logic](https://console.firebase.google.com/project/finance-anuar/ailogic/)
   → **Get started** → **Gemini Developer API** (бесплатный уровень, карта не нужна).
2. [Google Cloud → reCAPTCHA](https://console.cloud.google.com/security/recaptcha?project=finance-anuar)
   → **Create key**: тип — веб-сайт, домены `finance-anuar.web.app` и
   `finance-anuar.firebaseapp.com`, галочку **Use checkbox challenge** не ставить.
   Скопировать ID ключа (начинается с `6L`). Он не секретный.
3. [Firebase → App Check](https://console.firebase.google.com/project/finance-anuar/appcheck)
   → **Apps** → веб-приложение → **reCAPTCHA Enterprise** → вставить ключ → **Save**.
   Затем **APIs** → **Firebase AI Logic** → **Enforce**, если мастер из шага 1 не включил сам.
4. Вписать ключ в `web/config.js` → `FINANCE_AI.recaptchaKey` и `npm run deploy`.

Модель задаётся там же (`FINANCE_AI.model`). Значок reCAPTCHA на странице спрятан
(налезал на нижнюю панель) — вместо него текст о защите в «Настройках → Аккаунт».

## Если что-то не работает

| Что видно | В чём дело |
|---|---|
| `auth/operation-not-allowed` при входе | не сделан шаг 1 |
| «Не заполнен файл config.js» | нет `web/config.js` или после его создания не пересобран `docs/` |
| После входа пусто, в шапке красный ₸ | правила не опубликованы или почта в них не совпадает с той, под которой вошли |
| «У аккаунта … нет доступа» | вошли не той почтой; нажмите «Войти другим аккаунтом» |
| На сайте старая версия | выкладка прошла без `node dev/build-web.js` |
| `Error: Failed to get Firebase project` | не сделан шаг 2 (`npx firebase login`) |

## Если понадобится ещё и GitHub Pages

`docs/` собран так, что годится и туда: публичный репозиторий, **Settings → Pages →
ветка `main`, папка `/docs`**. Домен `anuarbekyt.github.io` для входа уже разрешён.
База общая, оба адреса будут показывать одни и те же данные.
