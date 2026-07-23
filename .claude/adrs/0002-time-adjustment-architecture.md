---
schema_version: 1
adr_id: 0002
title: time-adjustment-architecture
status: Superseded by ADR-0003
date: 2026-07-23
deciders: [jack755051]
related: ["ADR-0001", "ADR-0003 (supersedes this ADR)", "PRD: .claude/prds/date-picker.md §6/§7/§12", "Constitution: .claude/constitutions/date-picker.md Decision 15/R9/§4"]
---

> ⚠️ **Superseded by ADR-0003（同日，2026-07-23）**：本 ADR 拍板「併入既有 `CalendarEngine`」的核心架構決策已被推翻，改採獨立 Injectable `TimeAdjustmentEngine`（見 `.claude/adrs/0003-time-adjustment-engine-decoupling.md`）。推翻原因：owner 事後確認 sanring-ui 實際消費時/分功能會透過 sanring 正在建置的 engine+widget 套件（而非繞過 Widget 層直接注入裸 `CalendarEngine`），這解除了本 ADR 拒絕「獨立 Injectable」候選方案時所依賴的核心前提（見下方 Alternatives Option A 的拒絕理由）。本文件原文保留不刪改，供歷史追溯；guard hook 單一 predicate 簽章、precision enum 形狀與 `'hour-minute'` 預設值等技術判斷已被 ADR-0003 沿用維持不變，僅「掛載位置」這一項被推翻。

# ADR-0002: Time Adjustment 架構決策——併入 CalendarEngine + 獨立共用純函式模組，排除 GranularityPickerEngine

## Context

- **觸發事件**：憲法 Decision 15（2026-07-22 delta）新增 R9/§4「時間調整」狀態機，明文將「engine 架構落地方式（併入既有 `CalendarEngine`/`GranularityPickerEngine` 或獨立模組，比照 Decision 12 `GranularityPickerEngine` 先例）」列為技術實作細節，留待 PRD/ADR 階段定案，不寫入憲法。PRD 已完成 delta 同步（新增 Story 12、§6 型別草案 `TimePrecision`/`TimeValue`/`TimeGuardMatcher`/`TimeAdjustmentDraft`、§7 API 草案 `updateTime()`/`confirmTime()`/`abortTimeDraft()`/`setTimePrecision()`/`setTimeGuard()`），M8 里程碑排程留白「待定」，§12 開放問題第一條即明確要求「啟動 M8 前先走 `/supervisor:adr` 正式拍板」，不在 PRD 層級預先選定。
- **相關背景**：PRD §9 風險表已標記此為 `high` 風險項——若架構選錯方向，後續重構成本可能很高（比照 Decision 12/`GranularityPickerEngine` 架構決策的既有前例：選錯「單一 Engine 擴充」或「獨立 Injectable」事後都要回頭大改已發布的 Public API Surface，違反 R5「一旦公開即需維持相容」的精神）。PRD §12 另有 5 條技術性開放問題與架構決策直接綁定（guard hook 型別、precision 參數形狀與預設值、Range/Multi 的 targetDate 定位方式），本 ADR 一併拍板。
- **既有狀況**：`CalendarEngine`（`projects/date-picker/src/lib/calendar/calendar-engine.ts`，564 行）已用 `private readonly _draftStart = signal<Date | null>(null)`（line 78）承載 Range Draft，`abortRangeDraft(): void { this._draftStart.set(null); }`（line 508-509）是「draft 從未寫入 `selectedRange`，中止免回溯」設計的具體落地——這正是 Decision 15 §4 時間調整狀態機（「時間 Draft → 中止 → 回溯到 Draft 產生前的 committed 舊值」）在既有程式碼裡唯一的同構前例。`shared/selection-state.ts`（87 行，無 Angular 依賴的純函式模組）已用 `advanceRangeDraft`/`toggleSingleSelection`/`toggleMultiSelection`/`filterSelectedDates` 建立「參數化純函式（`equalsFn`/`keyFn`）+ 各 class 自行持有 signal 狀態、不共用狀態實例」的既有慣例，ADR-0001 已用此慣例讓 `CalendarEngine` 與 `GranularityPickerEngine`（617 行，獨立 `@Injectable`）共用邏輯而不共用狀態。`GranularityPickerEngine` 目前完全不知道 `CalendarEngine` 的存在，兩者是不同 Aggregate Root（PRD §6「狀態邊界」段落，ADR-0001 已拍板兩者不合併）。憲法 Decision 15 原文用詞是「使用者先完成日期選取」而非「期間/粒度選取」，且 PRD Story 12 驗收條件全數以 `selectedDate`/`selectedRange`/`selectedDates`（`CalendarEngine` 既有輸出）為前提，未提及 `granularityGrids`。

