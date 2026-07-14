---
schema_version: 1
feature_id: date-picker-widget
feature_name: Sanring Composed DatePicker Widget (@sanring/date-picker-widget)
status: draft
owner: jack755051
last_updated: 2026-07-14
related_constitution: .claude/constitutions/date-picker.md
related_adrs: []
---

# PRD: Composed Widget — @sanring/date-picker-widget

> ⚠️ 此文件由 `/supervisor:prd date-picker-widget` 訪談模式產出。§1-3、§5 的技術選型欄位為使用者親口拍板（T1/T2 verbatim，見文末審查清單）；§4、§6-11 因使用者於訪談中明確表示「交回主 Claude 擬草稿」，內容為 **AI 草稿・尚未經使用者確認**，寫作時已標記 🔶，**不算拍板內容**，需要使用者審查後才能視為定案。`status` 維持 `draft`，待使用者審查完 AI 草稿章節後才由使用者親自拍板改 `active`。

## 1. 背景 (Background)

依憲法 `.claude/constitutions/date-picker.md` §7 Decision 9（兩層終局願景）與新增 Decision 10（雙消費模式承諾），本產品最終將產出兩層獨立產出物：

1. **Headless Engine 層**（現狀）—— 已有獨立 PRD：`.claude/prds/date-picker.md`（status: accepted，M0-M4 已完成，M5 npm 發布準備中）。
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

## 4. 使用者故事 (User Stories)

> 🔶 **AI 草稿，待使用者確認** —— 使用者訪談中表示此節交回主 Claude 擬草稿，以下內容尚未拍板。

### Story 1（黑盒安裝消費者）
- **As a** 想快速上線的 Angular 開發者
- **I want to** `npm install @sanring/date-picker-widget` 後，用最少 props 掛上 `<sanring-date-picker>`
- **So that** 不用自己組裝 Overlay/Input/Popover，就能得到符合 WAI-ARIA 的完整 DatePicker

### Story 2（黑盒安裝消費者，Range 模式）
- **As a** 需要日期區間選取的開發者
- **I want to** 用 `<sanring-date-range-picker>` 並綁定 `[(range)]`
- **So that** 取得雙輸入框 + 雙月並排 popover 的完整 RangePicker，行為與憲法 §4 Range Selection 狀態機一致

### Story 3（複製模式消費者）
- **As a** 需要深度客製化樣式/互動的開發者（如 sanring-ui 團隊本身）
- **I want to** 依文件指引把 Composed Widget 原始碼複製進自己專案
- **So that** 我能看見並修改元件如何用 `CalendarEngine` 組裝而成，同時仍受 engine 既有無障礙/狀態機保證

### Story 4（黑盒安裝消費者，客製化格式）
- **As a** 需要非預設日期字串格式的開發者
- **I want to** 透過 `format` input 覆寫預設顯示格式
- **So that** Input 欄位顯示的字串符合我的地區/產品慣例，呼應憲法 I5「100% 可覆寫」不變量

**Acceptance Criteria 細節（Given/When/Then）**：TODO，待使用者審查上述故事方向後，由主 Claude 或下一輪訪談補齊。

## 5. 技術選型 (Tech Stack)

