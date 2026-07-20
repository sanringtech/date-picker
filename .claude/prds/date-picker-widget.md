---
schema_version: 1
feature_id: date-picker-widget
feature_name: Sanring Composed DatePicker Widget (@sanring/date-picker-widget)
status: active
owner: jack755051
last_updated: 2026-07-20
related_constitution: .claude/constitutions/date-picker.md
related_adrs: []
---

# PRD: Composed Widget — @sanring/date-picker-widget

> ⚠️ 此文件由 `/supervisor:prd date-picker-widget` 訪談模式產出。§1-3、§5 的技術選型欄位為使用者親口拍板（T1/T2 verbatim，見文末審查清單）；§4、§6-11 原為「交回主 Claude 擬草稿」的 AI 草稿，2026-07-20 經兩輪對話（四項 API 形狀關鍵決策逐一拍板 → AI 依決策展開具體草稿 → 使用者對展開後的完整草稿含 AI 自行判斷的兩點（Range 預設雙月並排、Overlay 錨定定位）一併確認「同意，先定案」）正式拍板，`status` 因此轉為 `active`。文中殘留的 🔶 標記僅為歷史留痕，不代表仍待確認。

## 1. 背景 (Background)

依憲法 `.claude/constitutions/date-picker.md` §7 Decision 9（兩層終局願景）與新增 Decision 10（雙消費模式承諾），本產品最終將產出兩層獨立產出物：

1. **Headless Engine 層**（現狀）—— 已有獨立 PRD：`.claude/prds/date-picker.md`（status: accepted，M0-M7 全數完成並已發布至 `0.4.0`，見該 PRD 第 10 節里程碑）。
2. **Composed Widget 層**（本 PRD 對應的產出物）—— 比照 `vue3-datepicker`，開箱即用、含 input + popover/overlay + 預設可覆寫樣式，可被獨立安裝直接使用。

**業務目標**（使用者原話，T1）：讓 `@sanring/date-picker` 從「只服務 sanring/ui 內部組裝」升級為「可獨立發布使用的完整 DatePicker 產品」，達到類似 vue3-datepicker 的市場定位——任何 Angular 專案不需要依賴 sanring/ui、也不用自己重新組裝 Popover/Input，`npm install` 完即可直接用一個功能完整的 DatePicker/RangePicker。同時保留 shadcn 式複製所有權轉移模式，讓有深度客製化需求的開發者能直接接手原始碼，不被黑盒鎖死（呼應 R1 精神與新增的 100% 可覆寫不變量）。

**架構邊界（憲法已拍板，非本 PRD 決定）**：
- Composed Widget 層屬於憲法 R1「引擎與外殼嚴格解耦」定義的「應用層」之一種官方實作。
- Composed Widget 層一律只能透過 engine 對外公開的 public API 消費 engine（憲法 R5），不因為「同一團隊發布」而享有存取 engine 內部未公開實作的特權。engine 目前的 Public API Surface 定義於 `.claude/prds/date-picker.md` §7。R5 約束的是**官方發布的原始碼本身**；使用者透過複製模式取得原始碼後如何修改，屬於使用者自由，不在憲法/本 PRD 管轄範圍。
- Composed Widget 層允許內建預設樣式與預設格式化，但每一條預設值都必須可被外部 100% 覆寫（憲法 I5）。
- Composed Widget 必須同時支援兩種消費模式（憲法 Decision 10）：npm 黑盒安裝 + shadcn 風格所有權轉移複製，兩者互補、缺一不可（見第 5 節技術選型）。

## 2. 目標 (Goals)

- **業務目標**（使用者原話，T1）：見第 1 節。
- **使用者目標**（使用者原話，T1）：
  - **想快速上線的開發者**：`npm install` 後配置最少必要 props（`locale`、選擇性 `format`）即可得到符合 WAI-ARIA 標準、含輸入框與彈出月曆的完整元件。
  - **想深度客製化的開發者**：透過複製模式取得原始碼，能看見 Composed Widget 如何用 `CalendarEngine` + Overlay + Input 組裝而成，可在此基礎上任意修改，不失去 engine 既有的無障礙/狀態機保證。
  - 兩種開發者都不需要自己從零研究 Angular CDK Overlay、WAI-ARIA Date Picker Dialog Pattern、或跨月焦點鍵盤導航的實作細節。

## 3. 範圍 (Scope) vs 非範圍 (Non-Goals)

### ✅ 範圍（使用者原話，T1）