## Decision

**我們決定**：時/分調整狀態機**併入既有 `CalendarEngine`**，**不開新 Injectable**（如候選 1 的 `TimeAdjustmentEngine`），**不整合 `GranularityPickerEngine`**（本次排除，範圍僅限日粒度）。Draft/Confirm/Abort 的狀態轉換邏輯抽成新的獨立純函式模組 `shared/time-adjustment-state.ts`，比照 ADR-0001 已建立的「參數化純函式共用、狀態各自持有」慣例，由 `CalendarEngine` 自行持有 `Map<string, TimeAdjustmentDraft>` signal 並呼叫這批純函式——即候選 3 的精修版。

**拍板核心理由**：候選 1（完全解耦的獨立 Injectable）在「confirm 寫回」這一步存在結構性缺口——憲法 R2 早已確立 `selectedDate` 必須保留完整時分秒（「使用者選取值 selectedDate 保留時分秒」），Decision 15 §4 也明文「兩者合成一個完整 `Date`」，代表 `selectedDate`/`selectedRange`/`selectedDates` 必須永遠是「日期+時間」合一的單一事實來源。若 `TimeAdjustmentEngine` 真的與 `CalendarEngine` 互不知道對方存在，`confirmTime()` 提交後，時間值只會停留在 `TimeAdjustmentEngine` 自己的狀態裡，`CalendarEngine.selectedDate` 依然是提交前的舊值（時間分量停在 `00:00:00` 或上一次 committed 值）——除非額外引入跨 engine 的同步膠水邏輯，但那樣一來候選 1 宣稱的「兩者解耦、互不知道對方存在」就不成立，等於用假裝的解耦換來實質的隱性耦合。這與 ADR-0001 拒絕 Option A（`CalendarEngine` 直接擴充）的理由性質不同：Decision 12 的問題核心是「網格版面/輸出 signal 型別不相容」，而 Time Adjustment 沒有這個問題（時間調整不是網格渲染，沒有 42/12/4/N 格版面衝突），所以 ADR-0001 「開新 class」的理由在這裡不成立。相對地，讓 `CalendarEngine` 自己持有 Draft Map，`confirmTime()` 可以直接讀寫自己內部的 `_selectedDate`/`_selectedRange`/`_selectedDates`，寫回路徑零跨 class 協調成本，且完全比照 `abortRangeDraft()` 既有「Draft 從未寫入 committed，中止免回溯」的零風險設計——這正是候選 3 相對候選 1 最站得住腳的地方。

候選 2（直接內嵌邏輯、不抽純函式）則違反 ADR-0001 已建立的既有慣例：`CalendarEngine` 已經 564 行，若把 Draft/Confirm/Abort 狀態轉換邏輯直接寫死在方法內部，會讓這段本可獨立單元測試的邏輯必須透過 `TestBed`/DI 才能測試，且未來若 `GranularityPickerEngine` 真的出現時間調整需求（雖本次排除，但不代表永遠不會發生），候選 2 會逼迫在兩個 class 各寫一份幾乎相同的狀態轉換邏輯——這正是 ADR-0001 明確拒絕 Option B（獨立 Injectable 但不共用純函式）的理由，候選 2 犯的是同一種錯誤，只是換了個位置。

### 實作要點

- 新增檔案 `projects/date-picker/src/lib/shared/time-adjustment-state.ts`：匯出型別 `TimePrecision`/`TimeValue`/`TimeGuardMatcher`/`TimeAdjustmentDraft`（型別內容比照 PRD §6 既有草案，型別**命名**本身不在本 ADR 討論範圍，維持 PRD 暫定命名）；匯出三個不可變 Map 更新純函式，比照 `filterSelectedDates`/`toggleMultiSelection` 既有「回傳新 Map、不原地修改」慣例：
  - `startOrUpdateTimeDraft(drafts, key, value, guard?)`：guard 命中則原樣回傳輸入 Map（靜默拒絕，Draft 不變，呼應 I2/R7/Decision 13 一致性原則）；否則回傳新增/更新該 key 的新 Map。
  - `commitTimeDraft(drafts, key)`：回傳 `{ drafts: 移除該 key 後的新 Map, committedValue: TimeValue | null }`——`committedValue` 交由呼叫端（`CalendarEngine`）自行合成回目標 `Date` 並寫入自己的 `_selectedDate`/`_selectedRange`/`_selectedDates`，純函式本身不知道也不需要知道 `CalendarEngine` 的存在。
  - `removeTimeDraft(drafts, key)`：單純從 Map 移除該 key，比照 `abortRangeDraft()` 的「無需回溯」精神——因為 committed 值從未被 Draft 寫入過，移除 Draft 即完成中止。
