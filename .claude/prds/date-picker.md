---
schema_version: 1
feature_id: date-picker
feature_name: Sanring Headless Date/Calendar Engine (@sanring/date-picker)
status: accepted
owner: jack755051
last_updated: 2026-07-15  # Multi-dates Selection (Decision 11) delta 同步
related_constitution: .claude/constitutions/date-picker.md
related_adrs: []
---

# PRD: @sanring/date-picker — Headless Angular Date/Calendar Engine

## 1. 背景 (Background)

sanring-ui 及其服務的企業專案（含未來可能導入的 finance / booking 類場景）長期缺乏一個「可被拆解、可被信任」的日期選取核心。市場上主流 Angular 日曆元件（Angular Material Datepicker、PrimeNG Calendar 等）多半是「外觀 + 邏輯」高度耦合的成品元件，開發者若需要非標準佈局（例如把日曆直接嵌在 Dashboard、或加上自訂側邊欄），往往必須整包放棄、重新造輪子。

`date-picker` 專案的目標是反其道而行：只做「大腦」，不做「長相」。以 Angular Standalone + Signals 為底、date-fns 處理曆法數學，產出一個純邏輯、零 CSS、零 DOM 結構假設的 headless engine，讓上層開發者用 Tailwind CSS 自由組裝出符合自己產品線視覺的 Calendar / DatePicker / RangePicker。

本 PRD 是這個套件的**第一份 PRD**，`.claude/prds/` 目錄目前不存在任何既有文件，因此本文件視為全新產出（非 delta 更新），以 `.claude/constitutions/date-picker.md`（status: active）作為唯一業務規則來源，並收攏憲法中明確排除、留待 PRD 階段決定的技術實作內容。

專案現況（已偵測）：Angular ^22.0.0（Angular CLI ^22.0.6）、TypeScript ~6.0.2、rxjs ~7.8.0；`angular.json` 目前 `"projects": {}` 為空殼工作區，尚未建立任何 application 或 library 專案；`package.json` 尚未安裝 `date-fns`。這代表本 PRD 涵蓋的第一個技術任務是「從零建置 Angular library 工作區」，非在既有 library 上疊加功能。

## 2. 目標 (Goals)

- **業務目標**：讓 sanring-ui 與後續企業專案能在導入 `@sanring/date-picker` 後兩週內完成一個生產可用的 DatePicker 或 RangePicker，且不需要理解套件內部的曆法運算與狀態機細節（呼應憲法 §1 業務目的）；同一套引擎需同時涵蓋 Single、Range、Multi 三種選取模式，滿足如批次公休日設定、多日排班巡檢等業務場景（憲法 §4 Multi-dates Selection、Decision 11）。
- **技術目標**：
  - 核心引擎 100% headless：不綁定任何 DOM 結構或 CSS（落實 R1）。
  - 所有內部狀態以 Angular Signals 表達，禁止使用 RxJS Subject/BehaviorSubject 作為狀態容器（rxjs 僅保留給既有 Angular API 相容需求，如事件流轉接，不作為 state of truth）。
  - 42 天網格運算結果的陣列長度在單元測試中對任何合法 `viewDate` 輸入恆為 42（落實 I3，可自動化驗證的不變量）。
  - 核心套件 gzip 後 bundle size 有明確預算上限（建議 < 15 KB，date-fns 以 subpath tree-shakable import 為前提；最終數字待 M1 後以實測校準，不在此階段拍死）。
  - 鍵盤操作 100% 符合 WAI-ARIA Date Picker Dialog / Grid pattern，自動化 a11y 掃描（如 axe-core）於核心互動路徑零違規。
- **使用者目標**：
  - 終端使用者（含螢幕閱讀器/純鍵盤使用者）可在不使用滑鼠的情況下完成單日選取與區間選取的完整流程，且跨月操作不迷失焦點位置（落實 Decision 6）。
  - 上層開發者只需綁定少數幾個 Signal Input（`disabled`、`locale`）與監聽輸出 Signal，即可完成客製化外觀組裝，不需要碰觸內部狀態機程式碼。
  - 終端使用者在 Multi 選取模式下，可累積勾選任意數量、不連續的日期，並可隨時單獨移除或整批清空，且鍵盤/螢幕閱讀器操作與 Single/Range 模式共用同一套跨月導航與 A11y 保證（落實 Decision 11、I6）。

## 3. 範圍 (Scope) vs 非範圍 (Non-Goals)

### ✅ 範圍

- [ ] 單一日期選取核心引擎與狀態機（未選取 ⇄ 已選取，含可配置的「再次點選同日期」取消行為）— 對應憲法 §4 Single Selection
- [ ] 區間選取核心引擎與狀態機（穩定值 → Draft → 提交／中止回溯）— 對應憲法 §4 Range Selection、Decision 3
- [ ] 多選日期選取核心引擎與狀態機（Set 語意集合，無上限，toggle 即時移除，不受 `allowDeselect` 開關影響）— 對應憲法 §4 Multi-dates Selection、I6、Decision 11（M6）
- [ ] 42 天固定網格運算（`CalendarDay[]`，溢出日以相鄰月份補齊）— 對應 R3、I3
- [ ] 多月並排網格輸出（單一引擎實例可輸出 N 個月的網格陣列，共享同一組 `selectedRange`）— 對應 Decision 8
- [ ] Disabled Dates 統一匹配機制（單日 / 陣列 / 區間 / 自訂函式，可組合）— 對應 R4、Decision 5
- [ ] 鍵盤導航與跨月焦點自動轉移（含「禁用日仍可被聚焦」規則）— 對應 Decision 6
- [ ] 在地化注入機制（週起始日、月份/星期標籤、可選 date-fns Locale 物件）— 對應 I4、Decision 7
- [ ] 「今天」判定的外部注入基準與環境時間後備 — 對應 Decision 4、§9
- [ ] 清空選取（不連帶重置 viewDate）— 對應 §8
- [ ] Angular library 工作區建置（`ng generate library`、ng-packagr 打包、npm 可安裝的 `@sanring/date-picker` 產出）

### ❌ 非範圍（明確不做，避免 scope creep）

