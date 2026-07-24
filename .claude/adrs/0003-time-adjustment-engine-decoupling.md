---
schema_version: 1
adr_id: 0003
title: time-adjustment-engine-decoupling
status: Accepted
date: 2026-07-23
deciders: [jack755051]
related: ["ADR-0001", "ADR-0002 (superseded by this ADR)", "PRD: .claude/prds/date-picker.md §6/§7/§12", "PRD: .claude/prds/date-picker-widget.md", "Constitution: .claude/constitutions/date-picker.md Decision 15/R9/§4"]
---

# ADR-0003: Time Adjustment 架構決策——Supersede ADR-0002，改採獨立 Injectable `TimeAdjustmentEngine` + 呼叫端自訂 key 解耦設計

## Context

- **觸發事件**：ADR-0002（`time-adjustment-architecture`）已於 2026-07-23 由 owner（jack755051）review 全文並確認同意，`status` 拍板為 `Accepted`，拍板結論是時/分調整**併入既有 `CalendarEngine`**、不開新 Injectable。同一天，owner 在與主 Claude session（非本 Supervisor session）的後續對話中重新檢視這個剛拍板的決策，推翻了 ADR-0002 的核心架構選擇（掛載位置），但**維持** ADR-0002 已拍板的其餘技術判斷（guard hook 單一 predicate 簽章、precision enum 形狀與 `'hour-minute'` 預設值、不整合 `GranularityPickerEngine`）。本 ADR 記錄推翻的完整脈絡與新架構的技術細節，並正式 supersede ADR-0002。
- **相關背景**：這是本專案繼 ADR-0001（Granularity Selection 架構，Accepted）之後第二次處理「新功能是否併入既有 Engine 或開獨立 Injectable」這一類決策，也是**同一個決策主題在兩天內被自己推翻**的首例——ADR-0002 才剛在 2026-07-23 當天被 Accepted，同日內即被 owner 提出的新論證推翻。這在治理上是一個值得留意的訊號（詳見下方 Consequences 段落），但推翻本身有具體、可驗證的理由支撐，不是單純的猶豫不決，本 ADR 的 Context 段落會完整還原推翻的三層論證過程，讓未來讀者能判斷這次推翻是否站得住腳。
- **既有狀況**：ADR-0002 的核心論證是「候選 1（完全解耦的獨立 Injectable）在 confirm 寫回這一步存在結構性缺口——`confirmTime()` 提交後，時間值只會停留在 `TimeAdjustmentEngine` 自己的狀態裡，`CalendarEngine.selectedDate` 依然是提交前的舊值，除非額外引入跨 engine 同步膠水邏輯；但那樣一來候選 1 宣稱的『兩者解耦、互不知道對方存在』就不成立，等於用假裝的解耦換取實質的隱性耦合」。這個論證的前提是：膠水邏輯無論放在哪裡都是負擔——要嘛塞進 `TimeAdjustmentEngine`（需要注入 `CalendarEngine` 參照，破壞解耦），要嘛塞進消費元件（消費端手動同步兩個 engine，增加整合負擔）。owner 事後在對話中指出，這個前提沒有考慮到「消費元件」實際上不是一個籠統的抽象角色，而是有明確身份的——這正是推翻的起點。

### 推翻脈絡第 1 層：owner 提出的原始論點

owner 認為獨立 `TimeAdjustmentEngine`「完全脫離網格邏輯，只認『一個 Date 進、一個 Date 出』，不管這個 Date 是從日網格還是月/季/年網格來的」，理由有三：

1. **減少耦合**：消費者頂多多引入一個時/分的檔案，不需要理解 `CalendarEngine` 內部的 `_timeDrafts` Map 是怎麼跟 `_selectedDate`/`_selectedRange`/`_selectedDates` 互動的。
2. **更接近 headless 風格**：一個只認 Date in / Date out 的引擎比一個「知道自己是 Single 還是 Range 還是 Multi」的引擎更純粹。
3. **sanring 現在的處境跟 shadcn 不同**：sanring 是**同時建立 engine 跟 widget 兩層套件**的一方（見 `.claude/prds/date-picker-widget.md`），不像 shadcn 使用者只是引入別人已經寫好的 `<DatePicker>` 元件再自行組裝——sanring 對兩層都有完全的設計自由度，這意味著「跨層膠水邏輯該放哪裡」這個問題，sanring 自己就能一次決定好答案，不需要假設消費端只能自己土法煉鋼。

### 推翻脈絡第 2 層：查證 shadcn 實際做法後的修正

主 Claude session 實際查了 shadcn 生態圈的 time-picker 參考實作（`shadcnui-expansions` 套件的 `DateTimePicker`）之後，發現一個重要修正：**shadcn 根本沒有「引擎分離」這個問題**。shadcn 的 `DateTimePicker` 只有一顆共用的 `Date` state（`displayDate`），養在消費元件自己身上；`Calendar` 與 `TimePickerInput` 兩個子元件都直接讀寫同一顆 state，**沒有 Draft/Confirm 兩階段機制**，每次按鍵（調整小時/分鐘）立即寫入這顆共用 state。而且 shadcn 的方案**只處理 Single 模式**，從未遇到 Range 起訖點各自獨立時間、Multi 集合每筆各自獨立時間、guard hook 等 R9 明文要求的情境。