- `CalendarEngine` 新增私有狀態：`_timeDrafts = signal<ReadonlyMap<string, TimeAdjustmentDraft>>(new Map())`、`_timeGuard = signal<TimeGuardMatcher | undefined>(undefined)`、`_timePrecision = signal<TimePrecision>('hour-minute')`（預設值判斷見下）。
- 新增方法掛載於 `CalendarEngine`（示意用語，非最終命名，比照 `updateTime()`/`confirmTime()`/`abortTimeDraft()`/`setTimePrecision()`/`setTimeGuard()` PRD 草案）：這些方法內部依目前 `selectionMode` 解析 `targetDate` 對應的內部 key——
  - **Single**：固定 key（如 `'single'`），且需檢查 `selectedDate() !== null`，否則靜默拒絕/no-op（呼應 Story 12「尚未選取任何日期時呼叫應被拒絕」的驗收條件）。
  - **Range**：**不能只靠 `Date` 值比對**——見下方「Range targetDate 辨識」子決策，需搭配一個角色判別參數解析為對應起點/終點的固定 key（如 `'range-start'`/`'range-end'`，具體參數/key 命名留待實作階段，非本 ADR 決議範圍）。
  - **Multi**：沿用既有 `Map<string, Date>` 正規化 key 慣例（`selectedDates` 容器已建立的 keyFn），對集合中不存在的 `targetDate` 靜默拒絕/no-op。
  - `confirmTime()` 內把 `commitTimeDraft()` 回傳的 `committedValue` 合成回目標的 `Date` 物件（保留原日期的年/月/日，覆寫時/分/秒分量），透過與既有內部寫入邏輯相同的路徑更新 `_selectedDate`/`_selectedRange`/`_selectedDates`（不是重新呼叫 `setSelectedDate()` 等 R7 公開方法，避免多繞一層合法性檢查——guard hook 已在 `updateTime()` 階段檢查過，confirm 階段不重複驗證）。
- `setSelectionMode()` 既有「切換模式一律重置」慣例（`selectedDate`/`selectedRange`/`selectedDates`/`draftStart`）**延伸涵蓋 `_timeDrafts`**——切換選取模式時一併清空所有時間 Draft，避免殘留跨模式的幽靈 Draft。
- `GranularityPickerEngine` **本次不整合，維持現狀不動**：Decision 15 原文用詞「使用者先完成日期選取」、PRD Story 12 驗收條件全部錨定 `CalendarEngine` 既有輸出，判斷此需求範圍僅限日粒度；若未來 `GranularityPickerEngine` 真的出現時間調整需求，應另開新 ADR 評估是否重用 `shared/time-adjustment-state.ts` 純函式（大機率可以直接重用，因為此模組不依賴 `CalendarEngine` 的任何內部細節）。

### 附帶技術判斷（PRD §12 開放問題，技術判斷非業務判斷，owner 可推翻）

