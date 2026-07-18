---
schema_version: 1
adr_id: 0001
title: granularity-picker-independent-engine
status: Proposed
date: 2026-07-18
deciders: [jack755051]
related: ["PRD: .claude/prds/date-picker.md §7", "Constitution: .claude/constitutions/date-picker.md Decision 12"]
---

# ADR-0001: Granularity Selection 架構決策——獨立 GranularityPickerEngine + 參數化純函式共用狀態機

## Context

- **觸發事件**：憲法 Decision 12 supersede Decision 8，開放 Month/Quarter/Year-picker（粒度選取）範圍；M7 是這個範圍的實作里程碑，其驗收門檻第一項明訂「架構決策先定案（ADR 或 PRD 補充）」——這是 M7 後續所有程式碼結構的地基，晚決定 = 白工風險。
- **相關背景**：PRD §6 已定義 `Granularity`/`GranularityCell`/`QuarterStartMonth` 型別草案，PRD §7 列出兩個候選架構（`CalendarEngine` 擴充 vs 獨立 Injectable）但明確標註「未拍板」，並在 §12 開放問題留下三條待 owner 拍板的問題（架構選擇、`QuarterStartMonth` 預設值、`GranularityCell` 判別欄位）。
- **既有狀況**：M0-M6 已完成的 `CalendarEngine`（`projects/date-picker/src/lib/calendar-engine.ts`）用單一 class 承載 Single/Range/Multi 三種選取模式共用的日曆狀態機，包括 `moveFocus()` 的跨月方向鍵位移演算法（up/down=±7，left/right=±1，line 304-390），該演算法架構在 `buildMonthGrid()`（`calendar-grid.ts`）固定輸出的 `GRID_SIZE = 42`（7 欄 × 6 列）版面之上，`monthGrids` 型別為 `Signal<CalendarDay[][]>`（實際為 `computed<CalendarDay[][]>`，engine line 110）。月/季/年粒度的網格版面（12/4/N 格）與日網格結構性不同，若不先定案掛載位置，M7 一旦動工就會把演算法直接寫死在某個假設下，事後搬移成本高。

## Decision

**我們決定**：Month/Quarter/Year-picker 透過**獨立 Injectable**（暫名 `GranularityPickerEngine`）實作，不擴充現有 `CalendarEngine`。Single/Range/Multi 的狀態轉換邏輯（draft/提交/中止回溯、Set 去重、toggle 語意）抽成參數化純函式模組，比照 `calendar-grid.ts`/`calendar-disabled.ts` 既有慣例（不綁 class 的純函式），以相等性比較函式作為參數注入——日粒度傳 `isSameDay`，月/季/年粒度傳對應的 `isSameMonth`/自訂季度比較函式/`isSameYear`——供 `CalendarEngine` 與新的 `GranularityPickerEngine` 共用，避免程式碼重複。

搭配兩個子決策：

1. `QuarterStartMonth` 採 **Zero-default，強制注入**：新增 `CALENDAR_QUARTER_STARTS_ON`（`InjectionToken<QuarterStartMonth>`），不提供預設 factory，消費端未注入時 Angular DI 直接拋錯。比照現有 `CALENDAR_LOCALE`（無預設 factory，見 `calendar.tokens.ts` line 11）而非 `CALENDAR_TODAY`（有預設 factory，line 19 起）。
2. `GranularityCell` **不加** `granularity` 判別欄位——同一個 `GranularityPickerEngine` 實例同一時間只有一種粒度在作用（呼應既有 `setSelectionMode()` 切換即重置狀態的慣例），消費端從呼叫的 signal/方法本身即可得知目前粒度。

### 實作要點

- 新增檔案 `granularity-picker-engine.ts`（`GranularityPickerEngine`，`@Injectable`），public API 對齊 PRD §7 草案的 `Granularity`/`GranularityCell`/`setSelectionGranularity()`/`granularityGrids` signal 命名方向，實際簽名於 PRD 定案後補齊。
- 新增共用純函式模組（暫名 `selection-state.ts`，實際檔名待 M7 實作階段定案）承載參數化版的 Single/Range/Multi 狀態轉換邏輯，函式簽名接受 `equalsFn: (a: Date, b: Date) => boolean` 作為參數。
- `CalendarEngine` 改為呼叫這批共用純函式，而不是保留自己內嵌的狀態轉換邏輯（避免兩份邏輯分岔）——此為 refactor，需另開 Task Charter 界定改動邊界，避免波及 M0-M6 既有測試覆蓋的行為。
- `CALENDAR_QUARTER_STARTS_ON` token 新增於 `calendar.tokens.ts`，緊鄰 `CALENDAR_LOCALE` 之後。

