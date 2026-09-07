# Гроссбух

Учёт финансов A Catering — одностраничное веб-приложение, опубликованное как артефакт Claude.

- `index.html` — всё приложение (тело страницы, без тегов `<html>/<head>/<body>` — так требует артефакт)
- `CLAUDE.md` — контекст проекта: модель данных, соглашения, как публиковать
- `dev/build.js` — собирает `dev/test.html` для запуска в обычном браузере
- `dev/shim.js` — заглушка облачной базы (данные в памяти)
- `tests/smoke.js` — прогон по всем вкладкам через Playwright

## Быстрый старт

```bash
node dev/build.js       # собрать dev/test.html
open dev/test.html      # открыть в браузере

npm i -D playwright     # один раз
node tests/smoke.js     # автопроверка
```

Ссылка на живое приложение: https://claude.ai/code/artifact/f7c1e768-ebfa-4fad-a6b8-a543b3d1c619