- ❌ 非公曆曆法系統（農曆、伊斯蘭曆、佛曆等）— 憲法 §1
- ❌ 任何字串解析／格式化（輸入輸出只認 `Date` 物件）— 憲法 §1
- ❌ 時區偏移計算與 UTC 強制轉換 — 憲法 §1
- ❌ Year View / Decade View 高階曆法檢視 — 憲法 §1、Decision 8。**這不是「延後到 v2.0」，而是本引擎服務範圍的永久排除項**：憲法明文「不在服務範圍內」，Decision 8 rationale 中「留在未來版本再做」是業務理由的說明性文字，並非交付承諾。若未來業務上真的需要，屬於憲法修訂（supersede）範疇，不在本 PRD 任何 Milestone 中排程（詳見第 10 節說明）。
- ❌ Hover / 選取中等過渡態的追蹤 — 憲法 §4 明訂純屬 CSS，引擎不管理
- ❌ 內建 `minDate`/`maxDate`/「不能選過去」等時效性業務規則 — 憲法 §9 Zero Opinion，100% 委派給外殼透過 Disabled Dates API 表達
- ❌ SSR Hydration 偵測或延遲補償邏輯 — 憲法 §9 明訂職責歸屬呼叫端
- ❌ 內建彈出容器（Popover/Overlay/Dropdown）與任何預設樣式 — 憲法 R1，這是 DatePicker 外殼的職責，不在本引擎範圍
  > **憲法 Decision 9 更新（2026-07-14 delta）**：此排除項僅止於「本 PRD（Headless Engine 套件）的範圍」，不代表整個產品線放棄 Popover/預設樣式功能——憲法已明確規劃第二個獨立產出物「Composed Widget 層」（見憲法 §6 Glossary、§7 Decision 9）承接這部分需求，其 PRD 尚未建立完整內容（骨架見 `.claude/prds/date-picker-widget.md`，status: draft）。**此性質與 Year/Decade View 的「永久排除」不同**：Year/Decade View 是憲法明文的服務範圍永久排除，Popover/預設樣式則是「規劃在另一份 PRD」，屬於範疇轉移，不是放棄。

> **non-goals 比 goals 更重要** —— 尤其 Year/Decade View 這條，因為業務語言上容易被誤讀成「先做 v1 再做 v2」，實際上憲法定義的是「permanent exclusion」，必須在此明確消歧。同理，Popover/Overlay/預設樣式這條也需要消歧，但方向相反：它不是「永久排除」，而是「規劃在另一份 PRD（Composed Widget 層，見上方憲法 Decision 9 附註）」，尚待團隊排程，不代表本引擎產品線放棄這塊功能。

## 4. 使用者故事 (User Stories)

### Story 1: 上層開發者組裝單一日期選取器

- **As a** 上層開發者（UI Developer）
- **I want to** 注入 `CalendarEngine` 並綁定 `CalendarGridDirective` 到我自己的 DOM 結構
- **So that** 我能用 Tailwind CSS 自由設計外觀，同時取得正確的 42 天網格與選取狀態

**Acceptance Criteria**:
- [ ] Given `viewDate` 設為 2026-02（28天月份），when 引擎計算網格，then 輸出陣列長度恆為 42（I3），前後溢出日正確標記 `isCurrentMonth: false`
- [ ] Given 使用者點選已選取的同一天，且開發者未開啟取消選取設定，when 觸發選取事件，then `selectedDate` 維持不變（憲法 §4 合法轉換：僅在允許時才可取消）
- [ ] Given 呼叫 `clearSelection()`，when 執行完畢，then `selectedDate` 變 `null` 且 `viewDate` 完全不變（§8）

### Story 2: 上層開發者組裝雙月並排的區間選取器

- **As a** 上層開發者
- **I want to** 設定 `monthsToDisplay = 2` 並監聽 `selectedRange`
- **So that** 我能做出機票/飯店預訂常見的雙月並排 RangePicker

**Acceptance Criteria**:
- [ ] Given 使用者已選起點（Draft 狀態），when 使用者按下 Escape，then `selectedRange` 回到中止前的舊值、`isDraftActive` 變 false（Decision 3）
- [ ] Given Draft 狀態存在，when 使用者關閉並重新打開面板（元件重新掛載或 popover 重開），then 不存在任何殘留的起點草稿（禁止「幽靈草稿」，§4）
- [ ] Given 兩個月視圖共享同一組狀態，when 使用者在第二月選終點，then 兩個月視圖的 `CalendarDay.isInRange` 同步更新

### Story 3: 終端使用者（鍵盤/螢幕閱讀器）跨月導航

- **As a** 終端使用者（依賴純鍵盤或螢幕閱讀器）
- **I want to** 用方向鍵持續移動焦點超出當月邊界
- **So that** 焦點能自動翻頁並落在下個月對應日期，即使該日被禁用

**Acceptance Criteria**:
- [ ] Given 焦點在月底最後一天，when 按右方向鍵，then `viewDate` 前進一個月，`focusedDate` 落在新視圖第 1 天（Decision 6）
- [ ] Given 焦點轉移到的目標日期被 Disabled Matcher 命中，when 焦點抵達，then `isFocused: true` 且 `isDisabled: true` 同時成立（焦點不受禁用阻擋，僅選取行為受阻，符合 I2「Selected ∩ Disabled = Ø」但不影響 Focused）
- [ ] Given 使用者對禁用日按下 Enter/Space，when 觸發選取，then 選取被拒絕、`selectedDate` 不變（I2）

### Story 4: 上層開發者設定複合式禁用規則

- **As a** 上層開發者
- **I want to** 同時傳入「週末不可選」的自訂函式與「特定公休區間」的 interval
- **So that** 不需要自己合併多種禁用邏輯

**Acceptance Criteria**:
- [ ] Given `disabled = [weekendMatcherFn, { from: holidayStart, to: holidayEnd }]`，when 引擎判斷某天，then 只要命中陣列中任一 matcher 即視為禁用（OR 聯集，R4/Decision 5）
- [ ] Given 某天同時符合 `isSelected` 邏輯與 `disabled` matcher（例如開發者事後動態調整 disabled 清單覆蓋既有選取），when 引擎重新計算，then 系統必須阻止該衝突狀態持續存在（I2 恆等式優先於既有選取，具體覆蓋策略見 Open Questions）