- [ ] Composed `<DatePicker>`（single 模式）與 `<DateRangePicker>`（range 模式）元件，內部組裝現有 `CalendarEngine` + `CalendarGridDirective`
- [ ] Popover/Overlay 整合（Angular CDK Overlay，見第 5 節）：開關觸發、定位、Click Outside 呼叫 `abortRangeDraft()`
- [ ] Input 欄位：顯示格式化日期字串（預設格式可覆寫，呼應憲法 I5 可覆寫不變量），聚焦時開啟 overlay
- [ ] 預設可覆寫樣式（Tailwind-based，比照 demo app 現有視覺，保留 class/CSS variable 覆寫機制）
- [ ] 兩種發布模式：npm 黑盒安裝 + shadcn 風格複製所有權轉移（見第 5 節）
- [ ] 完整沿用既有 engine 能力（disabled dates、多月並排、locale 注入、SSR today 注入），不重新發明

### ❌ 非範圍（使用者原話，T1，沿用/延伸既有憲法永久排除項）

- ❌ 任意自然語言解析（如「下週五」）——只做「明確指定格式的字串 ⇄ Date」雙向轉換，格式必須顯式設定，不做猜測
- ❌ 非公曆曆法、Year/Decade View —— 沿用憲法 §1 永久排除
- ❌ 內建 `minDate`/`maxDate` 業務規則 —— 依然委派給 `DisabledInput`，Composed 層頂多提供語法糖轉譯，不改變底層委派機制（沿用憲法 §9 Zero Opinion 對 engine 的約束）
- ❌ SSR hydration 自動偵測 —— 沿用 Decision 4
- ❌ 跨框架版本（React/Vue）——目標讀者明確是 Angular 生態系，「shadcn/vue」僅為消費模式比喻，不是字面互通目標（見第 1 節、憲法 Decision 10）

### 🔍 vue3-datepicker 功能對標：純技術可行性分析（AI 分析，未排入任何 Milestone）

以下是比對 vue3-datepicker 功能列表後的**純技術可行性**判斷——刻意把「技術上做不做得到」與「憲法現況是否允許」分開討論，不互相污染判斷。Engine／Widget 兩欄各自獨立評估，不強制二選一；「現行治理狀態」單獨列一欄，僅陳述現況，不作為技術可行性的理由。

| 功能 | Engine 可行？ | Widget 可行？ | 現行治理狀態 |
|---|---|---|---|
| `range` | ✅ 已實作，狀態機在此層 | ⚠️ 技術上可重刻，但等於重造 engine 已測試過的邏輯，無實益 | 無限制 |
| `multi-calendars` | ✅ 已實作（共享選取狀態版本，`monthsToDisplay`） | ✅ 也可行——不需共享選取狀態時，widget 可並排多個獨立 `CalendarEngine` 實例 | 無限制 |
| `multi-dates` | ✅ 已拍板（Decision 11/I6），未實作 | ❌ 不行，屬於資料模型層級，widget 無法繞過 | 無限制，待實作 |
| `month-picker` | ✅ 可行——新開一套跟日網格平行的月份網格/狀態機/鍵盤導覽，工程量同 Multi-dates 等級 | ✅ 也可行（簡化版：`CalendarLocale.monthLabels` + widget 本地狀態，犧牲與日網格同等的鍵盤導覽嚴謹度換取低成本） | 憲法 §1／Decision 8 現行列為永久排除，**這是治理決定，不是技術限制**；真要做，走 supersede 訪談即可解除 |
| `year-picker` | ✅ 可行，同上換年份網格 | ✅ 可行，同上簡化版 | 同上 |
| `quarter-picker` | ✅ 可行，同上換 4 格季度網格，選項少工程量略小 | ✅ 可行，同上簡化版更容易 | 同上 |
| `time-picker` | ✅ 技術上可行（可把時分狀態塞進 engine，但會打破其目前「只管日期」的單一職責） | ✅ 可行且更乾淨（利用 R2 既有時分保真特性，widget 自己管時分、合成 Date 才丟給 `selectDate()`） | 無限制，widget 路徑不需任何憲法修訂 |
| `week-picker` | ✅ 技術上可行（可新增 `selectWeek()` 或 `selectionMode:'week'`） | ✅ 可行且更乾淨（借用既有 Range 的兩次 `selectDate()` 呼叫湊出來） | 無限制，widget 路徑不需任何憲法修訂 |
| `text-input` | ❌ 不行——engine 的資料契約定死「只吃/只吐 Date 物件」，字串解析/格式化放進 engine 會改變其核心介面定義 | ✅ 可行，本來就該在這層 | 無限制 |
| `inline` | 不適用（engine 從不渲染任何東西） | ✅ 可行，且不限 Widget——任何直接用 `CalendarGridDirective` 的消費者本來就能自行決定是否包 overlay | 無限制 |
| `flow` | 不適用（跟資料模型無關） | ✅ 可行，純步驟切換 UI 邏輯，不限官方 Composed Widget 才能做 | 無限制 |
| `vertical` | 不適用（純版面方向） | ✅ 可行，且任何直接用 `CalendarGridDirective` 的消費者自己刻 CSS 即可 | 無限制 |