這帶出兩個修正：

1. **shadcn 不能直接當作「該不該拆 engine」的參考先例**：因為它根本沒有 R9 要求的 Draft/Confirm 機制與獨立 guard hook。如果真要照抄 shadcn 的「單一共用 state、按鍵即寫入」模型，等於要推翻憲法 R9 本身（「時/分調整採獨立於日期選取的 Draft/Confirm 機制，並擁有自己獨立的 guard hook」）——這是憲法層級的業務規則，不是本 ADR 這種技術實作層級的文件能單方面決定的事，必須先走 `/supervisor:constitution` supersede 訪談，本 ADR 明確不採此路線（見下方 Alternatives Option B）。
2. **shadcn 案例間接反駁了「更接近 headless 風格」這個說法**：headless 的定義是「不綁 DOM/CSS」，跟「要不要拆成幾個 class」沒有必然關係——`CalendarEngine` 併入時/分邏輯（ADR-0002 方案）跟獨立 `TimeAdjustmentEngine`（候選 1）兩者都一樣是 headless，都不渲染任何 DOM。事實上，shadcn 示範的「單一狀態、無跨 engine 同步」的簡單模型，某種程度上**更接近 ADR-0002（合併）的精神而非候選 1（拆分）**——因為 shadcn 也是把時間狀態養在同一個地方，不是分成兩個互不知情的獨立單元。

這一層查證的結論是：**owner 原始論點第 2 點（更接近 headless）站不住腳**，但第 1、3 點（減少耦合、sanring 對兩層有設計自由度）尚未被推翻，需要進一步驗證。

### 推翻脈絡第 3 層：消費路徑確認 + Range key 碰撞問題的優雅解法（關鍵決勝點）

主 Claude session 追問 owner：憲法 Decision 15 原文明確點名「此需求的實際消費端是 sanring-ui 本身（憲法一開始即點名的服務對象……）」，且該決策的完整理由段落寫著「使用者澄清後，時/分需求的實際消費端確認是 sanring-ui 本身——這是憲法從一開始就承諾服務的既有對象（呼應 §1『這個領域服務的對象』原文）」，同時原文一度出現「透過 headless primitive 直接消費 engine 組裝自己的 DatePicker/Calendar」的表述（見 `.claude/constitutions/date-picker.md` Decision 15 理由段落補充脈絡）。ADR-0002 拒絕候選 1 的核心理由是「`confirmTime()` 寫回需要跨 engine 同步膠水邏輯」——但這個理由成立的前提是：sanring-ui 真的會**繞過 Widget 層**、直接注入裸 `CalendarEngine` 使用時/分功能。如果消費路徑確實如此，膠水邏輯就得由 sanring-ui 團隊自己手刻，「多裝一個檔案而已」這個說法就不成立，ADR-0002 的判斷是對的。

owner 確認：**sanring-ui 未來實際使用時/分功能，會透過 sanring 正在蓋的 engine+widget 套件消費**（即 `@sanring/date-picker-widget`，見 `.claude/prds/date-picker-widget.md`），**不是**繞過 Widget 層直接注入裸 `CalendarEngine`。

這個確認直接解除了 ADR-0002 拒絕候選 1 的理由。因為：

- 跨 engine 寫回的膠水邏輯（呼叫 `TimeAdjustmentEngine.confirmTimeDraft()` 拿到合成 `Date`、再呼叫 `CalendarEngine.setSelectedDate()`/`setSelectedRange()`/`setSelectedDates()` 寫回）可以封裝在 **Widget 套件內部**——一次寫好、有測試覆蓋，不是每個消費者各自重刻一份。
- 裸 `CalendarEngine` 的第三方消費者（不透過 Widget、也不需要時/分功能）完全零成本——`CalendarEngine` 本身不因此變大一行程式碼，這是 ADR-0002 方案做不到的（ADR-0002 讓 `CalendarEngine` 新增 5 個公開方法 + 3 個私有 signal，即使消費者根本不用時/分功能，也得承擔這個 class 變大的認知負擔）。
- 若真的有裸 engine 消費者想繞過 Widget、自己兜時/分功能，也只是呼叫兩個既有公開方法（`TimeAdjustmentEngine.confirmTime()` 拿到合成 `Date`，再呼叫 `CalendarEngine.setSelectedDate()`/`setSelectedRange()`/`setSelectedDates()`）——沒有特權後門，任何人都能這樣組，符合憲法 R5「無論 Composed Widget 層或任何應用層，都只能透過 engine 對外公開的 public API 消費 engine」。

**ADR-0002 認為「解耦是假的，因為寫回終究要耦合」，但如果耦合的那一層本來就規劃在 Widget 套件裡（第一方、有測試覆蓋），而不是強加在每一個裸 engine 消費者身上，這就是真解耦，不是假解耦**——這是本次推翻的決勝論點。