### Story 5: 上層開發者注入在地化設定

- **As a** 上層開發者
- **I want to** 透過 DI Token 注入「週一為一週起始日」與繁中月份/星期標籤
- **So that** 日曆網格排列與標籤符合台灣使用者習慣，且不需要引擎內建任何語系判斷

**Acceptance Criteria**:
- [ ] Given 應用未提供 `CALENDAR_LOCALE` provider，when 元件初始化，then Angular DI 拋出明確錯誤（刻意無預設值，落實 I4「100% 由外部注入」，而非靜默套用某個語言慣例）
- [ ] Given `weekStartsOn: 1`，when 引擎計算 42 天網格，then 每週第一欄恆為週一

### Story 6: 上層開發者處理 SSR 的「今天」一致性

- **As a** 上層開發者（企業級 SSR 專案）
- **I want to** 在 bootstrap 時注入固定的伺服器渲染時間作為 `CALENDAR_TODAY`
- **So that** 避免 hydration 後「今天」標記因客戶端/伺服器時間差而跳動

**Acceptance Criteria**:
- [ ] Given 未提供 `CALENDAR_TODAY` provider，when 引擎判斷 `isToday`，then 退回 `new Date()`（Decision 4 後備順序）
- [ ] Given 提供了自訂 `CALENDAR_TODAY` factory，when 引擎判斷 `isToday`，then 100% 信任注入值，不做任何 SSR 偵測或延遲補償（§9 引擎邊界免責聲明）

### Story 7: 上層開發者組裝多選日期選取器（Multi-dates Selection，M6）

- **As a** 上層開發者
- **I want to** 設定 `setSelectionMode('multi')` 並監聽 `selectedDates`
- **So that** 我能做出如「批次公休日設定」、「員工排班多日勾選」等允許使用者累積勾選任意數量、不連續日期的介面

**Acceptance Criteria**:
- [ ] Given `selectionMode = 'multi'` 且尚未選取任何日期，when 使用者點擊某未選中日期，then 該日期加入 `selectedDates` 集合，`isSelected` 變 `true` 且集合長度 +1（憲法 §4 Multi-dates Selection）
- [ ] Given 某日期已存在於 `selectedDates` 中，when 使用者再次點擊同一天，then 該日期立即從集合移除，且此行為不受 `allowDeselect` 開關影響（Decision 11：toggle 與 Single 模式的開關脫鉤）
- [ ] Given `selectedDates` 內已有多筆日期，when 呼叫 `clearSelection()`，then `selectedDates` 整個歸零為空陣列，`viewDate` 不受影響（§8 語意延伸至 Multi）
- [ ] Given `selectedDates` 內已有一筆日期，when 呼叫 `removeDate(date)` 傳入集合中存在的該日期，then 該日期從集合移除；若傳入集合中不存在的日期，then 為 no-op；若在非 multi 模式下呼叫 `removeDate()`，then 拋出錯誤（已拍板，見 Open Questions）

### Story 8: 終端使用者鍵盤操作與模式切換重置（Multi-dates Selection，M6）

- **As a** 終端使用者（依賴鍵盤/螢幕閱讀器）及上層開發者
- **I want to** 用方向鍵移動焦點、Enter/Space 累積或移除選取，並在模式間切換
- **So that** 不需要滑鼠也能完成多選批次選取，且切換選取模式時狀態乾淨重置，不殘留混淆的選取值

**Acceptance Criteria**:
- [ ] Given 焦點在某未選日期，when 按下 Enter/Space，then 該日加入 `selectedDates`，焦點維持在原日期不移動
- [ ] Given 多選集合中有 N 筆日期分散在不同月份，when 引擎重新計算 `monthGrids`，then 每個月份網格中對應的 `CalendarDay.isSelected` 正確反映集合成員，且各內層陣列長度仍恆為 42（I3 於 multi 模式下原樣成立）
- [ ] Given 目前處於 single 模式且已選取一個日期，when 呼叫 `setSelectionMode('multi')`，then `selectedDate` 變 `null` 且 `selectedDates` 為空陣列，反之從 multi 切回 single/range 亦同（憲法 §4 模式切換重置語意延伸、Decision 11）

## 5. 技術選型 (Tech Stack)

> 本專案為純前端 headless npm 套件，無後端/DB/Auth/監控層；下表依專案實況調整樣板欄位。

| 層 | 選型 | 理由 |
|---|---|---|
| 消費框架 | Angular ^22.0.0（Standalone Components + Signals） | 憲法明確指定的技術棧；現有 workspace 已鎖定此版本 |
| 核心語言 | TypeScript ~6.0.2 | 沿用現有 `tsconfig.json`（`strictInjectionParameters`、`strictInputAccessModifiers` 等已開啟） |
| 曆法運算 | date-fns（建議 `^4.x`，全程使用 subpath import 如 `date-fns/addMonths` 以利 tree-shaking），列為 `dependencies`（非 `peerDependencies`，已拍板） | 憲法明確指定；避免手刻閏年/月份邊界運算重造輪子且風險高；套件自帶開箱即用優先於避免重複打包 |
| 狀態管理 | Angular Signals，component-scoped `Injectable`（非 `providedIn: 'root'`，非 NgRx） | 憲法指定 Signals；每個 Calendar 實例需要獨立狀態（同頁可能有多個 picker），component-level provider 天然隔離；狀態機規模小，NgRx 屬過度工程 |
| 套件結構 | 單一包 `@sanring/date-picker`（已拍板，不拆 `/core` subpath） | 現階段範圍不大，拆分無實質收益；未來若需非 Angular headless 版本再重新評估 |
| 套件打包 | ng-packagr（透過 `ng generate library`），輸出 Angular Package Format (APF) | Angular 官方標準函式庫格式，確保 `npm install @sanring/date-picker` 後可被任意 Angular ^22 專案消費 |
| 測試框架 | Vitest（已拍板） | 執行速度快、與 esbuild-based 建置系統相容；**M0 實作時發現 Angular CLI 22 的 `@angular/build:unit-test` builder 已將 `runner: "vitest"` 設為預設值**，`ng generate library` 產出的 workspace 已直接可用，無需手動整合（修正 PRD 原先「非 schematics 一鍵產出」的假設） |
| Backend / DB / Cache / Auth | 不適用 | 本套件無伺服器端邏輯，純前端狀態機 + 曆法運算 |
| Deploy | Public npm registry，`@sanring` org scope，版本自 `0.1.0` 起跑（已拍板） | 開放給其他專案與社群使用；先以 0.x 標示尚未達到穩定 API 承諾，累積實戰後再發 1.0.0 |
| 監控 | 不適用於套件本身；建議消費端（sanring-ui / demo app）導入 bundle size CI gate（如 `size-limit`） | 防止後續迭代讓 headless 引擎悄悄膨脹，違背 R1 的輕量承諾 |