**一句話結論**：12 項裡沒有一項是技術上做不到的。`multi-dates` 是唯一「只能 Engine 做」；`text-input` 是唯一「只能 Widget 做，Engine 做了會違背自己資料契約」；`inline`／`flow`／`vertical` 甚至不需要等 Composed Widget，裸 engine 消費者自己就能刻。唯一真正受限的是 `month-picker`／`year-picker`／`quarter-picker`——受限的是**憲法 Decision 8 目前的治理決定**，不是技術瓶頸，兩者不要混為一談：技術可行性判斷不受現行憲法拘束，但若要真的排入範圍施工，仍需先走 supersede 拍板。

## 4. 使用者故事 (User Stories)

> ✅ **2026-07-20 使用者確認拍板**（原為 AI 草稿）。四個故事方向沿用已拍板的 §1/§2 業務目標推導，Acceptance Criteria 依同日拍板的四項 API 決策補齊。

### Story 1（黑盒安裝消費者）
- **As a** 想快速上線的 Angular 開發者
- **I want to** `npm install @sanring/date-picker-widget` 後，用最少 props 掛上 `<sanring-date-picker>`
- **So that** 不用自己組裝 Overlay/Input/Popover，就能得到符合 WAI-ARIA 的完整 DatePicker

### Story 2（黑盒安裝消費者，Range 模式）
- **As a** 需要日期區間選取的開發者
- **I want to** 用 `<sanring-date-range-picker>` 並綁定 `[(selectedRange)]`（見第 7 節，2026-07-20 命名隨 `model()` 綁定風格拍板統一）
- **So that** 取得雙輸入框 + 雙月並排 popover 的完整 RangePicker，行為與憲法 §4 Range Selection 狀態機一致

### Story 3（複製模式消費者）
- **As a** 需要深度客製化樣式/互動的開發者（如 sanring-ui 團隊本身）
- **I want to** 依文件指引把 Composed Widget 原始碼複製進自己專案
- **So that** 我能看見並修改元件如何用 `CalendarEngine` 組裝而成，同時仍受 engine 既有無障礙/狀態機保證

### Story 4（黑盒安裝消費者，客製化格式）
- **As a** 需要非預設日期字串格式的開發者
- **I want to** 透過 `format` input 覆寫預設顯示格式
- **So that** Input 欄位顯示的字串符合我的地區/產品慣例，呼應憲法 I5「100% 可覆寫」不變量

**Acceptance Criteria 細節（Given/When/Then，2026-07-20 補齊並拍板）**：

- Story 1：Given 未提供 `format` input，when 元件初始化並選取某天，then Input 顯示 `DEFAULT_DATE_FORMAT_CONFIG` 格式化字串（見第 6 節），Overlay 內容符合 engine 既有 WAI-ARIA 屬性（沿用 `.claude/prds/date-picker.md` M4 驗收）
- Story 1：Given Input 取得焦點，when 尚未點擊任何日期，then Overlay 開啟且焦點落在網格內今天或已選取日期
- Story 2：Given `<sanring-date-range-picker>` 綁定 `[(selectedRange)]`，when 使用者完成起訖點選取，then `selectedRange` 更新為 `{ start, end }`，雙輸入框分別顯示對應格式化字串
- Story 2：Given Range Draft 進行中，when 使用者點擊 Overlay 外部，then 呼叫 `abortRangeDraft()`，Draft 回溯、Overlay 關閉，兩個輸入框維持中止前的舊值
- Story 3：Given 開發者依文件複製原始碼進自己專案，when 直接改動樣式/markup，then 元件行為（狀態機/鍵盤/a11y）不受影響，因為所有業務邏輯仍委派給 `@sanring/date-picker`（複製的只是外殼）
- Story 4：Given 消費端提供自訂 `format` input（例如 `dd/MM/yyyy`），when 元件渲染已選取日期，then Input 顯示字串符合自訂格式，且手動輸入符合該格式的字串可被 `parse` 正確解析回 `Date`

## 4a. 元件間共用邏輯（AI 分析，✅ 2026-07-20 隨整份草稿一併確認）

`DatePickerComponent`／`DateRangePickerComponent` 共用的「Input 格式化/解析、Overlay 開關、focus 管理」邏輯，實作時建議抽成內部（非 public API）的 composable/service，避免兩個元件各自重複一份 Overlay 生命週期管理程式碼；此為實作細節，不影響本節已定案的 Public API 形狀。