1. **`TimeGuardMatcher` 型別簽章 → 採單一 predicate `(date: Date, time: TimeValue) => boolean`，不採 matcher-based 設計**：R4 `DateMatcher`（`Date | Date[] | DateInterval | Function`）之所以成立，是因為它測試的是「這個日期是否屬於某個日期集合/區間」——單一日期、日期陣列、日期區間三種靜態集合表達方式在「日期成員資格」這個語意下都合理。但 `TimeGuardMatcher` 要判斷的是「這個 (日期, 時間) 組合是否違反業務規則」，這是動態的組合判斷，不是靜態集合成員資格測試——很難用 `Date`/`Date[]`/`Interval` 自然表達「時間介於 9:00-17:00」這種跨日期恆定的時段限制。單一 predicate 已是最大彈性（消費端可以在函式內部自行組合任意邏輯），且呼應憲法明文「engine 不在此 guard hook 內建任何商業規則」的 Zero Opinion 精神——matcher-based 設計反而暗示 engine 要理解某種特定的時間集合表達方式，這超出了 engine 該管的範圍。
2. **Precision 參數形狀 → 採 enum `'hour' | 'hour-minute' | 'hour-minute-second'`，不採 numeric step**：憲法原文「顆粒度精度（僅小時、或小時+分鐘，是否含秒）」明確描述的是「哪些時間單位有意義」這個離散分層問題，與 `TimeValue` 介面草案（`hours`/`minutes?`/`seconds?`）的可選欄位結構直接對應。Numeric step（如「最小刻度 5 分鐘」）是完全不同維度的參數——它控制「調整介面每次增減的步進量」，不是「哪些欄位存在」，兩者可以並存但不能互相取代；本 ADR 不預先加入 numeric step（YAGNI，PRD/憲法皆未提及此需求），若未來有此需求可另加獨立參數，不影響 enum 本身。
3. **Precision 未指定時的預設行為 → 給合理預設值 `'hour-minute'`，不採 Zero-default 強制注入**：判斷依據是「業務判斷」與「中性呈現層設定」的分類標準——`CALENDAR_LOCALE`/`CALENDAR_QUARTER_STARTS_ON` 之所以 Zero-default，是因為任何預設值都會**悄悄替消費端做出一個可能錯誤的業務假設**（例如預設公曆季度，對財年制企業就是錯的假設，且引擎無從得知何時該注意到這個錯誤）。Precision 不具備這種「預設即可能錯」的性質——一個 app 預設用 `'hour-minute'` 並不會悄悄替消費端做出任何錯誤的業務決策，純粹是輸入介面粒度的呈現選擇，性質上更接近 `setGridColumns()` 預設 `3`（純視覺/佈局選擇，沒有「對錯」，只有「多數情境是否適用」）。多數時間選擇器情境（含 sanring-ui 本身）預設到分鐘級別是合理常見選擇，不強制注入可降低整合門檻，且不違反任何 Zero Opinion 精神（Zero Opinion 針對的是「業務規則假設」，不是「呈現粒度選擇」）。
4. **Range 模式如何辨識 `targetDate` 對應起點或終點 → 需要額外的角色判別參數，不能單純用 `Date` 值比對**：關鍵風險是**同日 Range**（起點與終點恰為同一個日曆日，R8 天數上下限允許 `minDays=1`）——若單純用 `Date` 值（或其正規化字串 key）決定 Draft 該存進 Map 的哪個位置，起訖點同一天時會產生 key 碰撞，導致兩個本該獨立的 Draft 互相覆蓋，直接違反 R9「Range 模式起訖點各自獨立管理」的明文規則。這與 PRD §9 風險表已預警的「JavaScript 原生 `Date` 不支援結構相等比較」是同一類風險的變體，只是這次不是「誤判為同一天」，而是「起訖點真的是同一天但語意上是兩個不同實體」。因此必須額外攜帶角色判別資訊（具體參數形狀/命名留待實作階段，非本 ADR 決議範圍，但**結構上必須存在**）。
5. **Multi 模式如何定位集合中的目標成員 → 沿用既有 `Map<string, Date>` 正規化 key 慣例即可**：`selectedDates` 容器既有的正規化 key 機制已解決「同一天不同物件實例」的識別問題（PRD §9 風險表、§6 技術判斷已覆蓋），Time Draft 的 Multi 定位可直接複用同一套 key 正規化邏輯，不需要另外設計。

## Consequences

### ✅ Positive

- 避免候選 1（完全解耦獨立 Injectable）的結構性缺口——`confirmTime()` 不需要任何跨 engine 同步膠水邏輯，`CalendarEngine.selectedDate`/`selectedRange`/`selectedDates` 永遠保持 R2「合成完整 Date」的單一事實來源承諾，不會出現「引擎內部兩份狀態互相脫節」的風險。
- 延續 ADR-0001 已建立的純函式共用慣例，`shared/time-adjustment-state.ts` 可獨立單元測試（不需 `TestBed`），且未來若 `GranularityPickerEngine` 真的需要時間調整，此模組大機率可直接重用（它完全不依賴 `CalendarEngine` 的任何內部細節）。
- Abort 路徑複用 `abortRangeDraft()`「Draft 從未寫入 committed，中止零回溯風險」的既有驗證過的設計模式，不需要重新發明一套快照/回溯機制。
- Range 同日碰撞風險在架構決策階段就被攔截，避免等到實作/測試階段才發現此 edge case（比 Multi「同一天不同物件實例」的風險更隱蔽，因為它不是物件參照問題，而是「業務上兩個不同實體恰好日期相同」）。

