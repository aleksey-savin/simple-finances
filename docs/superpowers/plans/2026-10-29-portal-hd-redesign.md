# Редизайн Портала по hd — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести Портал на дизайн-систему hd (Inter, токены, шкала кеглей, контролы 40px, статусы с точкой, радиус 0) и пересобрать «Все операции» по утверждённому макету.

**Architecture:** Сначала системный слой — токены и шрифт в `src/styles.css`, затем `src/components/ui/*`, меню и шапка; затем два сквозных прохода по коду (кегли, цвета); затем чистая логика статуса и итога дня с тестами; затем эталонная страница; в конце — документы. Каждая задача оставляет приложение собирающимся и рабочим.

**Tech Stack:** TanStack Start (React 19), Tailwind v4, shadcn/ui (new-york, radix), lucide, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-29-portal-hd-redesign-design.md`
**Макет:** https://claude.ai/artifact/5V68XHNrhzNJajm7JJzzMQ (артборды «После · светлая/тёмная», «Система»)
**Источник значений:** `../hd/frontend/src/styles/tailwind.css` (токены), `../hd/docs/ux-ui-guide.md` → «Типографика».

## Global Constraints

- Скруглений нет: `--radius: 0`; из классов разрешён только `rounded-full` (точки статуса, бегунок свитча/слайдера, аватары).
- Ничего мельче 12px: нет `text-[10px]`, `text-[0.8rem]`, вообще нет `text-[Npx]`.
- Контролы в ряду: высота 40 (`h-10`), кегль 14 (`text-sm`).
- Цвета только через токены — никаких hex в `.tsx`.
- Доход/оплачено — `text-accent-text`; ожидание/частично/срок — `text-warning-text`; расход — нейтральный текст; `text-destructive` — только просрочка, ошибки, удаление.
- Все финансовые числа — `tabular-nums`.
- Меню слева остаётся (shadcn `Sidebar`).
- Функции «Всех операций» не теряются (фильтры, «Неразнесённые», «Сброс», «N из M», `InvoiceSummary`, `TagSummaryPanel`, 25/50/100, пагинация).
- Сортировки «Сначала новые» не добавляем.
- Перед каждым коммитом — `pnpm check`. Работа идёт в отдельной ветке `feat/hd-redesign` (не на `main`).
- `pnpm db:migrate` / `db:push` не запускать (схема БД в этой работе не меняется).

## Review Focus

1. **Тёмная тема на оверлеях** — поповер, дропдаун, селект, шторка, диалог, тултип в `.dark`: фон `#1d2024`, рамка `#2b2f35`, не светлая. Проверка — в задаче 2, шаг визуальной проверки.
2. **День разорван пагинацией** — у дня, чьи операции попали на страницы 1 и 2, итог одинаковый на обеих (за весь день по `filteredFeed`). Тест — задача 6.
3. **Частично оплаченный просроченный счёт** — показывает «Частично X из Y» (янтарь), а не «Просрочен». Тест — задача 6.
4. **День только с переводами или только с неоплаченными** — итог не показывается (а не «0,00 ₽»). Тест — задача 6.
5. **Ширина < 768** — подложка белая, строка инструментов переносится, мобильная карточка операции не обрезает статус и сумму. Проверка — задача 7, шаг визуальной проверки.

---

### Task 1: Токены, шрифт, подложка

**Files:**
- Modify: `src/styles.css` (весь блок `:root` / `.dark` / `@theme inline` / `@layer base`, удаление `.sidebar-dept-accent` и `.header-dept-accent`)
- Modify: `package.json` (+ `@fontsource-variable/inter`)
- Modify: `src/routes/__root.tsx` (импорт шрифта; класс подложки на `SidebarInset`)

**Interfaces:**
- Produces: Tailwind-утилиты `bg-canvas`, `text-faint`, `text-accent-text`, `text-warning-text`, `text-info`, `text-info-text`, `border-border-soft`, `bg-info` и все существующие (`bg-background`, `bg-card`, `text-muted-foreground`…) на значениях hd. Все последующие задачи пользуются только ими.