## 5. 技術選型 (Tech Stack)

| 決策項 | 選型 | 狀態 | 依據 |
|---|---|---|---|
| Popover/Overlay | Angular CDK Overlay | ✅ 拍板 | 使用者訪談確認 |
| CSS 方案（複製模式） | 沿用 Tailwind utility class 源碼（比照 demo app 現有寫法），複製進使用者專案後由使用者自己的 Tailwind pipeline 處理，可直接改 class | ✅ 拍板 | 使用者原話（T1） |
| CSS 方案（黑盒安裝模式） | 額外打包一份預編譯完成的獨立 CSS 檔（由同一份 Tailwind 源碼建置產出），不要求 consumer 專案本身有裝 Tailwind；透過 CSS Custom Properties 暴露可覆寫主題變數（顏色、間距等） | ✅ 拍板 | 使用者原話（T1） |
| 套件命名/結構 | 新獨立套件 `@sanring/date-picker-widget`（`dependencies` 指向 `@sanring/date-picker`） | ✅ 拍板 | 使用者訪談確認 |
| 複製模式發布方式 | 只提供文件/repo，讓使用者手動複製；**不**自建 CLI 工具（如 `npx` 指令） | ✅ 拍板 | 使用者訪談確認 |
| 消費框架/狀態管理/曆法運算 | 沿用 engine 已拍板技術棧：Angular ^22（Standalone + Signals）、date-fns | ✅ 沿用既有拍板（非本輪新決策） | `.claude/prds/date-picker.md` §5；本 PRD 未重新訪談，因為 Composed Widget 直接依賴 `@sanring/date-picker`，技術棧必然一致 |
| Monorepo 結構（新套件與既有 `projects/date-picker` 是否同一 workspace） | 加入現有 Angular workspace，新增 `projects/date-picker-widget` library | ✅ 拍板（2026-07-20） | 與 engine 共用 CI/tooling/changesets 基礎建設，開發追 engine 改動較方便 |
| 測試框架 | 沿用 Vitest（比照 engine PRD §5） | ✅ 拍板（2026-07-20） | 與 engine 一致，測試寫法/CI 設定可直接參考現有 `date-picker` 套件 |
| 套件版本/發布策略（是否與 engine 版本鎖定同步） | 獨立版號，`package.json` 以相依版本範圍約束 `@sanring/date-picker`，不強制隨 engine 每次發版同步 bump | ✅ 拍板（2026-07-20） | widget 與 engine 各自的變更頻率/穩定性訴求不同，鎖定同步版號會讓「widget 沒改也要跟著 bump」或反過來卡住彼此發版節奏 |

**被拒絕的替代方案（Popover/Input 實作來源，AI 分析・對話中經使用者確認方向）**：

曾考慮過兩種替代 Angular CDK Overlay 從零實作的方案，皆已排除：

- **反向依賴 `@sanring/ui`（把它的 Popover/Input 當 npm dependency）**——排除原因：會強迫任何只想用 `@sanring/date-picker-widget` 的第三方使用者，被迫連帶安裝整個 `@sanring/ui` 設計系統，直接違背本 PRD §1「獨立於 sanring/ui 之外也能用」的業務目標；也會讓套件關係變得自相矛盾（`sanring/ui` 依賴 engine，`date-picker-widget` 又反過來依賴 `sanring/ui`，形成混亂的雙向依賴故事）。
- **複製 `@sanring/ui` 現有 Popover/Input 原始碼**——排除原因：(1) 複製後會與 sanring/ui 原版脫鉤演化，日後 sanring/ui 修 a11y/CDK 相容性問題不會自動同步，形成雙份程式碼各自維護的長期負債；(2) sanring/ui 原版大概率帶有其專屬設計系統的樣式假設，需要額外拆除才能符合 Composed Widget「中性、可覆寫」的預設值承諾（憲法 I5），這個拆除成本未必比重新寫小；(3) 現況查核（demo app 僅 vendor 了 `@sanring/ui` 的 Button 與 lucide icons）顯示 sanring/ui 目前很可能根本還沒有 Popover/Input 元件可供複製。
- **結論**：Composed Widget 的 Popover/Overlay 一律直接建立在 `@angular/cdk` 之上（見上表已拍板項），不依賴、不複製 `@sanring/ui` 的既有實作；`@sanring/ui` 若要組裝自己的 DatePicker，走的是消費 `@sanring/date-picker`（engine）這條既有路徑，與 `date-picker-widget` 彼此獨立、互不依賴。

## 6. 資料模型 (Data Model)

> ✅ **2026-07-20 使用者確認拍板**。型別重用 engine 已定義的 Public Domain Types（`.claude/prds/date-picker.md` §6）。