**額外發現的架構優勢（本次 supersede 的額外收穫，非 owner 原始論點的一部分，由主 Claude session 在對話中主動指出）**：ADR-0002 為了讓 `CalendarEngine` 自己判斷「這個 targetDate 是 Range 的起點還是終點」，被迫發明一個新的角色判別參數（見 ADR-0002 Decision 子決策 4），因為「同日 Range」（起訖點恰為同一天，R8 允許 `minDays=1`）會讓單純的 `Date` 比對產生 key 碰撞。但如果 `TimeAdjustmentEngine` 是**完全通用的「呼叫方自訂 key → Draft」儲存**，不認識 Date/Range/Multi 的業務語意，呼叫方（Widget 層，本來就清楚自己在渲染 Range 的哪一端）可以直接傳入一個語意化字串 key（例如 `'range-start'`/`'range-end'`，或 Multi 模式下沿用既有日期正規化 key），完全不需要引擎反推身份——「同日碰撞」問題**從根本消失**，不是被繞過或加參數解決。這是本次 supersede 額外拿到的架構收益。

## Decision

**我們決定**：Supersede ADR-0002。時/分調整狀態機改採**獨立 Injectable `TimeAdjustmentEngine`**（新檔案 `projects/date-picker/src/lib/time/time-adjustment-engine.ts`，比照 `CalendarEngine`/`GranularityPickerEngine` 既有慣例，component-scoped `@Injectable`，不 `providedIn: 'root'`），狀態轉換純函式抽到 `projects/date-picker/src/lib/shared/time-adjustment-state.ts`（沿用既有 `shared/`/`calendar/`/`granularity/` 三個目錄的分類慣例，新增 `time/` 目錄裝這個新 Injectable 本體）。

`TimeAdjustmentEngine` **完全不認識** `CalendarEngine`、`GranularityPickerEngine`，也不試圖從輸入值反推「這是 Single/Range 起點/Range 終點/Multi 集合中哪一筆」的業務身份——它只管理一組「呼叫方自訂字串 key → 時間 Draft」的通用儲存。Range/Multi 的角色辨識責任完全下放給呼叫方（預期是 Widget 套件內部的組裝邏輯，或任何選擇直接消費裸 engine 的第三方），因為呼叫方在呼叫當下本來就清楚自己在處理哪個實體，不需要引擎反推。

### 維持 ADR-0002 已拍板、本次不變動的技術判斷

- **guard hook（`TimeGuardMatcher`）**：維持單一 predicate `(date: Date, time: TimeValue) => boolean`，不採 matcher-based 設計。理由不變（`DateMatcher` 測試靜態日期集合成員資格，`TimeGuardMatcher` 測試動態組合判斷，語意層級不同）。
- **Precision 參數形狀**：維持 enum `'hour' | 'hour-minute' | 'hour-minute-second'`，不採 numeric step。
- **Precision 預設值**：維持未指定時給合理預設值 `'hour-minute'`，判斷依據不變（呈現層中性設定，非業務判斷，性質同 `setGridColumns()` 預設 3）。
- **`GranularityPickerEngine` 整合**：本次仍明確排除，範圍僅限日粒度。**但本次架構調整讓「排除」的絕對性略有淡化**：由於 `TimeAdjustmentEngine` 現在是完全通用、不依賴 `CalendarEngine` 任何內部細節的儲存層，若未來 `GranularityPickerEngine` 真的需要時間調整，重用 `TimeAdjustmentEngine`（連同 `shared/time-adjustment-state.ts`）的成本會比 ADR-0002 的合併設計（掛在 `CalendarEngine` 內部）更低——因為完全不需要考慮「這段邏輯耦合在 `CalendarEngine` 私有狀態上，搬到 `GranularityPickerEngine` 要重寫一份」的問題。正式決定仍是本次不做，僅記錄此觀察供未來評估參考。

### 本次推翻/新增的技術判斷

**1. 架構掛載位置**：獨立 Injectable `TimeAdjustmentEngine`。

```typescript
// projects/date-picker/src/lib/time/time-adjustment-engine.ts
@Injectable()
export class TimeAdjustmentEngine {
  // 私有狀態：_timeDrafts / _timeGuard / _timePrecision（signal-based，比照 CalendarEngine 慣例）

  startOrUpdateTimeDraft(key: string, baseDate: Date, value: TimeValue): void;
  confirmTimeDraft(key: string): Date | null;
  abortTimeDraft(key: string): void;
  setTimePrecision(precision: TimePrecision): void;
  setTimeGuard(guard: TimeGuardMatcher | undefined): void;
}
```

**2. 技術缺口的解法：`confirmTimeDraft()` 如何取得年/月/日分量**

`TimeAdjustmentEngine` 若完全不認識 `Date` 的業務語意（只管 key→TimeValue），`confirmTimeDraft()` 要回傳「合成後的完整 Date」時，年/月/日分量從哪裡來，需要具體解法：

