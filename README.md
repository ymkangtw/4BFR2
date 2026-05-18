# 4BFR2 專案資料庫與查詢網站

肆號高爐第二爐代大修（4BFR2）項目清單資料庫與 Web 查詢介面。將 `R02NEW.xlsx` 匯入 SQLite，提供統計總覽、列表查詢、明細檢視。

## 技術棧

- **前端**：Vue 3 + Element Plus + Vite + vue-router + axios
- **後端**：Node.js + Express + Sequelize（Raw SQL）+ SQLite
- **Excel 解析**：`xlsx`（SheetJS）

架構參考 sibling 專案 `quotation`，採 client / server 分離。

## 目錄結構

```
4BFR2/
├── R02NEW.xlsx              # 來源資料檔
├── package.json             # 根 workspace（client + server），統一管理 dev / build / start / init-db
├── server/
│   ├── app.js               # Express 入口（同時提供 client/dist 靜態檔）
│   ├── .env                 # DB_PATH=./data/r02.db, APP_PORT=3000
│   ├── data/r02.db          # SQLite 檔（init-db.js 產出）
│   ├── models/              # sequelize 連線管理
│   ├── routes/              # *.route.js 由 routes/index.js 自動載入
│   ├── ctrl/                # controller (getAll, getBy, ..., ollama proxy)
│   └── scripts/init-db.js   # Excel→SQLite 匯入腳本
└── client/
    ├── vite.config.js       # alias '@' = src，dev proxy '/api' → :3000
    └── src/
        ├── App.vue          # 左側導覽（可收合）+ <router-view/>
        ├── main.js
        ├── views/           # Overview / ItemList / ItemDetail / OllamaModels / AdminEdit
        ├── service/         # axios 實例 + r02 / category / ollama / admin service
        ├── util/exportExcel.js # 通用 xlsx-js-style 匯出（標題粗體置中、自動欄寬列高）
        ├── router/          # / → Overview, /list, /detail/:itemid, /ollama, /admin
        └── assets/style.css # 全域樣式（page-header, long-text 換行保留）
```

## 資料庫結構

### `r02` — 專案項目主表（490 筆）

| 欄位 | 中文欄名 | 備註 |
|---|---|---|
| `id` | — | 自動遞增主鍵 |
| `prjname` | 專案名稱 | |
| `itemid` | 項目編號 | 索引 |
| `applicant` | 申請人 | |
| `area` | 區域 | 索引 |
| `areaname` | 區域名稱 | |
| `categoryname` | 系統類別 | 索引；←→ `category.categoryname` |
| `status` | 狀態 | 索引 |
| `combineid` | 合併至編號 | 索引 |
| `itemname` | 項目名稱 | |
| `spec` | 規格數量 | |
| `weight` | 設備重量 | |
| `class` | 分類 | |
| `description` | 現況問題說明 | 長文 |
| `purpose` | 更新目的 | 長文 |
| `implement` | 建議方式 | |
| `supply` | 設計供應 | |
| `workcontent` | 內容規格 | 長文 |
| `benefit` | 預期效益 | |
| `note` | 批示 | |

### `category` — 系統類別對照表（14 筆）

| 欄位 | 說明 |
|---|---|
| `id` | 自動遞增主鍵 |
| `code` | 字母代碼（A~N） |
| `categoryname` | 系統類別名稱 |

兩表透過 `categoryname` 欄位的值對應關聯。