> **Multi-dates Selection 技術選型確認（2026-07-15 delta）**：本次新增不引入任何新技術棧決策——沿用既有 Angular Signals 與 date-fns（`isSameDay`）已足夠支撐 Multi 模式運算；集合去重容器拍板採用 TypeScript 原生 `Map<string, Date>`（非新套件，見 §6 技術判斷），既有選型表格無需變動。

## 6. 資料模型 (Data Model)

> 本套件無資料庫層，本節以 **Domain Model / Public 型別契約** 取代 SQL Schema，並沿用 DDD 語彙描述 Signals 狀態邊界（而非資料庫 Aggregate）。

### Schema 變動

不適用（無資料庫）。

### 核心公開型別 (Public Domain Types)

```typescript
// --- 網格最小單位（憲法 §6 Glossary: CalendarDay） ---
export interface CalendarDay {
  date: Date;               // 完整 Date 物件，時間分量歸零（R2：viewDate 維度歸零延伸到每個網格細胞）
  isCurrentMonth: boolean;  // 是否屬於當前月（R3 溢出補齊判斷依據）
  isToday: boolean;         // 依 CALENDAR_TODAY 注入基準判定（Decision 4）
  isSelected: boolean;      // single 模式命中 selectedDate；range 模式命中 selectedRange 端點；multi 模式命中 selectedDates 集合中任一日期（I6，M6）
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;       // 落在 selectedRange 或 Draft 暫定範圍內；Draft 期間（起點已選、終點未定）以 focusedDate 作為暫定終點即時反映 preview range（已拍板，見 Open Questions #5 決議）
  isDisabled: boolean;      // 命中 DisabledInput matcher（I2：isSelected && isDisabled 恆為 false）
  isFocused: boolean;       // 當前鍵盤焦點落點（跨月焦點轉移落點，Decision 6）
}

// --- Disabled Dates 統一匹配型別（R4 / Decision 5） ---
export interface DateInterval {
  from: Date;
  to: Date;
}

export type DateMatcher =
  | Date
  | Date[]
  | DateInterval
  | ((date: Date) => boolean);

/** 可傳入單一 matcher 或 matcher 陣列（陣列內以 OR 聯集判斷） */
export type DisabledInput = DateMatcher | DateMatcher[];

// --- Range 選取穩定值（§4 Range Selection） ---
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

// --- 在地化注入（I4 / Decision 7） ---
export interface CalendarLocale {
  /** 一週起始日，對應 date-fns startOfWeek() 的 options.weekStartsOn；0=Sunday...6=Saturday */
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** 7 個星期標籤，index 對齊 JS Date.getDay()（0=Sun） */
  weekdayLabels: readonly string[];
  /** 12 個月份標籤，index 0 = 一月 */
  monthLabels: readonly string[];
  /** 選用：date-fns 官方 Locale 物件（如 zhTW），供未來格式化相關委派使用；引擎核心網格運算只依賴 weekStartsOn */
  dateFnsLocale?: import('date-fns').Locale;
}
```

### Multi 選取容器與唯一性（I6 落地判斷，M6，2026-07-15 delta）

憲法 I6 要求 Multi 選取集合語意上為 Set（無重複），但 JavaScript 原生 `Set<Date>` 無法滿足此需求——`Set` 的成員相等性比較是物件參照相等（reference equality），兩個代表同一天、但物件實例不同的 `Date`（例如兩次獨立呼叫 `new Date(2026, 6, 14)`）會被視為不同成員，無法達成「同一天只能存在一次」的業務語意。

**拍板方案**：內部以 `Map<string, Date>` 儲存：
- **Key**：以日期粒度正規化的字串（沿用引擎既有 `dayMs(date)` 輔助函式的正規化邏輯轉字串），僅作唯一性比對與 O(1) 查找用途。
- **Value**：呼叫端傳入 `selectDate()` 的**原始 Date 物件**，不重新建構、不歸零時分秒——確保 R2「selectedDate 保留時分秒」的承諾在 Multi 模式下同樣成立（若改用字串反解回 Date，會強制變成午夜 00:00:00，破壞 R2）。
- 對外 `selectedDates: Signal<Date[]>` 由 `Array.from(map.values())` 衍生，`Map` 本身不出現在 Public API Surface，維持與 `_selectedDate`/`_selectedRange` 相同的私有 signal + 唯讀衍生 signal 封裝慣例。
- 此設計同時解決 `CalendarDay.isSelected`（multi 模式）的效能問題：42×N 個網格細胞逐一判斷是否命中選取集合時，Map key 查找是 O(1)；若改用 `Date[]` + 逐一 `isSameDay()` 比對則是 O(集合大小)，在 Decision 11 已拍板「無上限」的前提下，網格重新計算的總成本會是 O(網格數 × 集合大小)，選取數量一大即有明顯效能風險（另見 §9 風險）。

### 狀態邊界（借用 DDD 語彙，描述 Signals-based 狀態隔離）