**選定設計**：`startOrUpdateTimeDraft(key, baseDate, value)` 額外接收一個 `baseDate: Date` 參數，與 `draftValue: TimeValue` 一併存進同一筆 Draft（`TimeAdjustmentDraft { baseDate: Date; draftValue: TimeValue }`）。`confirmTimeDraft(key)` 內部讀出該筆 Draft 的 `baseDate`，取其年/月/日分量，覆寫上 `draftValue` 的時/分/秒分量，回傳合成後的完整 `Date`，同時銷毀該筆 Draft；若 `key` 不存在（從未 `startOrUpdateTimeDraft` 過，或已被 confirm/abort 過）則回傳 `null`。guard hook 在 `startOrUpdateTimeDraft()` 呼叫當下即以 `(baseDate, value)` 評估，命中則靜默拒絕（Draft 不建立/不更新），不會遞延到 confirm 階段才擋。

**為什麼選這個設計，而不是「`confirmTimeDraft()` 只回傳 `TimeValue`，合成 Date 全部交給呼叫端」**：owner 在對話中描述的實際消費流程明確預期「`TimeAdjustmentEngine.confirmTime()` 拿到合成 `Date`」這一步是引擎直接完成的（見上方 Context 第 3 層——owner 原話描述呼叫序列是「呼叫 `TimeAdjustmentEngine.confirmTime()` 拿到合成 `Date`，再呼叫 `CalendarEngine.setSelectedDate()`/...」）。若改成 `confirmTimeDraft()` 只回傳 `TimeValue`，等於要求每個消費端（含裸 engine 第三方消費者）自己重寫一次「年月日 + 時分秒合成」的樣板程式碼——這正是 Widget 層想封裝掉的膠水邏輯之一，把這一步留給呼叫端等於把 Widget 內部的膠水複雜度往外洩漏了一部分。讓 `startOrUpdateTimeDraft()` 多接收一個 `baseDate` 參數的成本很低（呼叫端本來就要提供這個值——它就是「使用者正在調整哪一個已選定日期的時間」這件事本身），足以換得 `confirmTimeDraft()` 直接吐出完整合成 `Date` 的便利性。這個設計選擇列為 Decision 定案，另一種設計（回傳 `TimeValue`）列入 Alternatives（見下方 Option D）。

**重要澄清**：`TimeAdjustmentEngine` 接受並儲存 `Date` 型別（作為 `baseDate`）不代表它「認識」`CalendarEngine` 或懂得 Single/Range/Multi 的業務語意——它只是把 `baseDate` 當成一個不透明的日期容器，用來在 confirm 時取年/月/日分量，全程不查詢也不依賴這個 `Date` 是從哪個 engine、哪個選取模式來的。owner 原話「只認一個 Date 進、一個 Date 出」在這個設計下依然成立，只是「進」的 Date 分兩次進（`baseDate` 在 start 時進、`TimeValue` 在每次 update 時進），「出」的 Date 在 confirm 時一次出。

**3. Range/Multi key 命名責任下放給呼叫端（Widget 層）**

- **Single 模式**：Widget 用固定 key（如 `'single'`）呼叫 `startOrUpdateTimeDraft('single', selectedDate, timeValue)`。
- **Range 模式**：Widget 用語意化固定 key `'range-start'`/`'range-end'`（不是 Date 值本身），因此同日 Range（起訖點恰為同一天）不會產生任何 key 碰撞——兩個 key 本來就是不同字串，與 `Date` 值是否相同無關。這與 ADR-0002 被迫引入的「角色判別參數」達到相同效果，但不需要引擎理解「角色」這個概念，純粹是呼叫端選了兩個不同的字串。
- **Multi 模式**：Widget 沿用 `CalendarEngine` 既有 `Map<string, Date>` 正規化 key 慣例（§6 Multi 選取容器），為集合中每一筆日期產生一個唯一 key。**待實作階段確認的技術缺口**：此正規化 key 函式目前是 `CalendarEngine` 內部實作細節（非公開匯出），若 Widget 層要產生與 `CalendarEngine` 內部一致的 key，需要這個正規化函式被公開匯出（例如 `normalizeDayKey(date: Date): string`），或 Widget 層自行複製等效邏輯（風險：兩處實作分岔）。本 ADR 判斷這是實作階段的次要技術決定，不影響本次「獨立 Injectable + 呼叫端自訂 key」的架構結論本身，留待 Implementation Plan 追蹤，不視為阻擋本 ADR 拍板的缺口——因為即使 Widget 暫時自行複製一份正規化邏輯，功能上依然正確，只是有分岔維護的風險，屬於程度問題而非正確性問題。

**4. Widget 套件的組裝範例/掛勾點**

`@sanring/date-picker-widget`（見 `.claude/prds/date-picker-widget.md`）內部（建議實作為元件間共用邏輯的 composable/service 的一部分，非新增 Public API）負責這段膠水邏輯：

```typescript
// Widget 內部（非 public API）示意，非最終命名
function onTimeConfirm(key: string) {
  const composed = timeAdjustmentEngine.confirmTimeDraft(key);
  if (composed === null) return; // key 不存在，no-op

  switch (selectionMode) {
    case 'single':
      calendarEngine.setSelectedDate(composed);
      break;
    case 'range':
      // key === 'range-start' | 'range-end'，Widget 自行組出新的 DateRange 物件
      calendarEngine.setSelectedRange(nextRangeWith(key, composed));
      break;
    case 'multi':
      calendarEngine.setSelectedDates(nextDatesWith(key, composed));
      break;
  }
}
```