## Consequences

### ✅ Positive

- `moveFocus()` 的跨月方向鍵演算法不需要為了月/季/年網格新增粒度分支條件，避免 `CalendarEngine` 變成 God Class。
- `monthGrids: Signal<CalendarDay[][]>` 型別維持單一語意（永遠是日網格），消費端不需要為了讀懂輸出而做聯集型別的 type narrowing。
- Single/Range/Multi 狀態轉換邏輯只有一份實作（純函式），`CalendarEngine` 與 `GranularityPickerEngine` 皆呼叫同一份，修 bug 或補 constitution 規則變動時只需改一處。
- `QuarterStartMonth` zero-default 避免套件偷渡「公曆季度」這個業務假設，延續 I4 Zero-default 精神的一致性，日後若使用者的產業慣例是財年季度也不會被套件預設值誤導。

### ❌ Negative

- 新增一個獨立的 Injectable 表示消費端要多學一組 Public API（`GranularityPickerEngine` 之於 `CalendarEngine`），而不是單一 `CalendarEngine` 一以貫之——文件與範例需要涵蓋兩個進入點。
- `CalendarEngine` 既有邏輯要 refactor 成呼叫共用純函式，M0-M6 累積的測試覆蓋（`calendar-engine.spec.ts`）在 refactor 過程中有回歸風險，必須先確保 refactor 是行為不變的重構（同一組測試全綠），才能視為完成。
- `CALENDAR_QUARTER_STARTS_ON` 強制注入意味著任何要用到 Quarter-picker 的消費端，若忘記提供這個 token，會在執行期直接拋錯而非得到一個「堪用」的預設行為——這是刻意的設計取捨，但會增加消費端的初始整合門檻（DX 成本）。

### 〰️ Neutral

- 已知風險：獨立 Injectable + 共用純函式的架構仍然會產生兩處呼叫點（`CalendarEngine` 呼叫一次，`GranularityPickerEngine` 呼叫一次），雖然邏輯本體不重複，但「膠水程式碼」（呼叫共用函式、包裝成各自的 signal 輸出）仍是兩份。緩解方式：共用純函式層做好單元測試覆蓋，兩個 class 的膠水層盡量薄，讓兩處呼叫點本身不太可能出現行為分岔。
- `GranularityCell` 目前不加判別欄位是基於「同一時間只有一種粒度」的現況假設；若未來出現消費端需要把不同粒度 cell 混在同一陣列處理的情境（目前無此需求），需要重新評估此決策，屆時可能需要 supersede 本 ADR 的這一部分。

## Alternatives Considered

### Option A: CalendarEngine 直接擴充 `selectionGranularity` 參數

- **是什麼**：不新增獨立 class，在既有 `CalendarEngine` 加入 `selectionGranularity` 輸入與對應的粒度分支邏輯，複用同一組 public API。
- **拒絕理由**：(1) `moveFocus()` 的跨月方向鍵演算法硬編碼假設 42 格（7×6）日網格版面（`GRID_SIZE`），月/季/年網格版面完全不同（12/4/N 格），塞進同一方法會產生大量粒度分支條件，形成 God Class。(2) `monthGrids` 已是 `Signal<CalendarDay[][]>`，若要讓同一 signal 同時吐出日網格與月/季/年網格，要嘛做聯集型別（消費端需自行 type narrowing，體驗差），要嘛開第二個輸出 signal——既然無論如何都要開第二個 signal，開一個新 class 的 Public API 複雜度增量與開新 signal 相差不大，選擇獨立 class 反而讓語意更清楚。

### Option B: 獨立 Injectable，但完全獨立實作，不抽共用純函式

- **是什麼**：`GranularityPickerEngine` 完全獨立於 `CalendarEngine`，Single/Range/Multi 的 draft/提交/中止回溯、Set 去重、toggle 語意在兩個 class 裡各寫一份。
- **拒絕理由**：會產生高度相似但物理獨立的兩份狀態轉換邏輯，維護成本高，未來 constitution 規則異動（例如 toggle 語意調整）時，兩處修改容易漏改一處，違反 DRY，且測試需要對兩份邏輯各驗證一次相同的邊界條件。