- **Aggregate Root**：`CalendarEngine` 實例狀態。每個 Calendar/DatePicker 元件透過 component-level `providers: [CalendarEngine]` 各自持有一份，避免多個 picker 共享單例污染彼此的 `viewDate`/`selectedDate`/`selectedDates`（落實 R1 的獨立可組裝性）。
- **內部 Entity**：`CalendarDay`——依 `viewDate` 變動即時重新計算（`computed()`），不具跨渲染週期的持久身份，每次渲染都是新建物件。
- **Value Object**：`DateInterval`、`DateRange`、`CalendarLocale`、`DisabledInput`——皆為不可變值物件，任何變更即建立新物件而非原地修改，符合 Signals 的 immutable update pattern。
- **跨 Aggregate 連結**：多月並排（Decision 8）由**單一** `CalendarEngine` 實例管理（`monthsToDisplay` input），內部輸出 `monthGrids: Signal<CalendarDay[][]>`（每個內層陣列長度恆為 42），共享同一組 `selectedRange`，而非由多個獨立引擎實例各自持有再手動同步——避免雙月網格的選取狀態不同步。唯一允許跨 Aggregate 共享的是透過 `CALENDAR_LOCALE` / `CALENDAR_TODAY` 兩個 DI Token 廣播的全域設定，且皆為 read-only 注入，不可被子元件回寫。

## 7. API 契約 (API Contract)

> 本套件無 HTTP API，本節以 **Public TypeScript API Surface（匯出符號與其簽章）** 取代 REST Endpoint 清單。

| 匯出符號 | 型別 | 用途 | 對應憲法條款 |
|---|---|---|---|
| `CalendarEngine` | Injectable class（component-scoped） | 核心狀態機：管理 `viewDate`/`selectedDate`/`selectedRange`/`selectedDates`/draft/`focusedDate`，暴露 Signals 與操作方法 | R1, R2, I1, I2, I3, I6, Decision 11 |
| `CalendarGridDirective`（selector `sanringCalendarGrid`，`exportAs: 'sanringCalendarGrid'`） | Standalone Directive | 將 `CalendarEngine` 的網格與鍵盤導覽掛載到消費端自訂 DOM，不渲染任何樣式或結構 | R1, R3, Decision 6 |
| `CalendarDay` | Interface | 見第 6 節 | R3, I2, I3, I6, Glossary |
| `DateMatcher` / `DisabledInput` / `DateInterval` | Type/Interface | 禁用日期統一匹配型別 | R4, Decision 5 |
| `DateRange` | Interface | Range 選取的穩定提交值 | §4 Range Selection |
| `CalendarLocale` | Interface | 在地化注入資料結構 | I4, Decision 7 |
| `CALENDAR_LOCALE` | `InjectionToken<CalendarLocale>`（**無預設 factory**） | 強制外部注入在地化設定；未提供時 Angular DI 拋錯，刻意不給任何語言/地區預設 | I4, Decision 7 |
| `CALENDAR_TODAY` | `InjectionToken<() => Date>`（預設 factory `() => () => new Date()`，`providedIn: 'root'`） | 「今天」判定的外部注入基準；未提供才退回環境時間 | Decision 4, §9 |

`CalendarEngine` 主要成員（**2026-07-15 delta：改為反映 M0-M4 實際落地的 API 形狀**，見下方說明第一條）：

```typescript
export class CalendarEngine {
  // --- 私有狀態（外部僅能透過下方 setter 方法變更，不透過 input()） ---
  // viewDate / selectionMode / monthsToDisplay / selectedDate / selectedRange /
  // selectedDates / draftStart / focusedDate / allowDeselect / locale / disabled

  // --- 唯讀輸出 Signal ---
  readonly monthGrids: Signal<CalendarDay[][]>;   // 每個內層陣列長度恆為 42（I3，multi 模式下原樣成立）
  readonly selectedDate: Signal<Date | null>;     // single 模式
  readonly selectedRange: Signal<DateRange>;      // range 模式，Draft 未提交前恆為舊值（不可變）
  readonly selectedDates: Signal<Date[]>;         // M6 新增，multi 模式；衍生自內部 Map<string, Date>（見 §6 技術判斷），非 multi 模式時恆為空陣列
  readonly isDraftActive: Signal<boolean>;
  readonly focusedDate: Signal<Date | null>;

  // --- 操作方法（setter 命名慣例：set + 屬性名） ---
  setViewDate(date: Date): void;                  // I1：內部保證永遠合法，非法輸入退回今天
  setSelectionMode(mode: 'single' | 'range' | 'multi'): void;  // M6 新增 'multi'（Decision 11）；切換模式一律重置 selectedDate/selectedRange/selectedDates/draftStart，不保留跨模式資料
  setMonthsToDisplay(n: number): void;             // Decision 8：多月並排，最小值 clamp 為 1
  setAllowDeselect(allow: boolean): void;          // 憲法 §4：是否允許點選同日期取消選取；僅影響 single 模式，multi 模式的 toggle 永遠可移除，不受此設定控制（Decision 11）
  setLocale(locale: CalendarLocale | undefined): void;   // 若未設定，退回 inject(CALENDAR_LOCALE)（Decision 7）
  setDisabled(input: DisabledInput | undefined): void;   // R4 / Decision 5；命中既有選取時主動清空該選取（I2 恆等式優先，見 M2 驗收門檻）
  nextMonth(): void;
  prevMonth(): void;
  selectDate(date: Date): void;                    // 依 selectionMode 分派；multi 模式對集合中已存在的日期永遠觸發移除（不受 allowDeselect 影響），對未存在的日期加入集合；命中 disabled 一律 no-op（I2）
  removeDate(date: Date): void;                     // M6 新增，multi 模式專用：程式化移除單一日期（例如選取清單 UI 的「移除」按鈕，非 click-toggle 路徑）；日期不在集合中則 no-op；於非 multi 模式呼叫時拋出錯誤（已拍板，見 Open Questions）
  clearSelection(): void;                           // §8：清空當前模式的選取值（single: selectedDate → null；range: selectedRange → 空值 + draft 銷毀；multi: selectedDates → 整個歸零為空陣列），不動 viewDate；語意延伸至 multi 模式（Decision 11）
  abortRangeDraft(): void;                          // Decision 3：僅重置 draft signal，selectedRange 從未被 Draft 寫入過，故無需額外回溯邏輯
  moveFocus(direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageup' | 'pagedown'): void; // Decision 6
  isDateDisabled(date: Date): boolean;              // 供外殼或測試直接查詢
}
```

**關鍵設計說明（呼應憲法設計意圖）**：