裸 engine 消費者若不經過 Widget，也可以照抄同樣兩行程式碼自己接（`confirmTimeDraft()` → `setSelectedDate()`/`setSelectedRange()`/`setSelectedDates()`），沒有特權後門，符合 R5。

## Consequences

### ✅ Positive

- **真解耦，不是假解耦**：`TimeAdjustmentEngine` 完全不依賴 `CalendarEngine`/`GranularityPickerEngine` 的任何內部細節，`CalendarEngine` 本身不需要新增任何一行程式碼、不需要擴張 Public API Surface（對比 ADR-0002 讓 `CalendarEngine` 新增 5 個公開方法 + 3 個私有 signal）。裸 `CalendarEngine` 消費者若不需要時/分功能，完全零認知/零 bundle size 成本。
- **Range 同日 key 碰撞問題從架構上根本消失**：不需要 ADR-0002 被迫發明的「角色判別參數」，呼叫端（Widget 層）直接用語意化字串 key（`'range-start'`/`'range-end'`）即可，這是本次 supersede 額外拿到的架構收益，屬於原本 owner 論點之外、由查證過程主動發現的好處。
- **跨層膠水邏輯集中在第一方、有測試覆蓋的位置**：由於消費路徑已確認是「透過 Widget 套件消費」，`confirmTimeDraft() → setSelectedDate()/setSelectedRange()/setSelectedDates()` 這段膠水邏輯只需在 Widget 套件內部寫一次、測試一次，不會在每個消費端各自重複（也不強迫每個消費端都得寫這段邏輯——不需要時/分功能的消費者完全不受影響）。
- **`GranularityPickerEngine` 未來重用成本降低**：`TimeAdjustmentEngine` 及其純函式模組完全不依賴 `CalendarEngine` 內部細節，若未來需要月/季/年粒度的時間調整，重用成本比 ADR-0002 的合併設計更低（不需要先把邏輯從 `CalendarEngine` 內部拆出來才能給 `GranularityPickerEngine` 用）。
- **API 形狀對稱性優於 ADR-0002**：`TimeAdjustmentEngine` 的方法簽章（`startOrUpdateTimeDraft(key, baseDate, value)`/`confirmTimeDraft(key)`/`abortTimeDraft(key)`）對 Single/Range/Multi 三種模式完全一致（統一用 `key: string`），不像 ADR-0002 那樣 Range 模式的方法簽章需要額外的角色判別參數而破壞三模式統一簽章的假設——不對稱性被下放到呼叫端「傳什麼 key」的決定，而不是引擎方法簽章本身的分岔。

### ❌ Negative

- **公開 Injectable 數量從 2 個增加到 3 個**（`CalendarEngine`/`GranularityPickerEngine`/`TimeAdjustmentEngine`），消費文件/範例需要涵蓋第三個進入點——這是 ADR-0001 已經預警過的「新增獨立 Injectable」既有代價的延伸，本次再疊加一次。
- **裸 engine 消費者的整合步驟從 1 步增加到 2 步**：ADR-0002 原設計是單一 `confirmTime()` 直接寫回 `CalendarEngine.selectedDate`，本 ADR 的裸 engine 路徑需要呼叫 `confirmTimeDraft()` 後再手動呼叫對應的 `setSelectedX()`。這個代價由「消費路徑確認是透過 Widget 套件」這件事抵銷了大部分——Widget 套件會把這兩步封裝起來，真正需要手刻兩步的只有選擇繞過 Widget 的裸 engine 消費者，且憲法/PRD 目前沒有跡象顯示這類消費者存在。
- **兩天內第二次推翻同一主題的架構決策**（ADR-0002 於 2026-07-23 當日 Accepted，同日內被推翻）：這本身是一個治理成本——若未來類似情況重演（架構決策 Accepted 後又被同一天的新論證推翻），會削弱「Accepted」狀態的可信度，讓後續讀者難以判斷一份 Accepted ADR 是否真的穩定。本 ADR 透過完整還原推翻的三層論證脈絡（Context 段落）緩解這個問題，但無法完全消除——建議未來若再次出現類似情況，應優先檢視是否在 ADR 正式 Accepted 前的 review 階段就該窮盡這類消費路徑確認問題，而非事後才發現。
- **Widget PRD（`.claude/prds/date-picker-widget.md`）目前完全沒有反映這段膠水邏輯**：該 PRD 目前 W0 剛完成、§4a/§7 尚未提及時間調整相關的 composable 職責，本 ADR 拍板後需要立即排入該 PRD 的後續追蹤項（見 Implementation Plan），否則會產生「engine 側 ADR 已定案、widget 側 PRD 未同步」的文件漂移。
- **Multi 模式的日期正規化 key 目前是 `CalendarEngine` 私有實作**：若 Widget 層需要與 `CalendarEngine` 內部一致的 key 才能正確對應到集合成員，可能需要額外公開匯出這個正規化函式（或 Widget 自行複製），這是本 ADR 承認但未完全解決的技術缺口（見 Decision 第 3 點），留待實作階段處理。

### 〰️ Neutral