- [ ] **Step 1:** Создать ветку: `git checkout -b feat/hd-redesign`.
- [ ] **Step 2:** `pnpm add @fontsource-variable/inter`; в `src/routes/__root.tsx` — `import '@fontsource-variable/inter'` рядом с импортом `styles.css`.
- [ ] **Step 3:** В `src/styles.css` заменить значения `:root` и `.dark` на токены hd 1-в-1 (`canvas, background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, faint, accent, accent-foreground, accent-text, destructive, destructive-foreground, success, success-foreground, warning, warning-foreground, warning-text, info, info-foreground, info-text, border, border-soft, input, ring, chart-1..5`) из `../hd/frontend/src/styles/tailwind.css`. Токены hd, которых в Портале нет по смыслу (`ws-*`, `channel-*`, `bubble-*`, `media-*`, `voice-wave`, `rule`, `foreground-soft`), не переносить. `--radius: 0`.
- [ ] **Step 4:** `--sidebar*` в обеих темах: `--sidebar: var(--background)`, `--sidebar-foreground: var(--foreground)`, `--sidebar-primary: var(--primary)`, `--sidebar-primary-foreground: var(--primary-foreground)`, `--sidebar-accent: var(--accent)`, `--sidebar-accent-foreground: var(--accent-text)`, `--sidebar-border: var(--border)`, `--sidebar-ring: var(--ring)`.
- [ ] **Step 5:** В `@theme inline` добавить `--color-canvas`, `--color-faint`, `--color-accent-text`, `--color-warning-text`, `--color-info`, `--color-info-foreground`, `--color-info-text`, `--color-border-soft` и `--font-sans` со стеком hd (`"Inter Variable", -apple-system, …`). Удалить `font-family` у `body` (шрифт идёт через `--font-sans`/`html`).
- [ ] **Step 6:** `@layer base`: `*, ::before, ::after { border-color: var(--border) }`; `body { background: var(--canvas) }` и `@media (max-width: 767.98px) { body { background: var(--background) } }` (в `.dark` подложка остаётся `--canvas`, как в hd). Удалить мёртвые `.sidebar-dept-accent`, `.header-dept-accent`.
- [ ] **Step 7:** В `__root.tsx` на `SidebarInset` — `className="bg-canvas max-md:bg-background dark:max-md:bg-canvas"`.
- [ ] **Step 8:** Проверка: `pnpm build` — успешно; `grep -c 'Inter Variable' src/styles.css` ≥ 1; `grep -n 'dept-accent' src/styles.css` — пусто.
- [ ] **Step 9:** `pnpm check`; коммит `style: hd design tokens, Inter font, canvas`.

### Task 2: Базовые компоненты `ui/*`

**Files:**
- Modify: `src/components/ui/{button,input,textarea,select,combobox,multi-select-combobox,tag-picker,toggle,toggle-group,tabs,label,field,card,table,badge,dialog,alert-dialog,sheet,drawer,popover,dropdown-menu,tooltip,calendar,switch,slider,avatar,input-otp,tag-summary-panel,responsive-dialog,item}.tsx`
- Create: `src/components/ui/status-text.tsx`
- Create: `src/components/ui/page-header.tsx`

**Interfaces:**
- Produces:
  - `type StatusTone = 'positive' | 'pending' | 'danger' | 'neutral'` и `StatusText({ tone: StatusTone, children: ReactNode, className?: string })` — `inline-flex items-center gap-2 font-medium` + точка `size-2 rounded-full bg-current`; цвет: positive → `text-accent-text`, pending → `text-warning-text`, danger → `text-destructive`, neutral → `text-muted-foreground`.
  - `PageHeader({ title: string, count?: number, children?: ReactNode })` — слева `h1` (`text-3xl leading-none font-semibold tracking-tight`) и счётчик (`text-xl font-medium text-faint tabular-nums`), справа `children` (поиск, главное действие), `flex flex-wrap items-center gap-3 mb-5`.

