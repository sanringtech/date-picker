---
schema_version: 1
constitution_id: date-picker
constitution_name: Sanring Headless Date/Calendar Engine
status: active           # draft | active | superseded | archived
owner: jack755051
last_updated: 2026-07-12
scope: date-picker-engine     # Angular headless calendar/date-picker 核心引擎
related_prds: [date-picker]
supersedes:
---

> ⚠️ 此文件由 `/supervisor:constitution` 訪談模式產出，內容逐字來自業務 owner 訪談問答（T1 verbatim），未經使用者選/改的 AI 提案一律未寫入。詳見文末「訪談紀錄審查清單」。

# Business Constitution: Sanring Headless Date/Calendar Engine

> 這份文件**不是 PRD**（不寫 user story / tech stack / API / 頁面 / 部署）。
> 這份文件**不是 Charter**（不寫範圍邊界 / 分批計畫 / 停止條件）。
> 它**只回答一件事**：**這個業務領域的規矩是什麼**——即使換掉所有技術棧、改寫所有程式，這些規則仍然成立。

---

## 1. 業務目的 (Business Purpose)

- **這個領域服務的對象**：打造一個專為 sanring-ui 及其企業專案服務的 Angular Headless 日曆核心引擎，服務對象是「上層開發者」（消費此套件的工程師）以及「終端使用者」（含依賴輔助技術者）。
- **這個領域要解決的核心問題**：將複雜的曆法運算、狀態機與無障礙導航完全封裝，讓上層開發者能以 Tailwind CSS 自由且無痛地組合出具備極致彈性的 Calendar 與 DatePicker 元件。
- **明確不在這個領域內的問題**：
  - **非公曆曆法系統**：本引擎專注於標準公曆（Gregorian calendar），明確排除農曆、伊斯蘭曆、佛曆等多重曆法的轉換與渲染支援。
  - **字串解析與格式化 (String Parsing & Formatting)**：本引擎的輸入與輸出只接受且只吐出標準 JavaScript `Date` 物件。將後端 `YYYY-MM-DD` 字串轉為 `Date`，或將選取結果格式化顯示在 Input 上的職責，明確歸屬於外層應用與狀態容器，引擎內部不包裝任何字串處理邏輯。
  - **跨時區動態換算**：引擎不負責時區偏移量的計算。引擎永遠信任並依賴傳入 `Date` 物件所帶有的本地系統時區（Local Timezone），不做任何 UTC 強制轉換。
  - **年份 / 十年層級高階曆法檢視**（AI 提案・使用者拍板延伸，T2，見 §7 Decision 8）：Year View（12 個月總覽）與 Decade View 的曆法運算與狀態機不在本引擎服務範圍內。多月並排網格輸出（同時渲染多個相鄰月份）則明確在服務範圍內，屬於業務剛需（如 Range 模式下常見的雙月並排場景）。

## 2. 領域角色 (Domain Roles)

| 角色 | 業務職責（這個角色「做什麼業務動作」）|
|---|---|
| 上層開發者 (UI Developer) | 消費本 Headless 套件的工程師。關注 API 的可預期性、狀態的解耦，以及能否輕易覆寫 CSS 樣式與注入多國語系設定。 |
| 終端使用者 (End User) | 直接與網格互動的人。不僅是「點擊滑鼠的人」，更是「依賴輔助技術（螢幕閱讀器、純鍵盤）的人」。終端使用者的互動模式直接驅動了引擎內部的「焦點轉移（Focus Management）」狀態。 |

## 3. 核心業務規則 (Core Business Rules)