```typescript
// --- 沿用 engine 既有型別（不重新定義，直接 import） ---
// CalendarDay, DateInterval, DateMatcher, DisabledInput, DateRange, CalendarLocale
// 見 .claude/prds/date-picker.md §6

// --- Composed Widget 新增型別（草案） ---

/** 日期字串格式設定（明確指定格式，不做自然語言猜測，呼應 §3 非範圍） */
export interface DateFormatConfig {
  /** 格式化 Date → 字串 */
  format: (date: Date) => string;
  /** 解析字串 → Date；解析失敗回傳 null，不拋錯、不猜測 */
  parse: (value: string) => Date | null;
}

/**
 * `format` input 未提供時的內建預設值（2026-07-20 拍板：提供合理預設，而非
 * 比照 `CALENDAR_LOCALE` 的 Zero-default 強制注入）。用 date-fns 實作，格式
 * 固定為 ISO `yyyy-MM-dd`——刻意不跟隨 `CalendarLocale` 動態變化，因為
 * locale 只決定「月曆怎麼顯示」，不隱含「Input 字串格式該用哪種」，兩者是
 * 兩個獨立維度；消費端若要在地化字串格式，透過覆寫 `format` input 自行決定。
 * 100% 可覆寫（憲法 I5），不影響 engine 的 Date 資料契約本身。
 */
export const DEFAULT_DATE_FORMAT_CONFIG: DateFormatConfig = {
  format: (date) => formatDate(date, 'yyyy-MM-dd'), // date-fns format()
  parse: (value) => {
    const parsed = parseDate(value, 'yyyy-MM-dd', new Date()); // date-fns parse()
    return isValid(parsed) ? parsed : null;
  },
};

export interface DatePickerWidgetTheme {
  /** CSS Custom Properties 覆寫（黑盒安裝模式使用，見第 5 節） */
  [cssVariable: `--sanring-dp-${string}`]: string;
}
```

## 7. API 契約 (API Contract)

> ✅ **2026-07-20 使用者確認拍板**。綁定風格用 `model()` 雙向綁定；engine 設定（disabled/locale/today 等）由 widget 自己包一層 Input 轉呼叫 engine，消費端不需碰 DI token；selector 命名維持草案。下方完整 Input/Output 清單依此四項決策展開，含 AI 自行判斷並經使用者確認的兩點（`monthsToDisplay` 預設 2、Overlay 錨定定位）。

### `DatePickerComponent`（selector `sanring-date-picker`，✅ 命名已拍板）

| Signal | 方向 | 型別 | 預設 | 說明 |
|---|---|---|---|---|
| `selectedDate` | `model()` 雙向 | `Date \| null` | `null` | 對應 engine `selectedDate`/`selectDate()`；`[(selectedDate)]` |
| `locale` | `input.required()` | `CalendarLocale` | 無（Zero-default，比照 engine `CALENDAR_LOCALE`） | 轉呼叫 engine 對應注入，未提供時 Angular 拋錯，不靜默套用預設 |
| `disabled` | `input()` | `DisabledInput \| undefined` | `undefined` | 轉呼叫 `CalendarEngine.setDisabled()` |
| `allowDeselect` | `input()` | `boolean` | `false` | 轉呼叫 `CalendarEngine.setAllowDeselect()`（沿用 engine 既有預設） |
| `today` | `input()` | `Date \| undefined` | 未提供時委由 engine 退回 `CALENDAR_TODAY`/`new Date()`（Decision 4） | 供測試/SSR 固定「今天」使用 |
| `format` | `input()` | `DateFormatConfig` | `DEFAULT_DATE_FORMAT_CONFIG`（見第 6 節） | Input 欄位格式化/解析設定 |
| `placeholder` | `input()` | `string` | `''` | Input 無值時顯示 |
| `openedChange` | `output()` | `boolean` | — | Overlay 開關狀態變化，供消費端做額外 UI 聯動（非必要監聽） |

### `DateRangePickerComponent`（selector `sanring-date-range-picker`，✅ 命名已拍板）

同 `DatePickerComponent` 的 `locale`/`disabled`/`today`/`format`/`placeholder`/`openedChange`，另外：

| Signal | 方向 | 型別 | 預設 | 說明 |
|---|---|---|---|---|
| `selectedRange` | `model()` 雙向 | `DateRange` | `EMPTY_RANGE`（沿用 engine 定義） | `[(selectedRange)]` |
| `rangeDayCountLimit` | `input()` | `RangeDayCountLimit \| undefined` | `undefined`（Zero-default，同 engine R8） | 轉呼叫 `CalendarEngine.setRangeDayCountLimit()` |
| `monthsToDisplay` | `input()` | `number` | `2` | 轉呼叫 `CalendarEngine.setMonthsToDisplay()`；Widget 層預設雙月並排（Engine 本身預設 1，此為 Widget UX 決定，非 engine 行為變更） |