- [ ] **Step 1:** `button`: размеры `default h-10 px-4`, `sm h-9 px-3`, `xs h-8 px-2.5 text-xs`, `lg h-11 px-5 text-base`, `icon size-10`, `icon-sm size-9`, `icon-xs size-8`, `icon-lg size-11`. Варианты: `default` — `bg-primary text-primary-foreground font-semibold hover:bg-primary/90`; `outline` — `border bg-background hover:bg-accent`, без `shadow-xs`; `destructive` — `bg-destructive text-destructive-foreground`; `secondary`/`ghost`/`link`/`success`/`warning` — на новых токенах. Сохранить имена всех вариантов и размеров (на них ссылаются ~114 мест).
- [ ] **Step 2:** Поля (`input`, `textarea`, `select` trigger, `combobox`, `multi-select-combobox`, `tag-picker` trigger, `input-otp` slot): `h-10 text-sm px-3 border bg-background`, фокус `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20`, без `md:text-sm`-переключений кегля. `toggle`/`toggle-group` item и `tabs` trigger — `h-10 text-sm font-medium`; `tabs` list — сегменты как на макете (`bg-accent p-[3px]`, активный — `bg-background shadow-xs`).
- [ ] **Step 3:** `label` и подпись в `field` — `text-sm font-semibold text-muted-foreground`. `card` — `bg-card border` без тени. `table`: `TableHead` — `text-xs font-bold tracking-wider uppercase text-faint`, `TableRow` — `border-border-soft`, `TableCell` — `text-sm`. `badge` — нейтральная пилюля `border bg-accent text-xs font-medium px-2 py-0.5`.
- [ ] **Step 4:** Оверлеи (`dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `dropdown-menu`, `tooltip`, `responsive-dialog`): поверхность `bg-popover`/`bg-background` + `border`, заголовки — `text-lg font-semibold`, описание — `text-sm text-muted-foreground`, пункты меню — `h-10 text-sm`, метки групп меню — роль «метка группы».
- [ ] **Step 5:** Во всём `src/components/ui/` убрать `rounded`, `rounded-sm|md|lg|xl|l-md|r-md` (заменить на ничего или `rounded-none` там, где нужно перебить radix-дефолт); `rounded-full` оставить только у бегунка `switch`/`slider`, `avatar`, точки `StatusText`.
- [ ] **Step 6:** Создать `status-text.tsx` и `page-header.tsx` по Interfaces.
- [ ] **Step 7:** Проверка: `pnpm build` успешно; `grep -rnE 'rounded(-(sm|md|lg|xl|l-md|r-md))?\b' src/components/ui | grep -v rounded-full | grep -v rounded-none` — пусто.
- [ ] **Step 8:** Визуальная проверка (Review Focus 1): `pnpm dev`, страница «Все операции», переключить тему в тёмную, открыть: дропдаун меню строки, поповер периода, селект размера страницы, диалог удаления, тултип — фон тёмный, рамки тёмные, скруглений нет.
- [ ] **Step 9:** `pnpm check`; коммит `style: restyle ui primitives to hd system, add StatusText and PageHeader`.

### Task 3: Меню слева и шапка

**Files:**
- Modify: `src/components/ui/sidebar.tsx`, `src/components/layout/app-sidebar.tsx`, `src/components/layout/nav-user.tsx`, `src/components/layout/app-header.tsx`, `src/components/layout/app-breadcrumbs.tsx`

- [ ] **Step 1:** `sidebar.tsx`: `SidebarMenuButton` default — `h-10 text-sm font-medium gap-3 px-3`; активное состояние (`data-[active=true]`) — `bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--primary)]`; `SidebarGroupLabel` — `text-xs font-bold tracking-wider uppercase text-faint`; ширина `SIDEBAR_WIDTH = '16.5rem'`; рамка справа `border-r`.
- [ ] **Step 2:** `app-sidebar.tsx`: блок бренда — высота 56 (`h-14`), квадрат `bg-primary` 28px с буквой и подпись «Портал» `text-base font-semibold`; переключатель скоупа — кнопка-поле `h-10 border` как на макете; иконки пунктов — `size-[18px]` → допустимо `size-4.5`.
- [ ] **Step 3:** `app-header.tsx`: `h-14 bg-background border-b px-6`; крошки — `text-sm text-muted-foreground`, текущая — `text-foreground font-medium`; кнопки справа — `Button variant="ghost" size="icon"`.
- [ ] **Step 4:** Проверка: `pnpm build`; визуально в обеих темах меню совпадает с артбордом «После» (активный пункт с полосой, метки групп бледные заглавные).
- [ ] **Step 5:** `pnpm check`; коммит `style: hd-style sidebar and header`.

### Task 4: Проход по кеглям

**Files:**
- Modify: все `.tsx` в `src/routes/` и `src/components/` (кроме `ui/`, сделанных в задаче 2), где встречаются `text-[10px]`, `text-[0.8rem]`, `text-xs`, `text-2xl`, `text-xl`, `text-lg`, `font-bold` в заголовках.

- [ ] **Step 1:** `text-[10px]` (10 мест) и `text-[0.8rem]` (2) → `text-xs`.
- [ ] **Step 2:** Каждое `text-xs` (~246) — по роли из спеки: служебные числа, даты, чипы, бейджи остаются `text-xs`; подписи, мета, подсказки, описание, пункты списков → `text-sm`; метки групп/eyebrow → `text-xs font-bold tracking-wider uppercase text-faint`.
- [ ] **Step 3:** Заголовки: страниц ошибок/пустых состояний и заголовков диалогов — по таблице ролей (`text-lg font-semibold` для диалога, `text-xl font-semibold tracking-tight` для формы, `text-base font-semibold` для секции); KPI на дашборде (`src/components/dashboard/*-metric-card.tsx`) — `text-3xl font-bold tabular-nums`. Таблицы данных и графики отчётов (`src/components/reports/*`) не подтягивать к ролям: остаются 14/12 (как в hd).
- [ ] **Step 4:** Проверка: `grep -rnE 'text-\[[0-9.]+(px|rem)\]' src --include='*.tsx'` — пусто; `grep -rnE '\brounded(-(sm|md|lg|xl))?\b' src --include='*.tsx' | grep -v rounded-full | grep -v rounded-none` — пусто; `pnpm build` успешно.
- [ ] **Step 5:** `pnpm check`; коммит `style: apply hd type roles across pages`.

### Task 5: Проход по цветам доход / расход / статусы

**Files:**
- Modify: все `.tsx`, где встречаются `text-success` (41), `text-warning` (24), `text-destructive` (85), включая `src/components/dashboard/*`, `src/components/reports/*`, `src/components/receivables/*`, `src/components/payables/*`.

- [ ] **Step 1:** Текстовые `text-success` → `text-accent-text` (доход, «оплачено», положительная динамика).
- [ ] **Step 2:** Текстовые `text-warning` → `text-warning-text`.
- [ ] **Step 3:** `text-destructive`, обозначающий расход/списание/отрицательную сумму → убрать класс (нейтральный `text-foreground`); обозначающий просрочку, ошибку валидации, удаление, отказ доступа → оставить. Заливки `bg-success|warning|destructive` и `/NN`-тинты не трогать (кроме `bg-destructive/10` у строки операции — это задача 7).
- [ ] **Step 4:** Графики: цвета серий берутся из `var(--chart-N)`; если в компонентах графиков захардкожены цвета дохода/расхода — заменить: доход `var(--chart-1)`, расход `var(--chart-3)`.
- [ ] **Step 5:** Проверка: `grep -rn 'text-success\b' src --include='*.tsx'` — пусто; `grep -rn 'text-warning\b' src --include='*.tsx'` — пусто; `pnpm build` успешно; визуально дашборд и «Динамика» в обеих темах: расходы нейтральные, доход бирюзовый.
- [ ] **Step 6:** `pnpm check`; коммит `style: hd colour semantics for income, expense and statuses`.

### Task 6: Логика статуса счёта и итога дня (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/transaction-feed.ts`
- Test: `src/lib/transaction-feed.test.ts`

**Interfaces:**
- Consumes: типы `Invoice`, `AccountTransfer`, `TransactionFeedItem` из `#/types`; `StatusTone` из `#/components/ui/status-text` (импорт типа).
- Produces:
  - `getInvoiceStatus(item: Pick<Invoice, 'paymentStatus' | 'paidAt' | 'dueDate' | 'archivedAt' | 'amount' | 'settledAmount'>, now: Date): { tone: StatusTone; label: string }`
  - `getFeedDateKey(item: TransactionFeedItem): string` — `yyyy-MM-dd` от `transferredAt` (перевод) или `createdAt` (счёт); перенести сюда из `transactions.tsx` логику `getTransactionTime` + `format`.
  - `computeDayTotals(feed: TransactionFeedItem[]): Map<string, number>` — ключ `getFeedDateKey`; значение = Σ `amount` оплаченных (`paymentStatus === 'paid'`) `receivable` − Σ `amount` оплаченных `payable`; переводы, неоплаченные и частично оплаченные не учитываются; день без ни одного оплаченного счёта в Map **отсутствует**.

Правила `getInvoiceStatus` (по приоритету, даты — `dd.MM.yyyy`, суммы — `toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`):
1. `paid` → `positive`, `Оплачено ${дата paidAt}`
2. `partial` → `pending`, `Частично ${settledAmount} из ${amount}`
3. `archivedAt !== null` → `neutral`, `В архиве`
4. `dueDate < now` → `danger`, `Просрочен · до ${дата dueDate}`
5. `dueDate` есть → `pending`, `до ${дата dueDate}`
6. иначе → `pending`, `Ждёт оплаты`

- [ ] **Step 1:** `vitest.config.ts`: `defineConfig({ plugins: [tsconfigPaths()], test: { environment: 'node', include: ['src/**/*.test.ts'] } })` — без плагинов TanStack Start/Nitro.
- [ ] **Step 2: Тесты** в `src/lib/transaction-feed.test.ts`:
  - `paid → positive «Оплачено 12.10.2026»`
  - `partial overdue → pending «Частично 50 000,00 из 100 000,00»` (Review Focus 3: `dueDate` в прошлом, всё равно «Частично»)
  - `archived unpaid → neutral «В архиве»`
  - `overdue → danger «Просрочен · до 20.10.2026»` (now = 2026-10-29)
  - `due in future → pending «до 05.11.2026»`
  - `no due date → pending «Ждёт оплаты»`
  - `computeDayTotals: paid receivable 184000 + unpaid payable 95000 on 2026-10-28 → 184000`
  - `computeDayTotals: transfers ignored; day of only transfers is absent` (Review Focus 4)
  - `computeDayTotals: day with only unpaid invoices is absent` (Review Focus 4)
  - `computeDayTotals: paid payable 612400 + paid receivable 420000 → −192400`
  - `computeDayTotals is computed over the whole feed, not a page` — 3 оплаченных счёта одного дня, `computeDayTotals(feed).get(day)` равен сумме всех трёх, хотя `feed.slice(0, 2)` дал бы другое (Review Focus 2)