| 決策項 | 選型 | 狀態 | 依據 |
|---|---|---|---|
| Popover/Overlay | Angular CDK Overlay | ✅ 拍板 | 使用者訪談確認 |
| CSS 方案（複製模式） | 沿用 Tailwind utility class 源碼（比照 demo app 現有寫法），複製進使用者專案後由使用者自己的 Tailwind pipeline 處理，可直接改 class | ✅ 拍板 | 使用者原話（T1） |
| CSS 方案（黑盒安裝模式） | 額外打包一份預編譯完成的獨立 CSS 檔（由同一份 Tailwind 源碼建置產出），不要求 consumer 專案本身有裝 Tailwind；透過 CSS Custom Properties 暴露可覆寫主題變數（顏色、間距等） | ✅ 拍板 | 使用者原話（T1） |
| 套件命名/結構 | 新獨立套件 `@sanring/date-picker-widget`（`dependencies` 指向 `@sanring/date-picker`） | ✅ 拍板 | 使用者訪談確認 |
| 複製模式發布方式 | 只提供文件/repo，讓使用者手動複製；**不**自建 CLI 工具（如 `npx` 指令） | ✅ 拍板 | 使用者訪談確認 |
| 消費框架/狀態管理/曆法運算 | 沿用 engine 已拍板技術棧：Angular ^22（Standalone + Signals）、date-fns | ✅ 沿用既有拍板（非本輪新決策） | `.claude/prds/date-picker.md` §5；本 PRD 未重新訪談，因為 Composed Widget 直接依賴 `@sanring/date-picker`，技術棧必然一致 |
| Monorepo 結構（新套件與既有 `projects/date-picker` 是否同一 workspace） | TODO | ❌ 未訪談 | 需另外拍板：新增 `projects/date-picker-widget` library 到現有 Angular workspace，或另開獨立 repo |
| 測試框架 | TODO | ❌ 未訪談 | 建議沿用既有 Vitest（見 engine PRD §5），但未經使用者確認，不視為拍板 |
| 套件版本/發布策略（是否與 engine 版本鎖定同步） | TODO | ❌ 未訪談 | — |

## 6. 資料模型 (Data Model)

> 🔶 **AI 草稿，待使用者確認** —— 以下型別草案重用 engine 已定義的 Public Domain Types（`.claude/prds/date-picker.md` §6），未經使用者逐條確認。

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