- **R1**：引擎與外殼嚴格解耦：底層只提供純視覺的網格積木（Calendar），彈出容器（DatePicker）由應用層自行組合。
- **R2**：時間零點與全維度分離：網格基準（viewDate）強制歸零，使用者選取值（selectedDate）保留時分秒。
- **R3**：網格視覺恆定：無論月份天數，強制固定輸出 42 天（6 週）的網格陣列，溢出日期以相鄰月份補齊。
- **R4**（AI 提案・使用者拍板延伸，T2，見 §7 Decision 5）：禁用日期（Disabled Dates）的判斷邏輯必須能同時支援單日、日期陣列、日期區間、以及自訂條件函式四種輸入形式，以涵蓋業務上任意複雜度的禁用規則。

## 4. 業務狀態機 (State Machines)

### 單一日期選取 (Single Selection)

```
[未選取 Unselected] ──觸發有效選取──> [已選取 Selected]
                                          │
                                   觸發相同日期
                                          │
                     依開發者配置 → 切換回 [未選取]（允許取消）
                                    或 → 強制維持 [已選取]
```

**合法轉換**：
- 未選取 → 已選取：觸發有效選取
- 已選取 → 未選取：觸發相同日期，且開發者配置允許取消

**備註**：
- 鍵盤游標的「聚焦 / Focused」是一個獨立運行的平行狀態機，與「選取 / Selected」狀態互不干涉。
- 引擎不追蹤「Hover」或「選取中」等過渡態（這些純屬 CSS 視覺呈現）。

**跨月焦點轉移（Cross-month Focus Transfer，AI 提案・使用者拍板延伸，T2，見 §7 Decision 6）**：
- 當鍵盤焦點於視圖邊界（月初/月底）持續往邊界外方向移動時，引擎必須自動觸發翻頁（`viewDate` 前進/後退一個月），且焦點自動落於新視圖中對應的邏輯日期（例如月底往右移動 → 焦點落在下個月 1 號）。
- 即使該日期被標記為禁用，焦點依然移動到該日——「禁用」只影響「是否可選取」，不阻擋焦點抵達。

### 區間選擇 (Range Selection)

```
[穩定狀態：selectedRange 舊值] ──選擇起點──> [Draft：起點已定，終點未定]
[Draft：起點已定，終點未定] ──選擇終點──> [穩定狀態：selectedRange 新值提交]
[Draft：起點已定，終點未定] ──中止(Escape/Click Outside)──> [穩定狀態：回溯到中止前的 selectedRange 舊值，Draft 銷毀]
```

**合法轉換**：
- 穩定狀態 → Draft（起點已定，終點未定）：選擇起點
- Draft → 穩定狀態（selectedRange 新值提交）：選擇終點
- Draft → 穩定狀態（回溯舊值）：中止事件（Escape / Click Outside）

**禁止轉換**：
- ❌ Draft 狀態保留為跨開關的「幽靈草稿」：中止事件必須立即銷毀 Draft，不允許下次打開面板時接續未完成的起點選擇。

**業務理由**（AI 提案・使用者拍板，T2，見 §7 Decision 3）：區間選擇在業務語意上是一個不可分割的單一交易（起點+終點）。若在完成整筆交易前中止，交易視為從未發生，系統必須立刻銷毀草稿並回溯到上一個穩定狀態；保留草稿會產生無法預期的「幽靈狀態」，對 UX 有極大傷害。

## 5. 不可變約束 (Invariants)

- **I1（ViewDate Validity）**：無論系統處於初始化、清空選取或發生異常錯誤時，推導網格的基準點 `viewDate` 必須永遠是一個合法存在的 `Date` 物件（預設退回「今天」或合法邊界），絕對不允許成為 `null` 或 `Invalid Date`。
- **I2（Selection-Disabled Mutually Exclusive）**：在任何系統穩定狀態下，被標記為「選中（Selected）」的日期集合與「禁用（Disabled）」的日期集合，其交集永遠為空（`Selected ∩ Disabled = Ø` 恆成立）。
- **I3（Grid Size Constancy）**：無論 `viewDate` 落在何年何月，引擎運算輸出的 `CalendarDay` 陣列長度永遠嚴格等於 42，不存在任何動態增減的合法路徑。
- **I4（Localization Neutrality，AI 提案・使用者拍板延伸，T2，見 §7 Decision 7）**：引擎不得在內部寫死任何特定語言或地區的曆法慣例（例如一週起始日、月份/星期名稱）；所有在地化相關的顯示與計算規則必須 100% 由外部注入的語系設定決定。