### 共用型別

| 匯出符號 | 型別 | 用途 | 已知約束 |
|---|---|---|---|
| `DateFormatConfig` | Interface | 格式化/解析設定，見第 6 節 | 憲法 I5：預設值必須可覆寫 |
| `DEFAULT_DATE_FORMAT_CONFIG` | `DateFormatConfig` 常數 | `format` input 的內建預設值，見第 6 節 | 2026-07-20 拍板 |
| `DatePickerWidgetTheme` | Interface | CSS Custom Properties 型別提示，見第 6 節 | 非執行期強制，純 TS 型別輔助 |

### Overlay 定位（AI 決定，✅ 2026-07-20 使用者確認）

錨定到觸發用的 Input 元素（CDK `flexibleConnectedTo`），預設偏好 `bottom-start`，空間不足時自動翻轉 `top-start`；`hasBackdrop: true`，backdrop click／Range 模式下 Draft 中 backdrop click 呼叫 `abortRangeDraft()`（§3 已拍板範圍），Escape 鍵語意沿用 engine `CalendarGridDirective` 既有行為（Draft 中止／非 Draft 不消費事件，讓外層決定是否連動關閉 Overlay）。W0 骨架用的是 global-center 定位（純驗證 Overlay 生命週期），W1 開始才會換成這裡描述的錨定策略——這裡先寫下來避免 W1 動工時才臨時決定。

## 8. UI 流程 (UI Flow)

> ✅ **2026-07-20 使用者確認拍板**（原為 AI 草稿）。

| 狀態 | Single/Range 共通行為 |
|---|---|
| Loading | 元件本身無非同步資料載入（engine 純同步運算），此狀態預期不適用；若消費端外部注入非同步 locale/資料，由消費端自行處理，不在本元件狀態機內 |
| Empty | `selectedDate`/`selectedRange` 為 `null`，Input 顯示 placeholder，不顯示格式化字串 |
| Error | 使用者於 Input 手動輸入無法被 `DateFormatConfig.parse` 解析的字串時，顯示驗證錯誤狀態（非阻斷式，不清空既有 `selectedDate`） |
| Success | 已選取日期正確顯示於 Input，Overlay 正確關閉，聚焦回 Input |

TODO（小項，不擋 W1 開工）：實際 error 狀態的 ARIA live region 文案、視覺樣式細節——留待 W1 實作時一併決定，非架構性決策。

## 9. 風險與相依 (Risks & Dependencies)

> ✅ **2026-07-20 使用者確認拍板**（原為 AI 草稿）。

### 風險

| 風險 | 影響 | 緩解 |
|---|---|---|
| 雙 CSS 交付管線（Tailwind 源碼 + 預編譯 CSS）容易在版本迭代中失去同步，導致黑盒模式的預編譯樣式落後於複製模式的原始碼 | med | 建置流程中把預編譯 CSS 設為「從同一份源碼自動產出」的 CI 步驟，禁止手動維護兩份 |
| Angular CDK Overlay 的定位/scroll strategy 在極端 viewport（行動裝置、小螢幕）下可能與雙月並排網格（engine Decision 8）產生版面衝突 | med | demo app 需涵蓋行動裝置尺寸的雙月 Range Picker 視覺回歸測試 |
| 複製模式缺乏版本追蹤機制——使用者複製走原始碼後，engine 或 Composed Widget 後續的 bug fix/breaking change 無法自動通知到已複製的專案 | med | 文件明確聲明複製模式「所有權轉移」的取捨（使用者需自行追蹤上游變更），比照 shadcn 慣例作法 |
| 本 PRD 直接依賴 engine PRD §7 Public API Surface 的穩定性；若 engine 在 M5 之後才鎖定 1.0 API 承諾，Composed Widget 開發時程可能被 engine API 變動拖累 | med | 待 engine M5（npm 發布）完成、API 穩定後再啟動本 PRD 正式開發，見第 10 節里程碑前提 |

### 相依

- **上游**：`@sanring/date-picker`（engine，見 `.claude/prds/date-picker.md`）、`@angular/cdk`（Overlay）。
- **下游**：任何採用黑盒安裝或複製模式的 Angular 專案（含 sanring-ui 團隊自身，若採複製模式）。

## 10. 里程碑 (Milestones)

> ✅ **2026-07-20 使用者確認拍板**（原為 AI 草稿）。草案參考 engine PRD 的 Vertical Slice 排序原則。