### ❌ Negative

- `CalendarEngine`（現有 564 行）的公開 API 表面持續擴張——即使內部邏輯委派給純函式，新增的 5 個公開方法 + 3 個私有 signal 仍會讓這個 class 繼續變大，這是 PRD §9 風險表已預警的既有趨勢（R7/R8 API 增長/版本 churn 顧慮）的延續，不是本 ADR 新製造的問題，但本 ADR 的決定沒有減緩這個趨勢。
- 明確排除 `GranularityPickerEngine` 整合意味著：若未來 sanring-ui 真的需要「月/季/年 picker + 時/分」組合（目前無此需求，憲法用詞也不支持），需要重新開一份新 ADR 評估架構，屆時本 ADR 拍板的「Draft Map 掛在 `CalendarEngine`」這個決定可能需要被 supersede 或至少重新驗證是否可平行套用到 `GranularityPickerEngine`。
- Range 模式新增的角色判別參數需求，代表 PRD §7 草案原本「`updateTime(targetDate: Date, time: TimeValue)` 對 Single/Range/Multi 三模式統一簽章」的假設不成立——Range 模式的方法簽章會比 Single/Multi 多一個參數，API 形狀不再完全對稱，需要在後續 PRD 同步時明確反映，並在文件/TSDoc 說明為何 Range 特殊。

### 〰️ Neutral

- Precision 預設值分類為「呈現層中性設定」而非「業務判斷」，是本 ADR 最容易被 owner 推翻的一個判斷——若 owner 認為 sanring-ui 或未來企業專案對「預設精度」有隱性業務期待（例如某些金融場景預設必須含秒，遺漏會有合規風險），這個分類判斷需要重新評估，屆時應改為 Zero-default 強制注入。
- `TimeGuardMatcher` 採單一 predicate 而非 matcher-based，代表消費端若想要「陣列式多條件 OR 判斷」的 R4 式便利性，需要自行在 userland 組合（例如 `(date, time) => matchers.some(m => m(date, time))`），engine 不提供這層便利——這是刻意的 Zero Opinion 取捨，非疏漏。
- `setSelectionMode()` 切換模式時一併清空 `_timeDrafts` 是本 ADR 主動新增的一致性延伸（憲法/PRD 未明文提及此邊界情境），屬於「依既有慣例合理外推」而非「憲法/PRD 明文規則」，實作時需補上對應測試案例，且應在 PRD 同步時明確記錄此為 ADR 階段補上的邊界規則。

## Alternatives Considered

### Option A: 候選 1——獨立 Injectable `TimeAdjustmentEngine`，與 `CalendarEngine`/`GranularityPickerEngine` 完全解耦

- **是什麼**：新開一個獨立 `@Injectable` class，內部以 `Map<string, TimeAdjustmentDraft>` 管理任意數量的時間 Draft，`CalendarEngine`/`GranularityPickerEngine` 把自己的 `Date` 值傳給它換取對應 Draft 狀態，兩者互不知道對方存在。
- **拒絕理由**：`confirmTime()` 提交後的合成值必須寫回 `CalendarEngine.selectedDate`/`selectedRange`/`selectedDates`（R2 明文「selectedDate 保留時分秒」、Decision 15「兩者合成一個完整 Date」），若兩個 class 真的互不知道對方存在，這一步寫回無法完成，除非額外引入跨 engine 同步膠水邏輯——但那樣候選 1 宣稱的「解耦」就名不符實，變成用假裝的解耦換取實質的隱性耦合，且這層膠水邏輯要嘛塞進 `TimeAdjustmentEngine`（需要注入 `CalendarEngine` 參照，違反「互不知道對方存在」）要嘛塞進消費元件（需要消費端手動同步兩個 engine 的狀態，增加整合負擔且容易漏做，等同把 R1「引擎解耦」的責任錯誤下放給外殼）。

### Option B: 候選 2——直接在 `CalendarEngine` 內部擴充，不抽純函式