- **（2026-07-15 delta，修正既有落差）**：本節原草稿誤用 signal-based `input()` 描述 `CalendarEngine` 的設定介面；M0-M4 實際落地時已改採「私有 signal + `set*()` setter 方法」的模式（例如 `setSelectionMode()`、`setAllowDeselect()`），因為 `CalendarEngine` 是透過 `Injectable` 注入使用、非直接作為 Component 的 `@Input()` 綁定對象，`input()` 語法在非 Component context 不適用。上方程式碼區塊已同步修正，此後本節以實際程式碼（`projects/date-picker/src/lib/calendar-engine.ts`）為準；憲法 Decision 5/7 提到的 `@Input() disabled`、`@Input() locale` 屬於**示意用語**，不代表任何特定綁定語法。
- `abortRangeDraft()` 的實作不需要「快照後回溯」的邏輯，因為 Draft 狀態設計上**從未寫入** `selectedRange`（獨立的 `draftStart` signal），中止時只需清空 Draft signal，`selectedRange` 自然保持中止前的舊值不變——這直接對應憲法 §4/§8「回溯到中止前的 selectedRange 舊值」的語意，且實作上更不容易出錯（無 mutable 回溯路徑）。
- `CALENDAR_LOCALE` 刻意不提供 `providedIn: 'root'` 預設值，這是對憲法 I4「不得內建任何特定語言/地區曆法慣例」最嚴格的落地方式：與其提供一個「看似中性、實際上偷渡了某個語言慣例」的預設語系，不如讓 DI 系統在缺少注入時直接拋錯，逼迫消費端明確做出在地化選擇。
- 模式切換（`setSelectionMode()` 進出 multi）時，比照既有 single⇄range 切換行為，一律重置 `selectedDate`/`selectedRange`/`selectedDates`/Draft 狀態，不嘗試保留跨模式可轉換的資料（憲法 §4 Multi-dates Selection 備註、Decision 11）。

### 鍵盤互動對應表（WAI-ARIA Date Picker Dialog / Grid Pattern，Decision 6 落地）

| 按鍵 | 行為 |
|---|---|
| `←/→/↑/↓` | 焦點移動一天/一週；抵達視圖邊界持續移動時觸發跨月自動翻頁（Decision 6） |
| `Home` / `End` | 焦點移至當週第一天/最後一天 |
| `PageUp` / `PageDown` | `viewDate` 前進/後退一個月，焦點落在對應邏輯日 |
| `Enter` / `Space` | 觸發 `selectDate(focusedDate)`；若命中 disabled 則 no-op（I2） |
| `Escape` | Range 模式下觸發 `abortRangeDraft()`（Decision 3）；single/multi 模式無定義行為，交由外殼決定（如關閉 popover） |

## 8. UI 流程 (UI Flow)

> 本套件無內建 UI（R1），因此本節改以「消費端組裝範例」與「demo/playground app 的驗收狀態」呈現，取代樣板中「頁面四態」的假設。

建議在同一個 Angular workspace 內新增 `projects/demo`（application project，用 Tailwind CSS）作為：
1. 開發期間的視覺化除錯環境
2. 手動 QA / 未來自動化 E2E 測試的宿主
3. README 範例程式碼的來源（避免文件與實作漂移）

Demo app 至少需涵蓋以下四種代表性組裝狀態（對應樣板「四態」精神，轉譯為 headless 套件的驗收場景）：

- **單月單選（預設狀態）** — 驗證 R2/R3/I1/I3 基本網格與選取行為
- **雙月並排區間選取（含大量 Disabled 規則）** — 驗證 Decision 8 多月網格 + R4 複合 matcher + Decision 3 中止回溯
- **鍵盤/純鍵盤操作的跨月導航** — 驗證 Decision 6，需搭配螢幕閱讀器手動驗收（NVDA/VoiceOver 至少一種）
- **SSR 模擬（固定注入 `CALENDAR_TODAY`）** — 驗證 Decision 4，確保 hydration 前後「今天」標記不跳動
- **多選日期（Multi，M6）** — 驗證 I6/Decision 11：累積選取任意數量不連續日期、toggle 即時移除、`clearSelection()` 整批歸零、`removeDate()` 移除單一項

對應 Figma / design assets：目前無此需求（headless 套件無需自有視覺稿；design 交付模式為 `assets_only`，且範圍僅止於 demo app 的最小可用樣式，非正式產品設計稿）。

`data-testid` 預埋清單：由於引擎本身不渲染 DOM，`data-testid` 屬於 **demo app 消費端**的職責，非套件本身 API 的一部分。建議 demo app 至少埋設：
- 網格容器：`calendar-grid`
- 單一日期細胞：`calendar-day-{yyyy-MM-dd}`
- 上一月/下一月按鈕：`calendar-prev-month` / `calendar-next-month`
- 清空選取按鈕：`calendar-clear-selection`

## 9. 風險與相依 (Risks & Dependencies)

### 風險