## 6. 業務術語表 (Glossary)

| 術語 | 定義 | 不是 |
|---|---|---|
| `viewDate`（視圖基準日） | 系統內部用來決定「當前網格要渲染哪一個月份」的錨點日期。它的時間分量在引擎運算時會被強制歸零。是「眼睛正在看哪個月」。 | `selectedDate`（「手指實際選了哪一天」）。兩者在底層完全解耦。 |
| `selectedDate`（最終選取值） | 使用者實際選定、且將作為表單值拋出給外部系統的資料實體。會完整保留使用者（或外部系統）賦予的時、分、秒分量。 | `viewDate` |
| `CalendarDay`（日曆細胞） | 42 天網格陣列中的最小運算與渲染單位，封裝了特定日期在當前視圖下的業務狀態（例如：是否為當月、是否為今天、是否處於被禁用狀態）。 | JavaScript 原生的 `Date` 物件——原生 `Date` 只是客觀的時間點，`CalendarDay` 是帶有「UI 與業務上下文」的狀態載體。 |
| `Headless Engine`（無頭引擎） | 僅負責封裝狀態機、曆法數學運算與無障礙鍵盤導航，完全不綁定任何 DOM 結構（如 Popover）或視覺樣式（CSS）的純粹邏輯層。它不提供「長相」，只提供「大腦」。 | 傳統 UI 元件庫的 `<DatePicker>` 元件（外觀由開發者在應用層套用 Tailwind CSS 組合而成）。 |

## 7. 業務決策 (Business Decisions)

### Decision 1: R1「引擎與外殼嚴格解耦」

- **決策**：底層只提供純視覺的網格積木，彈出容器由應用層自行組合。
- **理由**：為了確保極致的場景適應性（Adaptability）。如果不強制解耦（例如將日曆網格硬綁定在下拉式 Popover 內），當企業產品線需要「直接嵌在 Dashboard 上的靜態日曆儀表板」，或是需要在日曆旁新增「快捷選項側邊欄」時，開發者將無法拆解這個黑盒子，最終只能無奈放棄套件並重新造輪子。

### Decision 2: R3「強制 42 天網格」

- **決策**：無論月份天數，強制固定輸出 42 天（6 週）的網格陣列。
- **理由**：為了絕對防禦佈局偏移（Layout Shift）。如果不固定網格數量，遇到只需 4 週或 5 週的月份時，日曆高度會劇烈縮水；當使用者快速點擊「下個月」尋找特定日期時，整個日曆彈出框會忽高忽低瘋狂跳動，不僅造成視覺疲勞，更極易導致滑鼠點錯日期或誤觸外部關閉區域，帶來毀滅性的 UX 體驗。

### Decision 3: Range Selection 中斷策略採用「回溯 Discard」（AI 提案・使用者拍板，T2）

- **決策**：Range 模式起點已選、終點未選時若中止（Escape / Click Outside），整組草稿作廢，回溯到中止前的 `selectedRange` 舊值。
- **理由**：區間選擇在業務語意上是一個不可分割的單一交易；未完成的交易視為從未發生。保留草稿（候選選項 B）會產生無法預期的「幽靈狀態」，導致下次打開日曆時出現不明所以的藍色起點，對 UX 有極大傷害。
- **替代方案（拒絕）**：選項 B「保留草稿，下次接續」——拒絕原因：產生幽靈狀態；選項 C「委派外殼裁決」——本次未採用（使用者直接拍板選項 A）。

### Decision 4:「今天」判定以外部注入基準優先、環境時間為後備（AI 提案・使用者拍板，T2，修正 Q11 原始規則）