- **是什麼**：新增 `_timeDrafts` signal 等狀態直接內嵌在 `CalendarEngine` 方法內部，狀態轉換邏輯不獨立抽出，`GranularityPickerEngine` 若未來需要則各自另外擴充一份。
- **拒絕理由**：違反 ADR-0001 已建立的「參數化純函式共用」慣例（`shared/selection-state.ts` 的 `advanceRangeDraft`/`toggleMultiSelection` 等）；內嵌邏輯無法脫離 `TestBed`/DI 獨立單元測試；若未來 `GranularityPickerEngine` 真的出現時間調整需求，會被迫複製一份幾乎相同的狀態轉換邏輯——這正是 ADR-0001 明確拒絕 Option B（獨立 Injectable 但不共用純函式）的理由，候選 2 犯的是同一種錯誤，只是換了個位置。

### Option C: `TimeGuardMatcher` 採 matcher-based 設計（比照 R4 `DateMatcher`）

- **是什麼**：`TimeGuardMatcher` 型別比照 `DateMatcher = Date | Date[] | DateInterval | Function`，支援單一時間值、時間陣列、時間區間、自訂函式四種輸入形式。
- **拒絕理由**：`DateMatcher` 測試的是「靜態日期集合成員資格」，`TimeGuardMatcher` 測試的是「(日期, 時間) 動態組合是否違反規則」，語意層級不同；`Date`/`Date[]`/`Interval` 三種靜態表達方式無法自然表達「時段限制」（例如「9:00-17:00 之外不可選」跨越所有日期恆定成立，不是任何單一日期/區間/陣列能表達的概念），硬套用會比 R4 原始設計更牽強，也違反「engine 不內建商業規則」的 Zero Opinion 精神。

### Option D: Precision 採 numeric step（如「以分鐘為單位的最小刻度」）而非 enum

- **是什麼**：`TimePrecision` 改為數值型（例如 `stepMinutes: number`），透過步進值間接決定顯示粒度（`stepMinutes >= 60` 視為僅小時、`stepMinutes < 60` 視為含分鐘）。
- **拒絕理由**：憲法原文「僅小時、或小時+分鐘，是否含秒」描述的是離散分層問題（哪些時間單位存在），numeric step 描述的是完全不同維度的問題（調整介面的步進量），兩者概念上不能互相取代——用 numeric step 反推「哪些欄位該顯示」需要額外的推導邏輯（例如 `stepMinutes` 到底該對應到 `hour-minute` 還是 `hour-minute-second`，語意不清），enum 直接對應 `TimeValue` 既有可選欄位結構更清楚。

### Option E: Precision 採 Zero-default 強制注入（比照 `CALENDAR_QUARTER_STARTS_ON`）

- **是什麼**：新增 `CALENDAR_TIME_PRECISION`（`InjectionToken<TimePrecision>`），無預設 factory，消費端未注入時 Angular DI 直接拋錯。
- **拒絕理由**：Precision 不具備 `CALENDAR_LOCALE`/`CALENDAR_QUARTER_STARTS_ON` 那種「任何預設值都是對某些消費端錯誤的業務假設」的性質——它是呈現層粒度選擇，不是業務規則，強制注入只會提高整合門檻卻沒有對應的風險規避效益（詳見上方 Decision 子決策 3 的完整論證）。

### Option F: Range 模式 `targetDate` 直接用 `Date` 值比對，不加角色判別參數

- **是什麼**：`updateTime(targetDate: Date, time: TimeValue)` 對 Single/Range/Multi 三模式維持統一簽章，Range 模式內部用 `targetDate` 是否等於（或正規化後等於）`selectedRange().start`/`.end` 來判斷角色。
- **拒絕理由**：同日 Range（起訖點恰為同一天，R8 允許 `minDays=1`）會導致單純日期比對無法區分「這是起點的時間調整」還是「這是終點的時間調整」，屬於真實存在的正確性缺陷，不是理論上的邊界情況；PRD §9 風險表已預警類似風險（原生 `Date` 無結構相等比較），此為同類風險的變體，必須在架構階段攔截，不能留到實作階段才發現。

## Implementation Plan

- [ ] 新增 `projects/date-picker/src/lib/shared/time-adjustment-state.ts`：`TimeValue`/`TimeGuardMatcher`/`TimeAdjustmentDraft`/`TimePrecision` 型別 + `startOrUpdateTimeDraft()`/`commitTimeDraft()`/`removeTimeDraft()` 三個純函式，含單元測試（涵蓋 guard 命中拒絕、confirm 合成值正確性、abort 零回溯正確性）
- [ ] `CalendarEngine` 新增 `_timeDrafts`/`_timeGuard`/`_timePrecision` 私有 signal，新增 `updateTime()`/`confirmTime()`/`abortTimeDraft()`/`setTimePrecision()`/`setTimeGuard()` 方法（示意命名，實際命名待 owner 另行拍板，不影響本 ADR 的掛載位置決議）
- [ ] `CalendarEngine` 內解析 Single/Range/Multi 三種模式的 targetDate → 內部 key 對映邏輯，Range 模式明確需要角色判別參數（具體參數形狀留待實作階段）
- [ ] `setSelectionMode()` 既有重置邏輯延伸涵蓋 `_timeDrafts`，補上對應測試
- [ ] `GranularityPickerEngine` 本次不動，於程式碼加註解 TODO 引用本 ADR 說明排除範圍與未來評估路徑
- [ ] `calendar-engine.spec.ts` 擴充測試：Single 模式「尚未選取日期時呼叫應拒絕」、Range 模式「同日起訖點各自獨立 Draft 不互相碰撞」、Multi 模式「集合成員各自獨立 Draft」、guard hook 靜默拒絕、confirm 合成值寫回、abort 零回溯
- [ ] PRD §6/§7/§12 同步：標記本 ADR 涵蓋的 6 條開放問題（架構決策、guard 型別、precision 形狀、precision 預設、Range targetDate 辨識、Multi key 沿用）為已解決並回填連結；方法命名/M8 排程兩條開放問題維持開放，留待 owner 另行拍板
- [ ] owner review 本 ADR 全文後，將 `status` 由 `Proposed` 改為 `Accepted`（或提出修正意見後由 AI/主 Claude session 修訂再送審）

## Notes

本 ADR 是 AI（Supervisor）分析既有程式碼模式（`calendar-engine.ts` 的 `_draftStart`/`abortRangeDraft()`、`shared/selection-state.ts` 的參數化純函式慣例、ADR-0001 的既有拍板邏輯）後提出的**技術判斷提案**，非 owner 親口逐字拍板——這點與 ADR-0001（三項決策皆由 owner 於對話中透過選項題親自拍板）性質不同。owner（jack755051）已於 2026-07-23 review 全文並確認同意，`status` 由 `Proposed` 改為 `Accepted`。

本 ADR 未包含 benchmark 數據或 POC 實驗結果，純粹是既有程式碼模式與憲法/PRD 條文的邏輯推演；若 owner 對「Range 同日碰撞」「confirm 寫回耦合」等判斷有不同看法，建議直接在此 ADR 的 Alternatives Considered 段落補充新選項後重新裁決，不需要另開新 ADR。

### 相關連結

- PRD: `.claude/prds/date-picker.md`（§6 型別草案第 377-415 行、§7 API 草案第 551-572 行、§9 風險表第 618-620 行、§12 開放問題第 713-724 行）
- Constitution: `.claude/constitutions/date-picker.md`（Decision 15 第 371-399 行、R9 第 53 行、§4 時間調整第 140-168 行、§9 第 413 行）
- 相關 ADR: ADR-0001（`granularity-picker-independent-engine`，同一組 owner 已拍板的架構決策先例，本 ADR 延續其純函式共用慣例但做出不同的「是否開新 Injectable」判斷）
- 相關程式碼: `projects/date-picker/src/lib/calendar/calendar-engine.ts`（`_draftStart` line 78、`_selectedDates` line 85、`isDraftActive` line 105、`abortRangeDraft()` line 508-509、`moveFocus()` line 315）、`projects/date-picker/src/lib/shared/selection-state.ts`（`advanceRangeDraft`/`toggleSingleSelection`/`toggleMultiSelection`/`filterSelectedDates`，87 行）、`projects/date-picker/src/lib/granularity/granularity-picker-engine.ts`（617 行，本次排除整合）、`projects/date-picker/src/lib/shared/calendar.tokens.ts`（`CALENDAR_LOCALE`/`CALENDAR_TODAY`/`CALENDAR_QUARTER_STARTS_ON` 對照，Zero-default 判斷參照）