| 風險 | 影響 | 緩解 |
|---|---|---|
| Angular 22 屬極新版本，Signals 相關 API（如 `input()`、`linkedSignal` 等）仍可能有非 stable 的邊角案例 | med | 鎖定 CLI/Core 版本、關注 Angular changelog、避免使用 experimental/devPreview 標記的 API |
| 目前 workspace 是空殼（`angular.json` 無任何 project），library 骨架建置屬於 M0 前置任務，若拖延將阻塞所有後續開發 | high | 將 M0（workspace bootstrap）列為第一個里程碑並優先排程，不與功能開發並行 |
| date-fns 版本與 Angular 22 esbuild-based 建置系統的 tree-shaking 相容性未經實測 | med | M1 完成後立即量測實際 bundle size，若不理想需重新評估 import 策略或改用更輕量的曆法運算子集 |
| 跨月焦點轉移 + 螢幕閱讀器的實際互動體驗需要真人測試，自動化 a11y 掃描（如 axe-core）無法涵蓋所有情境 | med | M4 排入至少一輪人工 NVDA/VoiceOver 驗收，不完全依賴自動化工具 |
| Range Draft 狀態的「中止」偵測（Escape/Click Outside）依賴外殼正確呼叫 `abortRangeDraft()`；若消費端忘記綁定，會違反憲法 §4 禁止「幽靈草稿」的規則 | med | README 明確標示此為**必須**綁定的整合點，並在 demo app 提供標準範例；未來可評估是否提供 CDK Overlay 整合的 recipe（非本 PRD 範圍） |
| npm 發布目標（public/private registry）與版本策略尚未拍板，可能拖延 M5 | low | 見 Open Questions #4，建議儘早與 owner 確認 |
| 憲法新增 R5（Composed Widget 層無特權、僅能透過 public API 消費 engine）意味著本套件 §7 定義的 Public API Surface 一旦確立即是「唯一」對外承諾邊界，未來即使是同團隊發布的 Composed Widget 層也不得繞過；若目前 API 設計有缺口導致「組裝一個開箱即用 DatePicker」所需的掛勾點（如 focus trap、ARIA 屬性綁定）無法透過現有 public API 滿足，屆時只能靠正式擴充 public API，不能開後門 | med | M5 npm 發布定案前，重新檢視 §7 API Surface 是否已完整涵蓋未來 Composed Widget 組裝所需的所有掛勾點；必要時在鎖定 1.0 API 承諾前補齊 |
| Multi 選取集合缺乏數量上限（Decision 11 已拍板無上限），大量選取（例如使用者一次勾選一兩百天不重複日期）會拉高 `monthGrids` 重新計算時 `CalendarDay.isSelected` 判斷成本，以及消費端渲染大量選取視覺標記的效能負擔 | med | 內部以 `Map<string, Date>` 做 O(1) 成員查找（見 §6 技術判斷），避免 O(集合大小) 線性掃描；demo app 建議加入極端案例（如百餘筆選取）的效能驗收；若實測仍有瓶頸，優化責任下放給消費端 UI 層（如虛擬滾動），不下放給 engine 承擔渲染責任（呼應 R1） |
| JavaScript 原生 `Date` 物件不支援結構相等比較（僅參照相等），若 Multi 容器誤用原生 `Set<Date>` 或以物件參照做唯一性判斷，會產生「同一天被視為不同成員」的隱性 bug，直接違反憲法 I6 | med | 已於 §6 明確排除 `Set<Date>` 方案，內部一律以日期正規化字串作為唯一性比對 key（`Map<string, Date>`）；單元測試需覆蓋「同一天、不同物件實例、不同時分秒」三種變體皆被正確去重的案例 |

### 相依

- **上游**：`date-fns`（npm 套件，版本待定，見 Open Questions #1）；Angular CLI `ng generate library` schematics（決定實際的 testing/build 骨架）。
- **下游**：sanring-ui 元件庫（預期消費此套件組裝出正式的 `<DatePicker>`/`<RangePicker>` 元件）；未來任何企業專案若需要日期選取功能，皆為潛在下游消費者；規劃中的 Composed Widget 層（憲法 §7 Decision 9，PRD 骨架見 `.claude/prds/date-picker-widget.md`）是本套件最重要的「第一方下游消費者」，依憲法 R5 不享有任何存取 engine 內部未公開實作的特權，一律比照第三方消費者透過 §7 Public API Surface 消費。

## 10. 里程碑 (Milestones)

> 依 Vertical Slice 原則排序：M1 是端到端可運作的最小 tracer bullet（單月單選 + 在地化 + 基本鍵盤），而非先做完所有底層再做上層。**Year/Decade View 不排入任何里程碑**——這是憲法 §1/Decision 8 的永久排除項，不是延後項；若未來業務需要，須先回頭修訂憲法（supersede），非本 PRD 可單方決定的交付順序問題。

| Milestone | 預計完成 | 內容 | 驗收門檻 |
|---|---|---|---|
| M0 | 2026-07-19（實際完成 2026-07-13） | Workspace bootstrap：`ng generate library`（單一包 `@sanring/date-picker`）、ng-packagr 設定（`allowedNonPeerDependencies: ["date-fns"]`）、npm package.json 定案（name/version/date-fns dependency）、Vitest 驗證（Angular 22 schematics 預設即用）、`ng add @angular-eslint/schematics` + Prettier format script | ✅ `ng build date-picker` 成功產出 dist；✅ `npm pack --dry-run` 產物結構正確（`@sanring/date-picker@0.1.0`，FESM2022 + d.ts）；✅ `ng test date-picker --no-watch` 占位測試通過；✅ `ng lint date-picker` 零違規 |
| M1 | 2026-08-02（實際完成 2026-07-13） | Tracer bullet：`CalendarEngine` 核心 + `CALENDAR_LOCALE` 注入 + 42 天單月網格 + single selection 狀態機 + `CalendarGridDirective` 基本鍵盤（不含跨月轉移） | ✅ 單元測試涵蓋 R2/R3/I1/I2/I3；✅ demo app 可 render 單月月曆並完成單日選取/清空（含 `@sanring/ui` token/Button 整合示範外殼可自由替換） |
| M2 | 2026-08-16（實際完成 2026-07-13） | Disabled Dates 統一 matcher（R4/Decision 5，`isDateMatch`/`isDisabledByAny` 純函式 + `CalendarEngine.setDisabled()`）+ `isDateDisabled()`；I2 衝突策略拍板為「主動清空」（`setDisabled()` 命中既有選取時直接銷毀，不遮蔽，呼應 Decision 3 無幽靈狀態原則） | ✅ I2 恆等式測試全綠（`selectDate()` 擋禁用日 + `setDisabled()` 清空衝突選取雙向驗證）；✅ demo app 展示週末禁用（函式）+ 公休區間禁用（`DateInterval`）疊加 + 固定「今天」注入（`CALENDAR_TODAY`，模擬 SSR） |
| M3 | 2026-08-30 | Range 狀態機（Draft/提交/中止回溯，Decision 3）+ `clearSelection()`（§8） | §4/§8/Decision 3 狀態轉換測試全綠，含 Escape/Click Outside 模擬情境 |
| M4 | 2026-09-13 | 多月並排網格（`monthsToDisplay`，Decision 8，滑動視窗翻頁）+ 跨月焦點自動轉移（Decision 6）+ 完整 WAI-ARIA 屬性 + axe-core 導入 CI 作為 merge gate（已拍板） | Decision 6/8 驗收測試綠；axe-core 自動掃描零違規且已接入 CI merge gate；至少一輪人工螢幕閱讀器驗收 |
| M5 | 2026-09-27 | npm 發布準備：README/API 文件、CHANGELOG、`0.1.0` 版本號定案、bundle size 實測、demo app 作為長期回歸測試基準、Public npm `@sanring` org 發布設定 | README 涵蓋全部 Public API Surface；bundle size 符合預算；`npm publish --dry-run` 通過 |
| M6 | TODO（待 owner 排定，建議排在 M5 npm 發布收尾之後或緊接其後——理由：M5 是既有 Single/Range API 首次公開發布的收斂點，Multi 屬於新增公開 API surface，混在一起會讓「哪些 API 屬於 0.1.0 穩定承諾」的邊界模糊；待 0.1.0 發布定案後再疊加 Multi，可讓版本號/changelog 清楚標示這是一次新增能力的演進） | Multi-dates 選取核心引擎與狀態機（Set 語意、toggle 移除、無上限）+ `selectedDates` 輸出 signal + `removeDate()` + `setSelectionMode()` 擴充支援 `'multi'` + `clearSelection()` 語意延伸 + `CalendarDay.isSelected` 多選命中判斷；同步修正 §7 既有 PRD-vs-code 落差（`input()` 草案 → 實際 setter 方法） — 對應憲法 §4 Multi-dates Selection、I6、Decision 11 | I6/Decision 11 狀態轉換測試全綠（含「同一天不同物件實例」去重測試、無上限累積測試、toggle 不受 allowDeselect 影響測試、`removeDate()` 於非 multi 模式拋錯測試）；demo app 新增多選日期組裝範例（含移除單一項與整批清空兩種操作示範）；I2/I3 於 multi 模式下的既有測試套件需擴充覆蓋（恆等式原樣成立） |