- **`baseDate` 參數的存在不代表 `TimeAdjustmentEngine` 認識業務語意**：如 Decision 段落所述，`TimeAdjustmentEngine` 儲存 `baseDate` 純粹是為了在 confirm 時能合成完整 `Date`，不會查詢或依賴這個 `Date` 的來源、不會反推 Single/Range/Multi 身份。這個澄清有必要寫下來，避免未來讀者誤以為「`TimeAdjustmentEngine` 接受 `Date` 型別」等於「它跟 `CalendarEngine` 一樣懂日期選取的業務規則」。
- **本 ADR 未重新評估 ADR-0002 已拍板的 guard hook/precision 相關判斷**——這些判斷本次維持不動，若未來要重新檢視，應另開新 ADR 或在此 ADR 的 Alternatives 段落補充，不建議在本 ADR 範圍內夾帶重新討論。
- **`GranularityPickerEngine` 整合排除的立場略微軟化，但正式決定不變**：本次 supersede 讓「未來重用 `TimeAdjustmentEngine`」的技術門檻降低，但這只是觀察記錄，不代表本 ADR 主動提議現在就做，範圍仍明確排除，見 Decision「維持 ADR-0002 已拍板」段落。
- **`confirmTimeDraft()` 回傳 `Date | null` 而非拋錯**：與 ADR-0002 既有「命中規則靜默拒絕」一致性原則（呼應 I2/R7/Decision 13）對齊，`key` 不存在時回傳 `null` 而非拋出例外，讓呼叫端可以用簡單的 null check 處理「Draft 已經不存在」（例如重複呼叫 confirm、或 key 打錯字）的情境，不強迫呼叫端用 try/catch。

## Alternatives Considered

### Option A: 維持 ADR-0002 現狀（併入 `CalendarEngine`，不開新 Injectable）

- **是什麼**：不 supersede ADR-0002，時/分調整狀態機繼續掛載在既有 `CalendarEngine` 之上。
- **拒絕理由**：ADR-0002 拒絕候選 1（獨立 Injectable）的核心論證前提是「消費端要嘛注入 `CalendarEngine` 參照直接寫回內部狀態，要嘛消費端手動同步兩個 engine」，這個前提預設了消費路徑會繞過 Widget 層、直接注入裸 `CalendarEngine`。owner 確認 sanring-ui 實際消費路徑是**透過 Widget 套件**，膠水邏輯可以封裝在 Widget 內部（第一方、有測試覆蓋），不是強加給每個裸 engine 消費者——ADR-0002 拒絕候選 1 的前提不成立，維持現狀等於繼續建立在一個已被推翻的假設上。且維持現狀會讓 `CalendarEngine`（既有 564 行）持續擴張公開 API 表面，即使消費者根本不需要時/分功能也得承擔這個 class 變大的認知負擔，這是本 ADR 方案完全避免的代價。

### Option B: shadcn 式——完全不做 Draft/Confirm 機制，只用一顆共享 `Date` state

- **是什麼**：比照 `shadcnui-expansions` `DateTimePicker` 的實際做法，不設計獨立的時間 Draft/Confirm/Abort 狀態機，`selectedDate` 的時間分量隨使用者調整小時/分鐘立即寫入，沒有「暫定值」與「已提交值」的區分。
- **拒絕理由**：這個選項**層級不同，不是本 ADR（技術實作文件）能決定的事**。憲法 R9 明文規定「時/分調整採獨立於日期選取的 Draft/Confirm 機制」，這是業務規則層級的拍板（見 `.claude/constitutions/date-picker.md` §3 R9、§7 Decision 15），要採用 shadcn 式的「即時寫入、無 Draft」模型，等同直接否定 R9 本身，必須先走 `/supervisor:constitution` 的 supersede 訪談程序取得業務 owner 對憲法規則的正式改判，不能在 ADR 這種「技術架構落地方式」的文件裡繞過憲法規則。此外，shadcn 的實際範例從未處理 Range 起訖點各自獨立時間、Multi 集合每筆各自獨立時間、guard hook 靜默拒絕等 R9 明文要求的情境，即使真的要重新討論 R9 本身，shadcn 案例也不能直接作為「這樣做可行」的先例佐證，因為情境不對等。本 ADR 明確不採此路線，列出僅為完整記錄查證過程中曾經考慮、且已被排除的選項。

### Option C: 獨立 Injectable，但仍由引擎自行從 `Date` 值反推 Single/Range/Multi 身份

- **是什麼**：`TimeAdjustmentEngine` 獨立於 `CalendarEngine` 之外，但方法簽章維持 ADR-0002 式的 `updateTime(targetDate: Date, roleHint, time)`，引擎內部仍需要一個角色判別參數（或某種推斷邏輯）來決定 Draft 該存進 Map 的哪個位置，只是把這整套邏輯從 `CalendarEngine` 搬到新 class。
- **拒絕理由**：這只是把 ADR-0002 的「同日 Range key 碰撞」問題原封不動搬到新 class 身上，沒有解決根本問題，反而讓「完全通用、不認識業務語意」這個獨立引擎最大的架構優勢喪失殆盡。呼叫端（Widget 層）本來就清楚自己在渲染 Range 的哪一端、在處理 Multi 集合的哪一筆，讓引擎自己反推身份是不必要的間接層，徒增複雜度卻沒有對應的好處。本 ADR 選擇讓呼叫端直接傳入語意化字串 key，從架構上消除這個問題，而不是在新位置重新發明一次相同的解法。