- **決策**：系統對「今天」的認定，最高優先級為外殼透過 API / 依賴注入所傳入的絕對時間基準；未提供時才退回讀取執行環境的 `new Date()`。引擎不實作任何 SSR 偵測或 Hydration 延遲補償。
- **理由**：Hydration 錯誤不可容忍（淘汰候選選項 A 的容忍短暫跳動），刻意延遲渲染會導致畫面閃爍（淘汰候選選項 B）。此設計維持引擎 Zero Opinion 的純潔性，同時給予外殼絕對控制權，兼顧「即插即用」的便利性與嚴苛 SSR 企業需求的架構逃生口。
- **替代方案（拒絕）**：選項 A「本地優先、允許短暫過渡」——拒絕原因：Hydration 跳動不可接受；選項 B「絕對一致、禁止跳動」——拒絕原因：延遲渲染會造成畫面閃爍。
- **註記**：此決策修正了 Q11 原始拍板的「Fallback Priority」規則（原規則未區分外部注入基準與環境時間的優先順序），已於 §9 更新為最終版本。

### Decision 5: Disabled Dates 判斷邏輯採「統一匹配」原則（AI 提案・使用者拍板延伸，T2）

- **決策**：禁用日期判斷必須同時支援單日、日期陣列、日期區間、以及自訂條件函式四種輸入形式（見 §3 R4）。
- **理由**：能提供極致的開發者體驗——無論是簡單的「週末不可選」還是複雜的「某幾個特定區間不可選」，外殼都能用最直覺的格式傳給引擎。
- **註記**：具體的統一型別命名與 API 綁定方式（如 `Matcher` 型別、`@Input() disabled`）屬技術實作細節，留待 PRD 階段定義，不寫入憲法。

### Decision 6: 跨月焦點轉移採「自動翻頁 + 落於邏輯日」（AI 提案・使用者拍板延伸，T2）

- **決策**：焦點走到視圖邊界並持續往外移動時，自動觸發翻頁，焦點落在新視圖對應的邏輯日期（即使該日被標記為禁用）（見 §4）。
- **理由**：最符合無障礙標準（WAI-ARIA），螢幕閱讀器能正確報讀日期與其禁用狀態，且不會造成視障使用者的空間迷向。

### Decision 7: 在地化承諾採「完全外部注入」原則（AI 提案・使用者拍板延伸，T2）

- **決策**：引擎不內建任何語言/地區的曆法慣例，一週起始日、月份/星期標籤等在地化規則完全由外部注入決定（見 §5 I4）。
- **理由**：核心演算法已依賴外部日期運算能力，直接注入語系設定是最純粹的做法，完美解決「一週第一天是星期幾」的問題，也符合元件隨插即用、不依賴全域設定的解耦精神。
- **註記**：具體注入機制（`@Input() locale` 綁定、語系物件型別）屬技術實作細節，留待 PRD 階段定義，不寫入憲法。

### Decision 8: 多月網格輸出納入服務範圍，年 / 十年檢視排除（AI 提案・使用者拍板延伸，T2）

- **決策**：多月並排網格輸出在服務範圍內；年份 / 十年層級高階曆法檢視不在服務範圍內（見 §1 Out of Scope）。
- **理由**：多月並排在 Range 模式中是絕對的剛需（例如機票、飯店預訂場景），對 Headless 引擎而言多算一個月的陣列成本極低；年份/十年檢視會引入另一套完全不同的狀態機，留在未來版本再做最穩妥。
- **註記**：「多算幾個月的網格陣列」與「年/十年檢視另一套狀態機」是本引擎服務範圍的業務邊界，已寫入 §1；但「哪個版本交付」屬於 PRD Milestones/Phase 規劃範疇，不寫入憲法。

## 8. 取消 / 沖銷 / 退回的規矩 (Reversal Semantics)