## 11. 後續追蹤 (Follow-ups)

- 上線後 2 週：追蹤 sanring-ui 團隊實際導入時遇到的整合摩擦（尤其 Range Draft 中止綁定、CALENDAR_LOCALE 強制注入是否造成初次使用門檻過高）
- 30 天：實測 bundle size 是否隨版本迭代悄悄膨脹（size-limit CI gate 是否需要正式導入）
- 90 天：檢視是否有業務需求指向 Year/Decade View；若有，先發起憲法修訂討論（supersede 現有 `.claude/constitutions/date-picker.md` §1），不可直接在 PRD 層級擴張範圍
- 持續：a11y 驗收隨 Angular/date-fns 版本升級需重新跑一輪人工測試，避免版本升級悄悄破壞鍵盤行為
- Composed Widget 層（憲法 §7 Decision 9）目前僅有 PRD 骨架佔位（`.claude/prds/date-picker-widget.md`，status: draft），尚未訪談技術選型；待團隊確定投入時程後，透過 `/supervisor:prd date-picker-widget` 走訪談模式正式建立內容，不在本 PRD 任何既有 Milestone 中排程。
- Multi 模式（M6）上線後追蹤：實際選取數量分佈（是否常態出現百筆以上選取），驗證 §9 效能風險緩解（`Map<string, Date>` O(1) 查找）是否足夠，是否需要進一步優化；Composed Widget 骨架 PRD 的既有 Story 1/2 只規劃 single/range 變體，未涵蓋 Multi，待該 PRD 下一輪訪談時一併評估是否需要 `<sanring-date-multi-picker>` 或等效組裝範例。

## 12. 開放問題 (Open Questions)

> 本輪（M0-M5 對應）8 條 TODO 已於 2026-07-13 由 owner（jack755051）全數拍板完成。以下 5 條為 2026-07-15 Multi-dates Selection 憲法 delta（Decision 11）同步更新本 PRD 時新增，已於同一輪對話中由 owner 拍板完成；僅 M6 排程日期仍待補。

- [x] `date-fns` 依賴類型 → **`dependencies`**（開箱即用優先，見第 5 節技術選型）
- [x] Library 命名/scope/entry point → **單一包 `@sanring/date-picker`**，不拆 `/core` subpath（見第 5 節）
- [x] 測試框架 → **Vitest**（M0 手動整合，非 schematics 預設，見第 5 節）
- [x] npm 發布目標與版本策略 → **Public npm `@sanring` org scope，`0.1.0` 起跑**（見第 5 節）
- [x] `CalendarDay.isInRange` 在 Draft 期間是否即時反映暫定終點 → **要**，以 `focusedDate` 作為暫定終點即時反映 preview range（見第 6 節資料模型）
- [x] 多月並排翻頁粒度 → **滑動視窗**，`nextMonth()`/`prevMonth()` 永遠位移 1 個月（維持 PRD 原暫定方案，確認為最終決策）
- [x] `CalendarLocale.dateFnsLocale` 是否強制耦合 date-fns Locale 物件 → **選填**，不強制要求消費端安裝 `date-fns/locale/*`
- [x] a11y 自動化測試（axe-core）是否納入 CI merge gate → **是**，M4 起納入 merge gate（見第 10 節里程碑）
- [x] `CalendarEngine.selectedDates` 輸出 signal 命名 → **維持 `selectedDates`**（沿用 `selectedDate`/`selectedRange` 單複數延伸慣例，見第 7 節）
- [x] Multi 模式「移除單一日期」方法命名 → **`removeDate()`**（見第 7 節）
- [x] `removeDate()` 在非 multi 模式下被呼叫時的行為 → **拋錯**（明確回報開發者用錯方法，見第 7 節）
- [x] Multi 選取容器內部實作 → **`Map<string, Date>`**（O(1) 查找 + 保留原始 Date 精度，見第 6 節技術判斷）
- [x] 既有 PRD-vs-code drift（§7 草案曾用 `input()`，實際程式碼已是 setter 方法）→ **藉 M6 一併修正 §7 全文反映實際 API**（見第 7 節已更新）
- [ ] M6 里程碑實際排程日期（預計完成時間）→ 待 owner 排定，建議晚於或緊接 M5 收尾（見第 10 節）