### Option D: `confirmTimeDraft()` 只回傳 `TimeValue`，合成完整 `Date` 交給呼叫端自行處理

- **是什麼**：`startOrUpdateTimeDraft(key, value)` 不接收 `baseDate` 參數，`TimeAdjustmentEngine` 全程只處理 `TimeValue`，完全不觸碰 `Date` 型別；`confirmTimeDraft(key)` 只回傳確認後的 `TimeValue`（或 `null`），呼叫端（Widget 層或裸 engine 消費者）自行拿著自己手上已知的原始 `Date`（呼叫端本來就有，因為它就是負責渲染這個時間調整介面對應哪一筆已選定日期的一方），合成出完整的 `Date` 後再寫回 `CalendarEngine`。
- **拒絕理由**：owner 於對話中描述的實際消費流程明確預期「`TimeAdjustmentEngine.confirmTime()` 拿到合成 `Date`」這一步是引擎直接完成的（見 Context 第 3 層還原的 owner 原話），若採用本選項，等於要求每個消費端自己重寫一次「取年月日、覆寫時分秒、組出新 `Date` 物件」的樣板程式碼——這正是 Widget 層想封裝掉的膠水邏輯之一，把這一步留給呼叫端等於把複雜度往外洩漏。讓 `startOrUpdateTimeDraft()` 額外接收一個 `baseDate` 參數（呼叫端本來就要提供這個值）的成本很低，換得的便利性（`confirmTimeDraft()` 直接吐出完整合成 `Date`）足以支撐本 ADR 選擇 Decision 段落描述的設計，而非本選項。本選項的優點是讓 `TimeAdjustmentEngine` 徹底不觸碰 `Date` 型別、更接近字面意義上的「純時間儲存」，若未來實作階段發現 `baseDate` 儲存方式有其他問題（例如記憶體/序列化考量），可回頭重新評估此選項。

## Implementation Plan

- [ ] 新增 `projects/date-picker/src/lib/shared/time-adjustment-state.ts`：型別 `TimeValue`/`TimeGuardMatcher`/`TimePrecision`/`TimeAdjustmentDraft`（`TimeAdjustmentDraft { baseDate: Date; draftValue: TimeValue }`，移除 ADR-0002 草案的 `targetDate`/`isActive` 欄位）+ 三個不可變 Map 純函式：`startOrUpdateTimeDraft(drafts, key, baseDate, value, guard?)`（guard 命中原樣回傳輸入 Map）、`confirmTimeDraft(drafts, key)`（回傳 `{ drafts: 移除該 key 後的新 Map, composed: Date | null }`，`composed` 由 `baseDate` 年/月/日 + `draftValue` 時/分/秒依 precision 合成）、`removeTimeDraft(drafts, key)`；含單元測試（guard 拒絕、三種 precision 的合成正確性、key 不存在時 confirm 回傳 null、abort 零回溯）。
- [ ] 新增 `projects/date-picker/src/lib/time/time-adjustment-engine.ts`：`TimeAdjustmentEngine`（`@Injectable()`，component-scoped，比照 `CalendarEngine`/`GranularityPickerEngine` 既有慣例）持有 `_timeDrafts`/`_timeGuard`/`_timePrecision` 私有 signal，公開方法 `startOrUpdateTimeDraft()`/`confirmTimeDraft()`/`abortTimeDraft()`/`setTimePrecision()`/`setTimeGuard()`，內部呼叫上一項的純函式。
- [ ] `time-adjustment-engine.spec.ts`：guard hook 命中靜默拒絕、confirm 合成 `Date` 正確性（涵蓋 `'hour'`/`'hour-minute'`/`'hour-minute-second'` 三種 precision）、`key` 不存在時 confirm 回傳 `null`、abort 零回溯、Range 起訖點各用不同字串 key（`'range-start'`/`'range-end'`）互不碰撞（驗證方式：同一 `baseDate`——即同日 Range 情境——分別以兩個 key 建立 Draft，確認互不覆蓋）。
- [ ] `.claude/adrs/0002-time-adjustment-architecture.md`：frontmatter `status` 改為 `Superseded by ADR-0003`；不刪除、不改寫既有內容（比照 ADR-0001 對 Decision 8 原文的保留慣例），於文件開頭加註記指向本 ADR 說明 supersede 原因摘要。
- [ ] PRD `.claude/prds/date-picker.md` §6 同步：更新「架構落地位置」段落，改為獨立 Injectable `TimeAdjustmentEngine`；更新 `TimeAdjustmentDraft` 型別草案為 `{ baseDate, draftValue }`。
- [ ] PRD `.claude/prds/date-picker.md` §7 同步：新增 `TimeAdjustmentEngine` 匯出符號表列（型別 Injectable class）與方法簽章（`startOrUpdateTimeDraft`/`confirmTimeDraft`/`abortTimeDraft`/`setTimePrecision`/`setTimeGuard`），移除原「掛載於 `CalendarEngine`」段落的方法簽章描述。
- [ ] PRD `.claude/prds/date-picker.md` §10（M8 列）同步：更新內容欄位的架構掛載位置描述（獨立 Injectable，非併入 `CalendarEngine`）。
- [ ] PRD `.claude/prds/date-picker.md` §12 同步：標記本 ADR 涵蓋的「架構決策」這條開放問題結論變更（從併入改為獨立 Injectable，見 ADR-0003），並新增一條開放問題：「Multi 模式日期正規化 key 是否需要從 `CalendarEngine` 公開匯出，供 Widget 層產生一致的 Time Draft key」（本 ADR 承認未完全解決的技術缺口，見 Decision 第 3 點）。
- [ ] PRD `.claude/prds/date-picker-widget.md` §4a/§7：新增「時間調整膠水邏輯」composable 職責說明（呼叫 `TimeAdjustmentEngine.confirmTimeDraft()` → `CalendarEngine.setSelectedDate()`/`setSelectedRange()`/`setSelectedDates()`），列為後續追蹤項；該 PRD 目前處於 W0 剛完成、尚無時間調整相關 Story 的階段，待 M8 排程明朗後應另開一輪聚焦訪談正式補齊對應 Story/Acceptance Criteria，不在本 ADR 範圍內直接展開。
- [ ] owner review 本 ADR 全文後，將 `status` 由 `Proposed` 改為 `Accepted`（或提出修正意見後由 AI/主 Claude session 修訂再送審）。