- **清空選取（Clear Selection）**：屬於完全合法的業務事件。系統必須允許使用者（或外部 API）觸發清空指令，這會將 `selectedDate` 重置為 `null` 或未選取狀態。**核心約束**：清空選取絕對不能連帶重置 `viewDate`（即日曆畫面不能因為清空而擅自跳回預設月份或今天）。
- **Range 模式的中止（Escape / Click Outside）**：整組草稿（Draft）作廢，回溯到中止前的 `selectedRange` 舊值（完全不變）。完整狀態機與拍板理由見 §4 Range Selection、§7 Decision 3。

## 9. 時間 / 期間 / 截止規矩 (Temporal Rules)

- **「今天」的判定優先順序（AI 提案・使用者拍板，T2，修正自 Q11 原始 Fallback Priority 規則，見 §7 Decision 4）**：
  - 系統對「今天」的認定，最高優先級為外殼透過 API / 依賴注入（Injection Token）所傳入的絕對時間基準。引擎將 100% 信任此基準來渲染「今天」的視覺標記。
  - 後備機制：只有在外殼未明確提供此基準時，引擎才會退而求其次，讀取當前執行環境的 `new Date()` 作為「今天」。
  - 引擎邊界（免責聲明）：引擎內部絕對不實作任何 SSR 偵測或 Hydration 延遲補償機制。解決伺服器與客戶端時區不一致的職責，完全歸屬於呼叫端（應用程式開發者）。
- **預設邊界的「零立場」（Zero Opinion）**：本引擎內建零業務立場。預設情況下，時間軸是無限的，沒有「不能選取過去」或「不能選取週末」的內建規則。系統將所有的時效性判斷與邊界限制（如 `minDate`、`maxDate`）100% 委派給外殼透過 Disabled Dates API 來決定。引擎只負責執行「判斷該日期是否落在傳入的禁用規則中」，不擁有自己的時間邊界意志。

## 10. 開放問題 (Open Questions)

本輪訪談的 6 條 TODO 已全數拍板完成，無剩餘未決業務規則。

> ✅ 已拍板解決：
> - Range Selection 中斷策略 → §4 / §7 Decision 3 / §8
> - SSR/Hydration「今天」時區衝突 → §7 Decision 4 / §9
> - Disabled Dates 判斷邏輯 → §3 R4 / §7 Decision 5
> - 跨月焦點轉移 (A11y) → §4 / §7 Decision 6
> - 在地化 (i18n) 承諾 → §5 I4 / §7 Decision 7
> - 多月聯動與高階視圖服務範圍 → §1 Out of Scope / §7 Decision 8
>
> 若後續實作或 PRD 階段浮現新的業務規則問題，回來這個章節新增 TODO。

---

## 寫完後該做什麼

1. 業務 owner 審查文末「訪談紀錄審查清單」
2. 補答 §10 Open Questions（若有時間）
3. frontmatter `status` 由業務 owner 親自拍板改成 `active`
4. 觸發 `/supervisor:prd date-picker`，讓 supervisor 讀入這份憲法當約束來源，並在 PRD 中收攏本次訪談中明確排除於憲法外的技術棧內容（@sanring/date-picker NPM 套件、Angular Standalone Components + Signals + date-fns）

---

## 訪談紀錄審查清單

### ✅ 使用者親口答案（verbatim, T1）
- §1 業務目的：「打造一個專為 sanring-ui 及其企業專案服務的 Angular Headless 日曆核心引擎…」（Q2 原話）
- §1 Out of Scope：非公曆曆法系統 / 字串解析與格式化 / 跨時區動態換算（Q4 原話）
- §2 領域角色：上層開發者 / 終端使用者 兩條定義（Q5 原話）
- §3 R1-R3：引擎外殼解耦 / 時間零點分離 / 42天網格恆定（Q3 拍板清單原話）
- §4 單一選取狀態機（Q6 原話）
- §5 I1-I3：ViewDate Validity / Selection-Disabled Mutually Exclusive / Grid Size Constancy（Q7 原話）
- §6 術語表 4 條：viewDate / selectedDate / CalendarDay / Headless Engine（Q8 原話）
- §7 Decision 1、Decision 2 rationale（Q9 原話）
- §8 清空選取語意（Q10 原話）
- §9 今天的後備地位 / 預設邊界零立場（Q11 原話）
- §10 TODO 1-4（Q3 拍板清單中的 TODO 項）+ TODO 5-6（使用者主動追加的 SSR/Hydration 時區衝突、多月聯動與高階視圖支援）