## API 路徑

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/r02` | 全部項目（含 `categorycode` JOIN） |
| GET | `/api/r02/getby` | 條件查詢（白名單欄位 + `keyword` 多 token OR） |
| GET | `/api/r02/stats` | 統計總覽（status / categoryname / area 分組） |
| GET | `/api/r02/:itemid` | 單筆明細 |
| GET | `/api/category` | 全部系統類別 |
| GET | `/api/ollama/models` | 本機 Ollama 已下載模型清單（後端 proxy `OLLAMA_URL/api/tags`） |
| GET | `/api/r02/distinct/:field` | 取得 r02 欄位的去重值清單（白名單 `status`/`area`/`areaname`/`applicant`/`class`），編輯下拉用 |
| POST | `/api/r02` | 新增 r02 項目（必填 `itemid`/`prjname`/`itemname`，`itemid` 唯一） |
| PUT | `/api/r02/:itemid` | 更新 r02 項目（白名單欄位，禁改 `itemid`） |
| DELETE | `/api/r02/:itemid` | 刪除 r02 項目（若被 `combineid` 引用則回 400） |
| POST | `/api/category` | 新增類別（`code`、`categoryname` 不可重複） |
| PUT | `/api/category/:id` | 更新類別（改名時於 transaction 內同步更新 r02，回傳 `syncedR02` 筆數） |
| DELETE | `/api/category/:id` | 刪除類別（若被 r02 引用則回 400） |
| GET | `/api/category/:id/refcount` | 查詢類別被 r02 引用的筆數（編輯 drawer 改名前用於提示） |

`getby` 白名單欄位：`itemid`, `status`, `categoryname`, `area`, `areaname`, `applicant`, `class`, `combineid`。`keyword` 以空白分隔多 token，每 token `LIKE '%token%'` 跨 r02 全部 19 個欄位（`prjname/itemid/applicant/area/areaname/categoryname/status/combineid/itemname/spec/weight/class/description/purpose/implement/supply/workcontent/benefit/note`）OR 比對，多 token 之間 AND。

## 前端頁面

| 頁面 | 路由 | 說明 |
|---|---|---|
| 總覽 | `/` | Total 大數字 + 狀態 / 區域 / 系統類別 三區塊比例條 |
| 項目清單 | `/list` | 5 欄位 FilterBar + el-table 顯示 r02 全部 19 欄位（不分頁，全部 490 筆），上方「顯示欄位」按鈕可勾選顯示欄位（含全選，localStorage 持久化），合併至編號為連結，「匯出 Excel」依目前勾選欄位輸出 .xlsx |
| 項目明細 | `/detail/:itemid` | el-descriptions 顯示一般欄位 + 6 個長文欄位（保留 `\r\n` 換行），合併至連結可跳轉 |
| Ollama 模型 | `/ollama` | 本機 Ollama 已下載模型清單，按鈕觸發載入；表格顯示模型名稱、參數量、量化、家族、格式、大小、修改時間、digest |
| 資料維護 | `/admin` | r02 / category 編輯介面（el-tabs 切換）。r02 支援關鍵字 + 系統類別篩選、欄位顯示勾選（localStorage key `r02-admin-columns`，與項目清單分開）、新增/編輯/刪除（el-drawer 720px，必填 `itemid`/`prjname`/`itemname`，編輯時 `itemid` 不可改，刪除前檢查 `combineid` 引用）。category 可新增/編輯/刪除（el-drawer 480px，改 `categoryname` 會在 transaction 內同步更新所有引用的 r02；刪除前檢查 r02 引用）。頁面上方含 init-db 重建警告條 |

## 安裝與啟動

根目錄 `package.json` 採 npm workspaces（`client` + `server`），所有指令在 **根目錄**執行即可。

### 1. 安裝依賴（一次安裝 root + client + server）

```bash
npm install
```

### 2. 初始化資料庫（讀取 `R02NEW.xlsx` → `server/data/r02.db`）

```bash
npm run init-db
```

### 3. 開發模式（前後端同時啟動，單一終端）

```bash
npm run dev
```

`concurrently` 同時啟動：
- 後端 nodemon (port 3000)
- 前端 vite dev (port 5173，dev proxy `/api` → :3000)

開瀏覽器到 `http://localhost:5173`。

### 4. 正式部署（build 前端 + 啟動 express 同時提供前端靜態檔）

```bash
npm run build      # 產出 client/dist
npm start          # express 同時 serve dist 與 /api
```

開瀏覽器到 `http://localhost:3000`。

## 重新匯入

`init-db.js` 每次執行先 DROP TABLE 再重建，可直接重跑：

```bash
npm run init-db
```

## 範例 SQL 查詢（直接連 sqlite3 用）

```bash
sqlite3 server/data/r02.db
```

```sql
-- 各狀態項目數
SELECT status, COUNT(*) FROM r02 GROUP BY status;

-- 各系統類別項目數（依代碼排序）
SELECT c.code, r.categoryname, COUNT(*) AS cnt
FROM r02 r
LEFT JOIN category c ON r.categoryname = c.categoryname
GROUP BY r.categoryname
ORDER BY c.code;

-- 已合併項目追溯
SELECT a.itemid AS 原編號, a.itemname AS 原項目, b.itemid AS 合併至, b.itemname AS 目標項目
FROM r02 a
JOIN r02 b ON a.combineid = b.itemid
WHERE a.status = '已合併';
```

## 環境變數（`server/.env`）

```
DB_PATH=./data/r02.db
APP_PORT=3000
OLLAMA_URL=http://localhost:11434
```

## Ollama 連線

`/ollama` 頁面透過後端 proxy `GET /api/ollama/models` → `OLLAMA_URL/api/tags` 取得本機已下載的模型清單。

### 啟動 Ollama daemon

頁面只能讀到 daemon 已知的模型，所以必須先讓 daemon 跑起來。任選一種：

- 開啟 Ollama 桌面 app（系統匣常駐）
- PowerShell 執行 `ollama serve`（會佔住該終端機）

### 模型存放路徑（OLLAMA_MODELS）

若模型不在預設位置 `%USERPROFILE%\.ollama\models`，必須讓 daemon 啟動時看到 `OLLAMA_MODELS` 環境變數：

```powershell
# 持久化到使用者層級（之後新開的視窗 / 服務都會繼承）
[System.Environment]::SetEnvironmentVariable('OLLAMA_MODELS', 'D:\Model\ollama', 'User')
```

注意：**Windows 環境變數變更只對「之後新啟動」的 process 生效**。已開啟的 PowerShell 視窗看不到新值，必須關掉重開（或在當前視窗手動 `$env:OLLAMA_MODELS = 'D:\Model\ollama'` 後再 `ollama serve`）。

### 驗證

```powershell
curl http://localhost:11434/api/tags
```

正常會回 `{"models":[ ... ]}`。若回 `{"models":[]}` 但 `ollama list` 顯示有模型，代表 daemon 與 CLI 讀到的 `OLLAMA_MODELS` 不一致。