| Milestone | 內容 | 驗收門檻（草案） |
|---|---|---|
| W0（實際完成 2026-07-20） | Workspace/套件骨架建置（`@sanring/date-picker-widget`，依賴 `@sanring/date-picker`）；CDK Overlay 基本串接 | ✅ 空殼元件可 build（`ng build date-picker-widget`）；✅ `DatePickerOverlayShellComponent` 完成 Overlay create/attach/dispose 開關驗證，5 個單元測試全綠；✅ `ng lint`/`prettier --check` 零違規；沿用既有 workspace（`projects/date-picker-widget`）與 Vitest，獨立版號 `0.1.0` 起跑（未發布） |
| W1 | Single 模式黑盒元件（`DatePickerComponent`）+ 預設 Tailwind 樣式 + CSS Custom Properties 主題變數 | demo 可安裝黑盒套件並完成單日選取 |
| W2 | Range 模式黑盒元件（`DateRangePickerComponent`）+ 雙月並排視覺 | demo 可完成區間選取，行為對齊 engine §4 Range 狀態機 |
| W3 | 複製模式文件與範例 repo（非 CLI 工具，純文件/repo 供手動複製） | 文件涵蓋複製步驟，複製後的元件可獨立運作 |
| W4 | a11y 驗收（沿用 engine 已建立的 axe-core/鍵盤驗收模式）+ npm 發布準備 | 符合 WAI-ARIA，`npm publish --dry-run` 通過 |

**已知前提**：engine PRD M5（npm 發布）完成、公開穩定 API 定案後，才具備條件供本產出物消費，W0 不預期在 engine M5 完成前啟動。

## 11. 後續追蹤 (Follow-ups)

> ✅ **2026-07-20 使用者確認拍板**（原為 AI 草稿）。

- ~~待團隊確定投入時程後，針對第 5 節標 TODO 的技術選型...與第 4/7/8 節細節，回頭走一輪聚焦訪談補齊~~ —— 已於 2026-07-20 完成，見第 12 節。
- 上線後追蹤：黑盒安裝與複製模式兩者的實際採用比例，作為未來是否投資 CLI 工具（比照 shadcn）的決策依據。

## 12. 開放問題 (Open Questions)

- [x] Monorepo 結構：新套件加入現有 Angular workspace（`projects/date-picker-widget`）還是獨立 repo？→ **加入現有 workspace**（2026-07-20 拍板，見第 5 節）
- [x] 測試框架是否沿用 Vitest？→ **是**（2026-07-20 拍板，見第 5 節）
- [x] 套件版本/發布策略是否與 engine 版本鎖定同步？→ **不鎖定，獨立版號**（2026-07-20 拍板，見第 5 節）
- [x] 元件綁定風格 → **`model()` 雙向綁定**（2026-07-20 拍板，見第 7 節）
- [x] engine 設定（disabled/locale/today）轉接方式 → **widget 自己包一層 Input**（2026-07-20 拍板，見第 7 節）
- [x] `DateFormatConfig` 是否有預設值 → **提供合理預設（ISO `yyyy-MM-dd`）**（2026-07-20 拍板，見第 6 節 `DEFAULT_DATE_FORMAT_CONFIG`）
- [x] 元件 selector 命名 → **維持 `sanring-date-picker`／`sanring-date-range-picker`**（2026-07-20 拍板，見第 7 節）
- [x] 第 4/4a/6/7/8/9/10/11 節整份草稿（含 AI 自行判斷的 Range `monthsToDisplay` 預設 2、Overlay 錨定定位兩點）→ **使用者已於 2026-07-20 確認拍板（「同意，先定案」）**，`status` 轉 `active`（見第 8 節 ARIA live region 文案為僅存的非架構性 TODO，留待 W1 實作時決定）
- [ ] `time-picker` / `week-picker` 是否排入未來 Milestone？可行性結論見第 3 節「已識別但未排入本輪範圍的功能」——兩者皆確認為 widget-only、不需憲法修訂，僅待業務需求觸發排程。

---

## 訪談紀錄審查清單

### ✅ 使用者親口答案（verbatim, T1）
- §1/§2 業務目標、使用者目標：完整原話（升級為獨立可安裝產品、雙消費模式互補、兩種開發者畫像）
- §3 範圍/非範圍：完整原話清單（Composed 元件、CDK Overlay、Input 格式化、雙發布模式；不做 NLP 解析、不做 Year/Decade、不內建 minDate/maxDate、不做 SSR 偵測、不做跨框架版本）
- §5 Overlay 選型（Angular CDK Overlay）、CSS 雙軌方案（複製模式沿用 Tailwind 源碼／黑盒模式預編譯 CSS + CSS Variables）、套件命名（`@sanring/date-picker-widget`）、複製模式發布方式（文件/repo 手動複製，不做 CLI）：皆為使用者原話直接拍板