### ⚠️ AI 改寫成 invariant 形式（內容對應使用者原話）
- 無——使用者本次回答已直接以斷言式（assertive）業務規則格式提供，AI 僅做章節歸位，未改寫用詞。

### 🔷 AI 提案・使用者拍板（propose-and-ratify, T2）
- §4/§7 Decision 3/§8：Range Selection 中斷策略——AI 提出 A（回溯 Discard）/ B（保留草稿）/ C（委派外殼）三個候選 + 推薦 A，使用者明確選擇「選項 A」並補充拍板理由（業務交易完整性、避免幽靈狀態）
- §7 Decision 4/§9：SSR/Hydration「今天」判定優先順序——AI 提出 A（本地優先容忍跳動）/ B（絕對一致禁止跳動）/ C（外部注入基準）三個候選 + 推薦 C，使用者選擇「C 的改良版」並自行補充後備機制（外部基準優先 → 環境 `new Date()` 後備）與引擎邊界免責聲明，同時明確裁決此決策修正 Q11 原始 Fallback Priority 規則

### ✅ 使用者自擬決策（自行提出「選項 + 決策 + 理由」，AI 僅拆分業務本質與技術細節後歸位，T1）
- §3 R4 / §7 Decision 5：Disabled Dates 統一匹配原則（使用者原話提出「選項 B：萬能匹配器」並自行寫出決策與理由；`Matcher` 型別/`@Input()` 綁定等技術命名已拆出，留給 PRD）
- §4 跨月焦點轉移 / §7 Decision 6：自動翻頁 + 落於邏輯日（使用者原話提出「選項 A」並自行寫出決策與理由）
- §5 I4 / §7 Decision 7：在地化完全外部注入原則（使用者原話提出「選項 B」並自行寫出決策與理由；`@Input() locale` 綁定、語系物件型別已拆出，留給 PRD）
- §1 Out of Scope / §7 Decision 8：多月網格輸出納入範圍、年/十年檢視排除（使用者原話提出「選項 B」並自行寫出決策與理由；「v1.0/v2.0」版本分期語言已拆出，留給 PRD Milestones）

### ⚠️ AI Gap-finder 提問（未替使用者回答）
- 無額外 Gap-finder 提問——除 Range/SSR 兩則 propose-and-ratify 案例外，其餘內容（含最後 4 條）皆由使用者主動提出「選項 + 決策 + 理由」，AI 未自行創造候選規則，僅拆分業務本質與技術細節。

### 📌 訪談中標 TODO 的章節
- 無——本輪訪談的 6 條 TODO 已全數拍板完成，見 §10。

### ❌ AI 確定未做
- 未替任何 TODO 拍板——最後 4 條雖以「選項 A/B/C」呈現，但選項與決策皆由使用者自行提出撰寫，AI 未創造候選、未替使用者選擇
- 未自創使用者未提到的業務規則——propose-and-ratify 提案僅供選擇，未經使用者選/改一律未寫入
- 未靜默套用 sanring 預設技術棧——技術選型內容（@sanring/date-picker NPM 套件、Angular Standalone Components + Signals + date-fns、Matcher 型別、`@Input()` 綁定命名、date-fns Locale 物件、版本分期）已在訪談中明確識別為 PRD 範疇並排除於本憲法之外，未寫入，且已在對話中明確告知使用者
- 未靜默將 frontmatter `status` 從 `draft` 改為 `active`——此變更由業務 owner 本人於本輪對話中明確拍板後才執行