export interface DatePickerWidgetTheme {
  /** CSS Custom Properties 覆寫（黑盒安裝模式使用，見第 5 節） */
  [cssVariable: `--sanring-dp-${string}`]: string;
}
```

## 7. API 契約 (API Contract)

> 🔶 **AI 草稿，待使用者確認**。

| 匯出符號 | 型別 | 用途 | 已知約束 |
|---|---|---|---|
| `DatePickerComponent`（暫定選擇器 `sanring-date-picker`） | Standalone Component | Single 模式黑盒元件，內部組裝 `CalendarEngine` + CDK Overlay + Input | 內部實作只能呼叫 engine `.claude/prds/date-picker.md` §7 列出的 Public API Surface（憲法 R5） |
| `DateRangePickerComponent`（暫定選擇器 `sanring-date-range-picker`） | Standalone Component | Range 模式黑盒元件 | 同上 |
| `DateFormatConfig` | Interface | 格式化/解析設定，見第 6 節 | 憲法 I5：預設值必須可覆寫 |

TODO：完整 Input/Output signal 清單、預設 `DateFormatConfig` 內容、CDK Overlay 定位策略細節——待下一輪訪談或使用者直接補充。

## 8. UI 流程 (UI Flow)

> 🔶 **AI 草稿，待使用者確認**。

| 狀態 | Single/Range 共通行為 |
|---|---|
| Loading | 元件本身無非同步資料載入（engine 純同步運算），此狀態預期不適用；若消費端外部注入非同步 locale/資料，由消費端自行處理，不在本元件狀態機內 |
| Empty | `selectedDate`/`selectedRange` 為 `null`，Input 顯示 placeholder，不顯示格式化字串 |
| Error | 使用者於 Input 手動輸入無法被 `DateFormatConfig.parse` 解析的字串時，顯示驗證錯誤狀態（非阻斷式，不清空既有 `selectedDate`） |
| Success | 已選取日期正確顯示於 Input，Overlay 正確關閉，聚焦回 Input |

TODO：實際 error 狀態的 ARIA live region 文案、視覺樣式細節——待下一輪訪談。

## 9. 風險與相依 (Risks & Dependencies)

> 🔶 **AI 草稿，待使用者確認**。

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

> 🔶 **AI 草稿，待使用者確認**。草案參考 engine PRD 的 Vertical Slice 排序原則。

| Milestone | 內容 | 驗收門檻（草案） |
|---|---|---|
| W0 | Workspace/套件骨架建置（`@sanring/date-picker-widget`，依賴 `@sanring/date-picker`）；CDK Overlay 基本串接 | 空殼元件可 build，Overlay 開關可運作 |
| W1 | Single 模式黑盒元件（`DatePickerComponent`）+ 預設 Tailwind 樣式 + CSS Custom Properties 主題變數 | demo 可安裝黑盒套件並完成單日選取 |
| W2 | Range 模式黑盒元件（`DateRangePickerComponent`）+ 雙月並排視覺 | demo 可完成區間選取，行為對齊 engine §4 Range 狀態機 |
| W3 | 複製模式文件與範例 repo（非 CLI 工具，純文件/repo 供手動複製） | 文件涵蓋複製步驟，複製後的元件可獨立運作 |
| W4 | a11y 驗收（沿用 engine 已建立的 axe-core/鍵盤驗收模式）+ npm 發布準備 | 符合 WAI-ARIA，`npm publish --dry-run` 通過 |

**已知前提**：engine PRD M5（npm 發布）完成、公開穩定 API 定案後，才具備條件供本產出物消費，W0 不預期在 engine M5 完成前啟動。

## 11. 後續追蹤 (Follow-ups)

> 🔶 **AI 草稿，待使用者確認**。

- 待團隊確定投入時程後，針對第 5 節標 TODO 的技術選型（monorepo 結構、測試框架、版本發布策略）與第 4/7/8 節細節，回頭走一輪聚焦訪談補齊。
- 上線後追蹤：黑盒安裝與複製模式兩者的實際採用比例，作為未來是否投資 CLI 工具（比照 shadcn）的決策依據。

## 12. 開放問題 (Open Questions)

- [ ] Monorepo 結構：新套件加入現有 Angular workspace（`projects/date-picker-widget`）還是獨立 repo？（第 5 節，未訪談）
- [ ] 測試框架是否沿用 Vitest？（第 5 節，未訪談，AI 建議沿用但未拍板）
- [ ] 套件版本/發布策略是否與 engine 版本鎖定同步？（第 5 節，未訪談）
- [ ] User Stories 完整 Acceptance Criteria（第 4 節，AI 草稿待確認）
- [ ] API 契約完整 Input/Output signal 清單、預設 `DateFormatConfig` 內容（第 7 節，AI 草稿待確認）
- [ ] UI Flow error 狀態文案/樣式細節（第 8 節，AI 草稿待確認）
- [ ] 風險清單、里程碑分期（第 9-10 節，AI 草稿待確認）
- [ ] 何時啟動下一輪訪談補齊上述 TODO？取決於團隊資源投入時程。

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

### 🔶 AI 草稿・尚未經使用者確認（本 PRD 特有標記，非三層 provenance 正式 Tier，需額外標示）
- §4 使用者故事（含 Acceptance Criteria）
- §6 資料模型
- §7 API 契約
- §8 UI 流程
- §9 風險與相依
- §10 里程碑
- §11 後續追蹤

以上章節使用者在訪談中明確表示「先標 TODO，交回主 Claude 擬草稿」，AI 依已拍板的業務規則/技術選型推導出草稿，**但使用者尚未逐條確認**，不可視為拍板內容，`status` 因此維持 `draft` 不轉 `active`。

### 📌 訪談中標 TODO 的章節（未來待訪談，非本輪 AI 草稿範圍）
- Monorepo 結構、測試框架、版本發布策略（第 5 節）— 使用者未被問到，AI 主動識別為缺口並列入 Open Questions，未替使用者假設答案

### ❌ AI 確定未做
- 未替 §4/§6-11 的 AI 草稿內容拍板為最終決策——已明確標記 🔶 待確認，且 frontmatter `status` 維持 `draft`
- 未替使用者假設 monorepo 結構、測試框架、版本策略——標 TODO，未靜默套用任何預設（含未套用 engine PRD 的 Vitest 選擇，僅列為「AI 建議」而非拍板）
- 未把「shadcn/vue」比喻誤植為字面上與 Vue 生態系互通——訪談中主動要求使用者澄清後才記錄