### 🔷 AI 提案・使用者拍板（propose-and-ratify, T2）
- 訪談範圍決策：AI 提出「只要 PRD / 憲法也需要補充」二選一，使用者選擇「憲法也需要補充」（雙線並進），對應憲法 Decision 10
- shadcn 比喻澄清：AI 提出 4 個候選解讀，使用者選擇「借用消費模式當比喻，非字面 Vue 互通」並補充完整說明
- 「兩消費模式歸屬憲法或 PRD」：AI 提出 3 個候選，使用者選擇「兩邊都寫：憲法寫承諾，PRD 寫實現」
- 「R5 在複製模式下是否仍適用」：AI 提出 3 個候選，使用者選擇「仍然成立」
- （2026-07-20）Monorepo 結構：AI 提出「加入現有 workspace」vs「獨立 repo」，使用者選擇加入現有 workspace
- （2026-07-20）測試框架：AI 提出「沿用 Vitest」vs「其他框架」，使用者選擇沿用 Vitest
- （2026-07-20）套件版本策略：AI 提出「獨立版號」vs「鎖定同步 engine 版號」，使用者選擇獨立版號
- （2026-07-20）元件綁定風格：AI 提出「`model()` 雙向綁定」vs「Input+Output 分離」，使用者選擇 `model()`
- （2026-07-20）engine 設定轉接方式：AI 提出「widget 包一層 Input」vs「沿用 engine DI Token」，使用者選擇 widget 包一層 Input
- （2026-07-20）`DateFormatConfig` 預設值：AI 提出「提供合理預設」vs「Zero-default 強制注入」，使用者選擇提供合理預設
- （2026-07-20）元件 selector 命名：AI 提出「維持草案」vs「改用其他命名」，使用者選擇維持草案
- （2026-07-20）AI 依上述七項決策把 §4/§4a/§6/§7 展開成具體草稿（Acceptance Criteria、完整 Input/Output 清單、`DEFAULT_DATE_FORMAT_CONFIG` 實作、Overlay 錨定定位策略，含 AI 自行判斷的 `monthsToDisplay` 預設 2 兩點），連同既有 §8-11 AI 草稿一併整份提交使用者審查；使用者回應「同意，先定案」，整份草稿正式拍板。

### ✅ 原「AI 草稿」章節，已於 2026-07-20 使用者確認拍板
- §4 使用者故事與 Acceptance Criteria、§4a 元件間共用邏輯
- §6 資料模型（含 `DatePickerWidgetTheme`、`DEFAULT_DATE_FORMAT_CONFIG`）
- §7 API 契約（完整 Input/Output signal 清單、Overlay 定位策略）
- §8 UI 流程（ARIA live region 文案細節為僅存非架構性 TODO，見該節）
- §9 風險與相依
- §10 里程碑（W1-W4 內容/驗收門檻；W0 已實際完成並驗收）
- §11 後續追蹤

以上章節原為使用者在訪談中表示「先標 TODO，交回主 Claude 擬草稿」的內容；2026-07-20 這輪對話中，使用者先就七項會決定 API 形狀的關鍵問題逐一拍板（見上方 T2），AI 依拍板結果展開具體草稿後整份提交審查，使用者確認整份定案，`status` 因此由 `draft` 轉為 `active`。

### 📌 訪談中標 TODO 的章節（已於 2026-07-20 收斂，非仍待訪談）
- Monorepo 結構、測試框架、版本發布策略（第 5 節）— 使用者原未被問到，AI 主動識別為缺口列入 Open Questions；2026-07-20 由使用者拍板收斂，見上方 T2

### ❌ AI 確定未做
- 未在使用者拍板前，自行替 §4/§6-11 的 AI 草稿內容蓋章定案——2026-07-20 之前全程標記 🔶 待確認、frontmatter `status` 維持 `draft`，直到使用者當面確認整份草稿才轉 `active`
- 未替使用者假設 monorepo 結構、測試框架、版本策略、元件綁定風格、engine 設定轉接方式、格式預設值、selector 命名——七項皆先列出候選方案讓使用者選，未靜默套用任何預設
- 未把「shadcn/vue」比喻誤植為字面上與 Vue 生態系互通——訪談中主動要求使用者澄清後才記錄
- `monthsToDisplay` 預設 2、Overlay 錨定定位兩項雖為 AI 自行判斷（非原七題選項之一），仍主動點名向使用者說明理由並取得明確同意，未夾帶在其他內容中悄悄定案