## Notes

本 ADR 記錄的架構方向（獨立 Injectable + 呼叫端自訂 key）核心已於 owner 與主 Claude session 的對話中拍板，但完整技術細節——尤其 `confirmTimeDraft()` 回傳型別的具體設計（`baseDate` 參數 vs 只回傳 `TimeValue`）——屬於本次 Supervisor 撰寫本 ADR 時提出的技術判斷提案，owner 尚未逐字 review 這份最終文字，因此 `status` 標為 `Proposed`，待 owner review 後再轉 `Accepted`。這一點延續 ADR-0002 既有的 Notes 慣例（區分「核心方向由 owner 拍板」與「AI 展開的技術細節提案」兩個層次）。

本 ADR 特別值得未來讀者注意的一點：它是繼 ADR-0001 之後第二份處理「新功能是否併入既有 Engine 或開獨立 Injectable」的 ADR，也是本專案第一次出現「剛 Accepted 的 ADR 兩天內（實際上是同一天內）被推翻」的案例。推翻本身不是隨意的猶豫——Context 段落完整還原了三層論證（owner 原始論點 → shadcn 查證修正認知 → 消費路徑確認解除 ADR-0002 拒絕理由的前提），核心決勝點是「消費路徑是否繞過 Widget 層」這一個此前未被明確追問的事實性問題，一旦確認答案，ADR-0002 的核心論證前提就不成立了。這提示一個治理層面的教訓：架構決策 ADR 在正式 Accepted 前，若牽涉「消費端如何整合」的論證，應優先窮盡「消費路徑實際上是什麼」這類事實性問題，而不是等 Accepted 之後才發現關鍵前提站不住腳。

本 ADR 未包含 benchmark 數據或 POC 實驗結果，核心論證是既有憲法/PRD 條文交叉比對 + shadcn 開源程式碼查證 + owner 訪談澄清，非團隊共識討論。若 owner 對 `confirmTimeDraft()` 回傳型別設計（本 ADR 選定的 `baseDate` 參數方案 vs Alternatives Option D 的純 `TimeValue` 方案）有不同看法，建議直接在此 ADR 的 Alternatives Considered 段落補充意見後重新裁決，不需要另開新 ADR。

### 相關連結

- PRD: `.claude/prds/date-picker.md`（§6 型別草案第 377-420 行、§7 API 契約第 556-577 行、§10 M8 里程碑第 646 行、§12 開放問題第 718-729 行）
- PRD: `.claude/prds/date-picker-widget.md`（§4a 元件間共用邏輯、§3 vue3-datepicker 功能對標表格 `time-picker` 列——該分析寫於 2026-07-20，早於憲法 Decision 15/ADR-0002/本 ADR，其「widget 自己管時分、合成 Date 才丟給 `selectDate()`」的舊分析與本 ADR「Widget 層封裝跨 engine 膠水邏輯」的結論方向一致，可視為獨立驗證）
- Constitution: `.claude/constitutions/date-picker.md`（Decision 15 第 371-399 行，含「透過 headless primitive 直接消費 engine」表述、R9 第 53 行、§4 時間調整第 140-168 行）
- 相關 ADR: ADR-0001（`granularity-picker-independent-engine`，獨立 Injectable + 參數化純函式共用的既有先例）；ADR-0002（`time-adjustment-architecture`，本 ADR supersede 的對象，其 guard hook/precision 相關判斷本 ADR 維持不變）
- 外部參考: shadcn 生態圈 `shadcnui-expansions` 套件 `DateTimePicker` 實作（單一共用 `Date` state、無 Draft/Confirm、僅支援 Single 模式——查證後確認不能直接作為本次架構決策的先例，理由見 Context 第 2 層）