- [ ] **Step 3:** `TEST=1 pnpm vitest src/lib/transaction-feed.test.ts` — FAIL (модуль не найден).
- [ ] **Step 4:** Реализовать три функции в `src/lib/transaction-feed.ts` (без `server-only`, модуль клиентский).
- [ ] **Step 5:** `TEST=1 pnpm vitest src/lib/transaction-feed.test.ts` — PASS, 11 тестов.
- [ ] **Step 6:** `pnpm check`; коммит `feat: invoice status and paid day totals for transaction feed`.

### Task 7: Эталонная страница «Все операции»

**Files:**
- Modify: `src/routes/transactions.tsx`
- Modify: `src/components/invoices/list-item.tsx` (desktop-строка ~724+, мобильная карточка, `cfg.status`)
- Modify: `src/components/transactions/transfer-item.tsx`
- Modify: `src/components/invoices/summary.tsx` (вид карточек)

**Interfaces:**
- Consumes: `PageHeader`, `StatusText` (задача 2); `getInvoiceStatus`, `getFeedDateKey`, `computeDayTotals` (задача 6).

- [ ] **Step 1:** Шапка: `<PageHeader title="Операции" count={filteredFeed.length}>` + поиск (`Input` 300px с иконкой) + `Button` «Новая операция» (`Plus`); поиск переезжает из карточки-фильтра в шапку.
- [ ] **Step 2:** Строка инструментов (`flex flex-wrap items-center gap-2 mb-3`, без обёртки `Card`): сегменты «Создано / Оплачено» (`ToggleGroup`), чип периода, чипы-мультиселекты «Счёт», «Категория», «Контрагенты», «Метки», чипы-селекты «Тип» и «Статус», чип-переключатель «Неразнесённые», «Сброс» (ghost) и справа «N из M» `text-sm text-muted-foreground tabular-nums`. Чип: `Button variant="outline"` `h-10` с подписью и значением `text-muted-foreground font-normal` («все», имя или «N выбрано»); заданный фильтр — `border-primary/45 bg-primary/10 text-accent-text`. Существующие обработчики, состояние в URL и `clearFilters` не меняются.
- [ ] **Step 3:** `InvoiceSummary` остаётся над строкой инструментов в виде панелей `bg-card border` с KPI `text-3xl font-bold tabular-nums`.
- [ ] **Step 4:** Список: одна панель `bg-card border`; `TableHeader` по роли задачи 2; заголовок дня — строка с меткой группы слева (`formatGroupDateLabel`, `text-xs font-bold tracking-wider uppercase text-faint`, выравнивание влево, без фона `bg-muted/30`) и справа `computeDayTotals(filteredFeed).get(dateKey)` (`text-sm font-medium text-muted-foreground tabular-nums`, со знаком `+`/`−`, формат `ru-RU` 2 знака); нет значения — ничего. `computeDayTotals` — в `useMemo` от `filteredFeed`; группировку `desktopGroups` перевести на `getFeedDateKey`.
- [ ] **Step 5:** Строка счёта (`list-item.tsx`, desktop): ячейка документа — заголовок `text-base font-medium`, мета `text-sm text-muted-foreground` (описание · время); счёт и категория — `text-sm text-muted-foreground`, выравнивание влево; статус — `<StatusText tone label>` из `getInvoiceStatus(item, new Date())` вместо `cfg.status`; сумма — `text-base font-semibold tabular-nums`, `receivable` → `text-accent-text`, `payable` → без цвета; убрать `cn(isOverdue && 'bg-destructive/10')` и приглушение неоплаченных; `TagChips`, `TagPicker`, блок связанных банковских документов и договора остаются, стили — нейтральные пилюли `text-xs` без скруглений. Мобильная карточка — те же роли и `StatusText`.
- [ ] **Step 6:** Строка перевода (`transfer-item.tsx`): та же сетка; статус — `<StatusText tone="neutral">Перевод</StatusText>`; сумма без знака и цвета.
- [ ] **Step 7:** Низ панели: «всего записей N», селект 25/50/100 (`h-10`), пагинация `Button variant="outline"` — внутри панели, `border-t border-border-soft px-5 py-3`; `TagSummaryPanel` — под панелью.
- [ ] **Step 8:** Проверка: `pnpm build`; `TEST=1 pnpm test` — PASS.
- [ ] **Step 9:** Визуальная проверка (Review Focus 5): `pnpm dev`, «Все операции» в светлой и тёмной теме против артбордов макета; ширина 390px — подложка белая, строка инструментов переносится, у мобильной карточки виден статус и сумма; при pageSize=25 найти день, разорванный между страницами, — итог одинаковый.
- [ ] **Step 10:** `pnpm check`; коммит `feat: rebuild transactions page on hd design`.

### Task 8: Документы системы

**Files:**
- Modify: `DESIGN.md` (полная замена)
- Modify: `CLAUDE.md` (раздел «UI styling»)

- [ ] **Step 1:** `DESIGN.md` — новая система: происхождение (hd, без скруглений), токены с назначением (таблица из артборда «Система»), таблица ролей кеглей из спеки, правила «ничего мельче 12», «контролы 40/14», «радиус 0, кроме `rounded-full` у точек/бегунков/аватаров», семантика цветов доход/расход/статусы, `StatusText` и `PageHeader` как обязательные компоненты, «Все операции» как эталон.
- [ ] **Step 2:** `CLAUDE.md` → «UI styling»: оставить «No rounded corners» (с исключением `rounded-full`), заменить описание «Architectural Ledger»/«no 1px borders»/«muted error/tertiary» на ссылку на новый `DESIGN.md` и три правила: токены вместо hex, роли кеглей, `text-accent-text` / `text-warning-text` / нейтральный расход. Правило про Tailwind v4 `w-[var(--var)]` оставить.
- [ ] **Step 3:** `pnpm check`; коммит `docs: describe hd-based design system`.
