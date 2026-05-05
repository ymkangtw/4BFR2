const path = require('path');
const fs = require('fs');
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const XLSX = require('xlsx');

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './data/r02.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

const xlsxPath = path.resolve(__dirname, '../../R02NEW.xlsx');

const COLUMN_MAPPING = {
    '專案名稱': 'prjname',
    '項目編號': 'itemid',
    '申請人': 'applicant',
    '區域': 'area',
    '區域名稱': 'areaname',
    '系統類別': 'categoryname',
    '狀態': 'status',
    '合併至編號': 'combineid',
    '項目名稱': 'itemname',
    '規格數量': 'spec',
    '設備重量': 'weight',
    '分類': 'class',
    '現況問題說明': 'description',
    '更新目的': 'purpose',
    '建議方式': 'implement',
    '設計供應': 'supply',
    '內容規格': 'workcontent',
    '預期效益': 'benefit',
    '批示': 'note'
};

const R02_COLUMNS = Object.values(COLUMN_MAPPING);

const DROP_TABLES = [
    'DROP TABLE IF EXISTS r02',
    'DROP TABLE IF EXISTS category'
];

const CREATE_TABLES = [
    `CREATE TABLE r02 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prjname TEXT,
        itemid TEXT,
        applicant TEXT,
        area TEXT,
        areaname TEXT,
        categoryname TEXT,
        status TEXT,
        combineid TEXT,
        itemname TEXT,
        spec TEXT,
        weight TEXT,
        class TEXT,
        description TEXT,
        purpose TEXT,
        implement TEXT,
        supply TEXT,
        workcontent TEXT,
        benefit TEXT,
        note TEXT
    )`,
    `CREATE TABLE category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT,
        categoryname TEXT
    )`,
    'CREATE INDEX idx_r02_itemid ON r02(itemid)',
    'CREATE INDEX idx_r02_status ON r02(status)',
    'CREATE INDEX idx_r02_categoryname ON r02(categoryname)',
    'CREATE INDEX idx_r02_area ON r02(area)',
    'CREATE INDEX idx_r02_combineid ON r02(combineid)'
];

function trimVal(v) {
    if (v == null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return String(v);
}

async function importR02(workbook) {
    const ws = workbook.Sheets['Sheet1'];
    if (!ws) throw new Error('Sheet "Sheet1" not found in R02NEW.xlsx');
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    let count = 0;
    for (const row of rows) {
        const vals = {};
        for (const [zh, en] of Object.entries(COLUMN_MAPPING)) {
            vals[en] = trimVal(row[zh]);
        }
        const placeholders = R02_COLUMNS.map(c => `$${c}`).join(', ');
        const colNames = R02_COLUMNS.join(', ');
        await sequelize.query(
            `INSERT INTO r02 (${colNames}) VALUES (${placeholders})`,
            { bind: vals }
        );
        count++;
    }
    return count;
}

async function importCategory(workbook) {
    const ws = workbook.Sheets['系統類別'];
    if (!ws) throw new Error('Sheet "系統類別" not found in R02NEW.xlsx');
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
    let count = 0;
    for (const row of rows) {
        const code = trimVal(row[0]);
        const categoryname = trimVal(row[1]);
        if (!code && !categoryname) continue;
        await sequelize.query(
            `INSERT INTO category (code, categoryname) VALUES ($code, $categoryname)`,
            { bind: { code, categoryname } }
        );
        count++;
    }
    return count;
}

async function main() {
    console.log('Initializing database...');
    console.log(`DB path:   ${dbPath}`);
    console.log(`Source:    ${xlsxPath}`);

    if (!fs.existsSync(xlsxPath)) {
        throw new Error(`Source file not found: ${xlsxPath}`);
    }

    for (const stmt of DROP_TABLES) await sequelize.query(stmt);
    for (const stmt of CREATE_TABLES) await sequelize.query(stmt);
    console.log('Tables (re)created.');

    const wb = XLSX.readFile(xlsxPath);

    const n1 = await importR02(wb);
    console.log(`  r02:      ${n1} rows`);

    const n2 = await importCategory(wb);
    console.log(`  category: ${n2} rows`);

    const [r02Count] = await sequelize.query('SELECT COUNT(*) as cnt FROM r02', { type: QueryTypes.SELECT });
    const [catCount] = await sequelize.query('SELECT COUNT(*) as cnt FROM category', { type: QueryTypes.SELECT });
    console.log(`\nDone! r02: ${r02Count.cnt}, category: ${catCount.cnt}`);

    await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });
