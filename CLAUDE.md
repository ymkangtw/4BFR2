# CLAUDE.md

提供給 Claude Code 在本專案工作時的指引文件。

## 專案概述

4BFR2（肆號高爐第二爐代大修）項目資料庫與查詢網站。將 `R02NEW.xlsx` 內的兩個工作表匯入 SQLite，並提供 Web 介面查詢、篩選、檢視項目明細。架構參考 sibling 專案 `quotation`。

## 技術棧

| Layer | Technology |
|---|---|
| 前端框架 | Vue 3 (Composition API, `<script setup>`) + Element Plus |
| 建置工具 | Vite |
| 路由 | vue-router |
| HTTP 客戶端 | axios（攔截 response 錯誤統一以 `ElMessage` Toast 提示） |
| 後端框架 | Node.js + Express |
| 資料庫連線 | Sequelize（僅作連線管理，使用 Raw SQL 操作，不用 ORM Model） |
| 資料庫 | SQLite（檔名 `r02.db`） |
| Excel 解析 | `xlsx`（SheetJS） |
| 環境變數 | dotenv |

## 專案目錄結構

```
4BFR2/
├── R02NEW.xlsx                # 來源資料檔
├── analyze.py                 # Python 結構檢視腳本（uv 虛擬環境）
├── analysis.txt               # Excel 結構檢視輸出
├── CLAUDE.md                  # 本檔
├── README.md                  # 使用說明
├── package.json               # 根 workspace（client + server），dev / build / start / init-db scripts
├── server/
│   ├── .env                   # DB_PATH, APP_PORT
│   ├── .env.example
│   ├── app.js                 # Express 入口
│   ├── package.json
│   ├── data/
│   │   └── r02.db             # SQLite 檔（init-db.js 產出）
│   ├── models/
│   │   └── index.js           # sequelize 連線
│   ├── routes/
│   │   ├── index.js           # 自動載入同目錄 *.route.js
│   │   ├── r02.route.js
│   │   └── category.route.js
│   ├── ctrl/
│   │   ├── r02.ctrl.js
│   │   └── category.ctrl.js
│   └── scripts/
│       └── init-db.js         # 讀取 R02NEW.xlsx 建表＋匯入
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js         # alias '@' = src，dev proxy '/api' → :3000
    └── src/
        ├── main.js
        ├── App.vue            # 左側 el-aside 導覽列 + <router-view/>
        ├── router/
        │   └── index.js
        ├── service/
        │   ├── http.js        # axios 實例，response 錯誤 ElMessage Toast
        │   ├── r02.service.js
        │   ├── category.service.js
        │   ├── ollama.service.js
        │   └── admin.service.js  # 資料維護寫入 API 封裝
        ├── views/
        │   ├── Overview.vue   # 統計總覽（狀態/區域/系統類別三區塊長條圖）
        │   ├── ItemList.vue   # 主列表＋篩選（FilterBar 內聯，未獨立元件）
        │   ├── ItemDetail.vue # 單筆明細（el-descriptions + long-text class）
        │   ├── OllamaModels.vue # 本機 Ollama 模型清單
        │   └── AdminEdit.vue  # 資料維護（r02 / category 編輯）
        ├── components/        # 目前無共用元件（FilterBar 內嵌於 ItemList.vue）
        └── assets/
            └── style.css      # 全域樣式（page-header、long-text、el-table 配色）
```

## 資料庫結構

### Table `r02` （專案項目主表，490 筆 = Excel 491 列扣表頭）

| 欄位 | 型別 | 中文欄名 |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | — |
| `prjname` | TEXT | 專案名稱 |
| `itemid` | TEXT | 項目編號 |
| `applicant` | TEXT | 申請人 |
| `area` | TEXT | 區域 |
| `areaname` | TEXT | 區域名稱 |
| `categoryname` | TEXT | 系統類別（關聯至 `category.categoryname`） |
| `status` | TEXT | 狀態 |
| `combineid` | TEXT | 合併至編號 |
| `itemname` | TEXT | 項目名稱 |
| `spec` | TEXT | 規格數量 |
| `weight` | TEXT | 設備重量 |
| `class` | TEXT | 分類 |
| `description` | TEXT | 現況問題說明 |
| `purpose` | TEXT | 更新目的 |
| `implement` | TEXT | 建議方式 |
| `supply` | TEXT | 設計供應 |
| `workcontent` | TEXT | 內容規格 |
| `benefit` | TEXT | 預期效益 |
| `note` | TEXT | 批示 |

索引：`itemid`、`status`、`categoryname`、`area`、`combineid`

### Table `category` （系統類別對照表，14 筆）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | — |
| `code` | TEXT | 字母代碼（A~N） |
| `categoryname` | TEXT | 系統類別名稱（如 `A.儀錶控制系統(DCS)`） |

### 關聯說明

`r02.categoryname` 與 `category.categoryname` 為值對應的邏輯關聯，未在 SQLite 層宣告 FOREIGN KEY，以容許資料變動彈性。聯結查詢範例：

```sql
SELECT r.itemid, r.itemname, c.code, r.categoryname
FROM r02 r
LEFT JOIN category c ON r.categoryname = c.categoryname;
```

## Excel 匯入腳本（`server/scripts/init-db.js`）

設計原則參考 quotation 之 `init-db.js`：

1. 由 `.env` 讀取 `DB_PATH`，預設 `./data/r02.db`；`data` 目錄不存在時自動建立。
2. 每次執行先 `DROP TABLE IF EXISTS r02; DROP TABLE IF EXISTS category;` 後重建，確保來源 Excel 變動可重跑。
3. 用 `xlsx.readFile()` 讀 `../../R02NEW.xlsx`：
   - `Sheet1` 透過 `column_mapping`（中→英欄名）轉換後 `INSERT INTO r02`。
   - `系統類別` sheet 取前 2 欄、跳過全空列，`INSERT INTO category`。
4. 全程使用 `sequelize.query(..., { bind })` 參數綁定，避免 SQL 注入。
5. 結尾印出 `r02` / `category` 筆數作為自我驗證。

中→英欄名對照（來自使用者提供）：

```
專案名稱→prjname, 項目編號→itemid, 申請人→applicant, 區域→area,
區域名稱→areaname, 系統類別→categoryname, 狀態→status, 合併至編號→combineid,
項目名稱→itemname, 規格數量→spec, 設備重量→weight, 分類→class,
現況問題說明→description, 更新目的→purpose, 建議方式→implement,
設計供應→supply, 內容規格→workcontent, 預期效益→benefit, 批示→note
```

## 後端 API 設計

### REST 端點

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/r02` | 取得全部項目（含 `category.code` JOIN 為 `categorycode`，未做 server-side 分頁） |
| GET | `/api/r02/getby` | 條件查詢（白名單欄位 + `keyword` 多關鍵字 OR） |
| GET | `/api/r02/stats` | 統計總覽（依 status / categoryname / area 分組計數） |
| GET | `/api/r02/:itemid` | 取得單筆完整內容（含 `categorycode`） |
| GET | `/api/category` | 取得全部系統類別 |
| GET | `/api/ollama/models` | 取得本機 Ollama 已下載模型清單（後端 proxy `OLLAMA_URL/api/tags`） |
| GET | `/api/r02/distinct/:field` | r02 欄位的去重值清單（白名單欄位 `status`/`area`/`areaname`/`applicant`/`class`），編輯下拉用 |
| POST | `/api/r02` | 新增 r02 項目（必填 `itemid`/`prjname`/`itemname`，`itemid` 唯一檢查；Raw SQL `INSERT`） |
| PUT | `/api/r02/:itemid` | 更新 r02 項目（白名單欄位，禁改主鍵 `itemid`；Raw SQL `UPDATE`） |
| DELETE | `/api/r02/:itemid` | 刪除 r02 項目（若有其他項目 `combineid` 引用本筆，回 400） |
| POST | `/api/category` | 新增 category（`code`、`categoryname` 不可重複） |
| PUT | `/api/category/:id` | 更新 category；若 `categoryname` 改名，於 transaction 內 `UPDATE r02 SET categoryname` 同步，回傳 `{category, syncedR02}` |
| DELETE | `/api/category/:id` | 刪除 category（若 r02 仍引用此 categoryname，回 400） |
| GET | `/api/category/:id/refcount` | 查詢類別目前被 r02 引用筆數（前端改名前用於提示同步筆數） |

> 路由註冊順序：`/stats`、`/getby`、`/distinct/:field` 必須在 `/:itemid` 之前註冊，否則會被當成 itemid 處理。見 `server/routes/r02.route.js`。

### `getby` 白名單欄位

`itemid`, `status`, `categoryname`, `area`, `areaname`, `applicant`, `class`, `combineid`

### `keyword` 多欄位 OR

- query 參數 `keyword` 以空白分隔多個 token，每個 token 以 `LIKE '%token%'` 比對 r02 表全部 19 個欄位的 OR：
  `prjname`、`itemid`、`applicant`、`area`、`areaname`、`categoryname`、`status`、`combineid`、`itemname`、`spec`、`weight`、`class`、`description`、`purpose`、`implement`、`supply`、`workcontent`、`benefit`、`note`
- 多 token 之間為 AND（每個 token 都要在某個欄位中出現）。

### `getBy` 模式

- 值為空字串：以 `LIKE '%'` 表示不過濾。
- 值結尾帶 `%`：套用 `LIKE` 比對。
- 否則使用 `=` 精確比對。
- 非白名單欄位直接忽略，不組進 SQL。
- 沒有任何條件時退回 `getAll()`。

## 前端頁面規劃

### 路由

| 頁面 | 路由 | 說明 |
|---|---|---|
| Overview | `/` | 統計卡片（總筆數、各狀態筆數、合併比例）+ 分組長條圖（依系統類別） |
| Item List | `/list` | 主列表 + 多條件篩選 + el-table（show-overflow-tooltip） |
| Item Detail | `/detail/:itemid` | 單筆完整內容（多長文欄位以 `el-descriptions` 顯示，含換行） |
| Ollama Models | `/ollama` | 本機 Ollama 已下載模型清單（按鈕觸發載入；表格顯示模型名稱、參數量、量化、家族、格式、大小、修改時間、digest） |
| Admin Edit | `/admin` | r02 / category 資料維護（el-tabs 切換） |

### Overview

- 右上角 Total Items 大數字卡片
- 「狀態分布」表：el-tag 配色（未送出 info、已合併 warning、已取消 danger、送協辦單位確認中 primary、協辦單位確認完成 success），含筆數與佔比百分比 + el-progress 條
- 「區域分布」表：依區域代碼排序，比例條以該區段最大值為 100%
- 「系統類別分布」表：依 `category.code` 排序，比例條以最大值為 100%

### Item List

- FilterBar 內聯於 `ItemList.vue`（5 個欄位 + 查詢/重置按鈕，CSS Grid 佈局）：
  - 關鍵字輸入（送至後端 `keyword` 參數，比對全部 19 個欄位）
  - 系統類別下拉（讀 `/api/category`）
  - 狀態 / 區域 / 申請人下拉（從目前資料集去重）
- el-table 上方右側「顯示欄位」按鈕（`el-popover` + `el-checkbox-group`）：
  - 列出 r02 全部 19 個欄位選項（除 `id` 外）
  - 含「全選」master checkbox（支援 indeterminate 中間狀態）
  - 設定以 `localStorage`（key `r02-itemlist-columns`）持久化
  - 「操作」欄為固定欄（fixed=right），永遠顯示
- 結果 el-table（`show-overflow-tooltip`）：依 r02 欄位順序顯示全部 19 欄（系統類別僅顯示 `categoryname`，不加 `[code]` 徽章；狀態以 el-tag 呈現；合併至編號為 el-link 跳對應 detail），加上「操作」欄
- 雙擊列或點「檢視」跳 `/detail/:itemid`
- 不分頁：直接顯示全部資料（490 筆），超寬時水平捲動
- 載入中：`v-loading` 顯示「查詢中...」

### Item Detail

- 上方返回按鈕回 `/list`，標題為 `itemid + itemname`，右側 el-tag 顯示狀態
- 第一段 el-descriptions 三欄式顯示一般欄位（含 combineid 連結、系統類別僅顯示 `categoryname` 不加代碼徽章、建議方式跨三欄）
- 第二段 el-descriptions 一欄式顯示 6 個長文欄位：`spec`、`description`、`purpose`、`workcontent`、`benefit`、`note`，套 `.long-text` class（`white-space: pre-wrap`）保留 Excel 內 `\r\n` 換行
- `combineid` 點擊以 `router.push` 跳至對應項目，`watch(route.params.itemid)` 觸發重新載入

### Ollama Models

- 路由 `/ollama`，元件 `client/src/views/OllamaModels.vue`
- 標題列右側按鈕「載入模型清單」（首次點擊觸發載入；之後變「重新載入」）
- 透過 `OllamaService` 打 `GET /api/ollama/models`，後端再 proxy 至 `OLLAMA_URL/api/tags`
- el-table 8 欄：模型名稱（`name`）、參數量（`details.parameter_size`）、量化（`details.quantization_level`）、模型家族（`details.family`）、格式（`details.format`）、大小（byte 轉 GB / MB）、修改時間（YYYY-MM-DD HH:mm）、Digest（前 12 碼，monospace）
- 後端連不上 Ollama 時 503 + 錯誤訊息，前端 `service/http.js` 攔截器以 `ElMessage` Toast 顯示

#### Ollama 連線注意事項

- 後端用 Node 原生 `fetch` 打 Ollama，timeout 5 秒（`AbortSignal.timeout(5000)`），不依賴 LangChain
- LangChain JS（`@langchain/ollama`）只包裝推論端點（`/api/chat`、`/api/generate`、`/api/embeddings`），**不包含模型清單 API**；列模型必須直接打 `/api/tags`
- **Ollama daemon 必須先啟動**：執行 `ollama serve`、開 Ollama 桌面 app，或讓系統服務常駐。daemon 沒跑時 `/api/tags` 連不上
- **`OLLAMA_MODELS` 環境變數**：若模型放在非預設位置（預設 `%USERPROFILE%\.ollama\models`），daemon 必須在啟動時帶這個 env 才看得到。例如本機模型在 `D:\Model\ollama` 時：
  ```powershell
  [System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\Model\ollama', 'User')
  ```
  此設定僅對「之後新啟動」的 process 生效；既已開啟的 PowerShell 視窗看不到，必須關掉重開（或在當前視窗手動 `$env:OLLAMA_MODELS = 'D:\Model\ollama'` 後再 `ollama serve`）
- **驗證**：`curl http://localhost:11434/api/tags` 應回傳 `{"models":[ ... ]}`；若回 `{"models":[]}` 但 `ollama list` 有東西，代表 daemon 與 CLI 讀取的 `OLLAMA_MODELS` 不一致

### Admin Edit

- 路由 `/admin`，元件 `client/src/views/AdminEdit.vue`
- 頁面頂部顯示 init-db 重建警告（el-alert，type=warning），提醒「執行 `npm run init-db` 會重建資料表並清除所有編輯內容」
- 採 `el-tabs type="border-card"` 切換兩個子分頁：
  - **r02 項目 Tab**：
    - 篩選列：關鍵字 + 系統類別下拉 + 查詢 / 重置 / 新增項目按鈕（CSS Grid）
    - 顯示欄位勾選按鈕（`el-popover` + `el-checkbox-group` 全選 + indeterminate），localStorage key `r02-admin-columns`（與 ItemList 的 `r02-itemlist-columns` 分開），預設顯示 6 個關鍵欄位：`itemid`/`prjname`/`itemname`/`categoryname`/`area`/`status`
    - el-table 操作欄含「編輯 / 刪除」兩個 link 按鈕
    - 編輯/新增採 **el-drawer（rtl，720px）**，分四個區段：基本資訊 / 分類與狀態 / 規格資訊 / 長文描述
    - 必填欄位：`itemid`、`prjname`、`itemname`（前端 `ElMessage.warning` 提示，後端再次驗證）
    - 編輯時 `itemid` disabled 不可改；下拉欄位（`applicant`/`status`/`area`/`areaname`/`class`）採 `el-select` 並 `filterable allow-create`，options 從 `/api/r02/distinct/:field` 載入
    - `categoryname` 下拉取自 `/api/category`
    - `combineid` 採 `el-autocomplete`，從目前載入的 items 過濾建議（不打額外 API）
    - 寫入後局部更新 `items` 陣列（新增 `unshift`、編輯 `splice 同 index`、刪除 `splice`），不重新呼叫 `/api/r02`
  - **category 類別 Tab**：
    - 右上「新增類別」按鈕
    - el-table 三欄：代碼 / 類別名稱 / 操作
    - 編輯/新增 el-drawer 寬 480px，僅兩個必填欄位
    - **改 `categoryname` 同步機制**：儲存前先打 `/api/category/:id/refcount`，若 r02 引用 > 0 顯示 ElMessageBox 警告同步筆數，使用者確認後送 PUT；後端在 transaction 內 `UPDATE r02 SET categoryname` 並回傳 `syncedR02` 筆數；前端再 local 把 `items` 內舊 categoryname 替換成新值
    - 刪除前後端各做一次「r02 是否仍引用」檢查，引用中時阻擋並顯示筆數

## 開發規範（沿用全域 CLAUDE.md）

- 一律繁體中文回應，不可使用簡體字或大陸用語
- JS 變數／函式採小駝峰（`lowerCamelCase`）；資料庫欄位依使用者指定全小寫
- SQL 保持 inline 完整可見，不拆組片段
- Python 必走 `uv` 虛擬環境
- Node.js 套件以 `npm` 安裝
- 不過度封裝，保持直觀易懂
- 機密資料寫在 `.env`，不進 git

## 啟動流程

根目錄 `package.json` 採 npm workspaces（`client` + `server`），所有指令在 **4BFR2/ 根目錄**執行即可，不需切換子目錄。

```bash
# 1) 安裝依賴（一次安裝 root + client + server）
npm install

# 2) 建立資料庫（首次或 R02NEW.xlsx 變更後）
npm run init-db

# 3) 開發模式（concurrently 同時啟動前後端，單一終端）
npm run dev
#   server: nodemon app.js, port 3000
#   client: vite dev, port 5173 (proxy /api → :3000)

# 4) 正式部署（單一 server，express 同時提供 client/dist）
npm run build      # = npm run build -w client
npm start          # = npm start -w server，port 3000
```

### 根目錄 npm scripts

| Script | 對應指令 | 用途 |
|---|---|---|
| `npm run dev` | `concurrently` 同跑 server / client 的 dev | 開發模式 |
| `npm run build` | `npm run build -w client` | 產出 `client/dist` |
| `npm start` | `npm start -w server` | 正式啟動 express |
| `npm run init-db` | `node server/scripts/init-db.js` | 重建 SQLite 資料庫 |

## 重新匯入 Excel

當 `R02NEW.xlsx` 內容更新後，於根目錄執行：

```bash
npm run init-db
```

`init-db.js` 每次先 DROP TABLE 再重建並重新匯入，可直接重跑。

## SPA Fallback

`server/app.js` 與 quotation 同：
- 先 mount `/api/*` 路由
- `app.use(express.static('../client/dist'))`
- 最後 `app.use((req,res)=>res.sendFile('../client/dist/index.html'))` 處理瀏覽器重整時的非 API 路由