### Option C: `QuarterStartMonth` 給定預設值 0（公曆季度）

- **是什麼**：`CALENDAR_QUARTER_STARTS_ON` token 提供 `useValue: 0` 或等效 factory 作為預設，消費端不注入時自動視為公曆季度（1/4/7/10 月起始）。
- **拒絕理由**：公曆季度 vs 財年季度本質上跟語言/地區曆法慣例一樣是「業務判斷」，套件不該偷渡一個看似中性、實則預設公曆的假設，這與既有 `CALENDAR_LOCALE`（I4 Zero-default 精神）的判斷一致；反例 `CALENDAR_TODAY` 之所以有預設（`() => new Date()`）是因為「今天」本身不是業務判斷而是客觀事實，兩者性質不同，不能類比。

### Option D: `GranularityCell` 加入 `granularity` 判別欄位

- **是什麼**：`GranularityCell` 介面新增 `granularity: Granularity` 欄位，讓每個 cell 自帶粒度資訊。
- **拒絕理由**：同一個 `GranularityPickerEngine` 實例同一時間只有一種粒度在作用（呼應既有 `setSelectionMode()` 切換時一律重置狀態的慣例），消費端從呼叫的 signal/方法本身即可得知目前粒度，此欄位在目前唯一已知的使用情境下永遠是常數值，屬於 YAGNI；若未來真的出現「消費端需要把不同粒度 cell 混在同一陣列處理」的情境，屆時再評估加入，成本可控。

## Implementation Plan

- [x] PRD §7/§12 依本 ADR 結論同步更新（移除「未拍板」標註，填入定案的型別與 API 掛載位置），並將 §12 三條相關開放問題標記為已解決（2026-07-18）
- [ ] ~~開一份 Task Charter 界定「`CalendarEngine` 內嵌狀態轉換邏輯 refactor 成呼叫共用純函式」這個改動的邊界~~ → **owner 拍板延後（2026-07-18）**：M7 第一輪實作範圍不含這項 refactor，`CalendarEngine` 暫不改動，接受 Option B 提及的短期輕度重複；何時排入為獨立追蹤項，見 PRD §7「實作排程備註」
- [x] 新增共用純函式模組（`selection-state.ts`），以 `equalsFn`/`keyFn` 參數化 Single/Range/Multi 狀態轉換邏輯，含單元測試（2026-07-18）
- [ ] ~~將 `CalendarEngine` 既有內嵌邏輯改為呼叫共用純函式~~ → 延後，見上一項
- [x] 新增 `CALENDAR_QUARTER_STARTS_ON` token（`calendar.tokens.ts`），無預設 factory（2026-07-18）
- [x] 新增 `GranularityPickerEngine`（`granularity-picker-engine.ts`），呼叫共用純函式，輸出 `granularityGrids` signal 與粒度切換方法（2026-07-18）
- [x] M7 驗收：`GranularityCell` 不含判別欄位；Quarter-picker 未注入 `CALENDAR_QUARTER_STARTS_ON` 時實測拋錯（測試涵蓋於 `granularity-picker-engine.spec.ts`，2026-07-18）

## Notes

本 ADR 記錄的三項決策皆由 owner（jack755051）於 2026-07-18 對話中透過選項題親自拍板，非團隊共識討論或 POC 實驗結果；未附 benchmark 數據。Status 標為 Proposed 是因為決策本身已拍板但尚未落地為程式碼/PRD 同步，待 M7 實作完成並回頭同步 PRD 後，建議由 owner 確認改為 Accepted。

### 相關連結

- PRD: `.claude/prds/date-picker.md`（§6 資料模型第 283 行起、§7 API 契約第 426 行起、§12 開放問題第 573-575 行）
- Constitution: `.claude/constitutions/date-picker.md`（Decision 12，supersede Decision 8）
- 相關程式碼: `projects/date-picker/src/lib/calendar-engine.ts`（`moveFocus()` line 304-390，`monthGrids` line 110）、`projects/date-picker/src/lib/calendar-grid.ts`（`GRID_SIZE`/`buildMonthGrid` 純函式慣例範本）、`projects/date-picker/src/lib/calendar.tokens.ts`（`CALENDAR_LOCALE`/`CALENDAR_TODAY` 對照）
