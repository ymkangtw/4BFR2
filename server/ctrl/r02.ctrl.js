const db = require('../models');

const R02_ALLOWED_FIELDS = [
    'itemid', 'status', 'categoryname', 'area', 'areaname',
    'applicant', 'class', 'combineid'
];

const KEYWORD_FIELDS = [
    'prjname', 'itemid', 'applicant', 'area', 'areaname', 'categoryname',
    'status', 'combineid', 'itemname', 'spec', 'weight', 'class',
    'description', 'purpose', 'implement', 'supply', 'workcontent',
    'benefit', 'note'
];

const R02_EDITABLE_FIELDS = [
    'prjname', 'itemid', 'applicant', 'area', 'areaname', 'categoryname',
    'status', 'combineid', 'itemname', 'spec', 'weight', 'class',
    'description', 'purpose', 'implement', 'supply', 'workcontent',
    'benefit', 'note'
];

const R02_DISTINCT_FIELDS = ['status', 'area', 'areaname', 'applicant', 'class'];

async function getAll(req, res) {
    const sql = `
        SELECT r.id, r.prjname, r.itemid, r.applicant, r.area, r.areaname,
               r.categoryname, r.status, r.combineid, r.itemname, r.spec,
               r.weight, r.class, r.description, r.purpose, r.implement,
               r.supply, r.workcontent, r.benefit, r.note,
               c.code AS categorycode
        FROM r02 r
        LEFT JOIN category c ON r.categoryname = c.categoryname
        ORDER BY r.itemid ASC`;
    const rows = await db.sequelize.query(sql, { type: db.QueryTypes.SELECT });
    res.status(200).json(rows);
}

async function getBy(req, res) {
    let condstr = '';
    let queryobj = {};
    for (const key in req.query) {
        if (key === 'keyword') continue;
        if (!R02_ALLOWED_FIELDS.includes(key)) continue;
        let val = req.query[key];
        let eq;
        if (val == null || val === '') {
            eq = 'LIKE';
            queryobj[key] = '%';
        } else if (String(val).slice(-1) === '%') {
            eq = 'LIKE';
            queryobj[key] = '%' + val;
        } else {
            eq = '=';
            queryobj[key] = val;
        }
        condstr += `r.${key} ${eq} $${key} AND `;
    }

    const keyword = (req.query.keyword || '').trim();
    let keywordSql = '';
    if (keyword) {
        const tokens = keyword.split(/\s+/).filter(Boolean);
        tokens.forEach((tok, i) => {
            const bindKey = `kw${i}`;
            queryobj[bindKey] = `%${tok}%`;
            const orParts = KEYWORD_FIELDS.map(f => `r.${f} LIKE $${bindKey}`).join(' OR ');
            keywordSql += `(${orParts}) AND `;
        });
    }

    const where = (condstr + keywordSql).slice(0, -4);
    if (!where) {
        return getAll(req, res);
    }

    const sql = `
        SELECT r.id, r.prjname, r.itemid, r.applicant, r.area, r.areaname,
               r.categoryname, r.status, r.combineid, r.itemname, r.spec,
               r.weight, r.class, r.description, r.purpose, r.implement,
               r.supply, r.workcontent, r.benefit, r.note,
               c.code AS categorycode
        FROM r02 r
        LEFT JOIN category c ON r.categoryname = c.categoryname
        WHERE ${where}
        ORDER BY r.itemid ASC`;
    const rows = await db.sequelize.query(sql, { bind: queryobj, type: db.QueryTypes.SELECT });
    res.status(200).json(rows);
}

async function getById(req, res) {
    const sql = `
        SELECT r.id, r.prjname, r.itemid, r.applicant, r.area, r.areaname,
               r.categoryname, r.status, r.combineid, r.itemname, r.spec,
               r.weight, r.class, r.description, r.purpose, r.implement,
               r.supply, r.workcontent, r.benefit, r.note,
               c.code AS categorycode
        FROM r02 r
        LEFT JOIN category c ON r.categoryname = c.categoryname
        WHERE r.itemid = $itemid
        LIMIT 1`;
    const rows = await db.sequelize.query(sql, {
        bind: { itemid: req.params.itemid },
        type: db.QueryTypes.SELECT
    });
    if (!rows.length) return res.status(404).json({ message: '找不到項目' });
    res.status(200).json(rows[0]);
}

async function stats(req, res) {
    const total = await db.sequelize.query(
        'SELECT COUNT(*) AS cnt FROM r02',
        { type: db.QueryTypes.SELECT }
    );
    const byStatus = await db.sequelize.query(
        `SELECT COALESCE(status, '') AS status, COUNT(*) AS cnt
         FROM r02 GROUP BY status ORDER BY cnt DESC`,
        { type: db.QueryTypes.SELECT }
    );
    const byCategory = await db.sequelize.query(
        `SELECT c.code AS code, r.categoryname, COUNT(*) AS cnt
         FROM r02 r
         LEFT JOIN category c ON r.categoryname = c.categoryname
         GROUP BY r.categoryname
         ORDER BY c.code ASC`,
        { type: db.QueryTypes.SELECT }
    );
    const byArea = await db.sequelize.query(
        `SELECT COALESCE(area, '') AS area, COUNT(*) AS cnt
         FROM r02 GROUP BY area ORDER BY area ASC`,
        { type: db.QueryTypes.SELECT }
    );
    res.status(200).json({
        total: total[0].cnt,
        byStatus,
        byCategory,
        byArea
    });
}

async function distinctField(req, res) {
    const field = req.params.field;
    if (!R02_DISTINCT_FIELDS.includes(field)) {
        return res.status(400).json({ message: `不允許的欄位：${field}` });
    }
    const sql = `SELECT DISTINCT ${field} AS value
                 FROM r02
                 WHERE ${field} IS NOT NULL AND ${field} != ''
                 ORDER BY ${field} ASC`;
    const rows = await db.sequelize.query(sql, { type: db.QueryTypes.SELECT });
    res.status(200).json(rows.map(r => r.value));
}

async function create(req, res) {
    const body = req.body || {};
    if (!body.itemid || !body.prjname || !body.itemname) {
        return res.status(400).json({ message: 'itemid、prjname、itemname 為必填' });
    }
    const dup = await db.sequelize.query(
        'SELECT id FROM r02 WHERE itemid = $itemid LIMIT 1',
        { bind: { itemid: body.itemid }, type: db.QueryTypes.SELECT }
    );
    if (dup.length) {
        return res.status(400).json({ message: `項目編號 ${body.itemid} 已存在` });
    }
    const bind = {};
    const cols = [];
    const vals = [];
    R02_EDITABLE_FIELDS.forEach(f => {
        cols.push(f);
        vals.push(`$${f}`);
        bind[f] = body[f] != null ? String(body[f]) : null;
    });
    const sql = `INSERT INTO r02 (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
    await db.sequelize.query(sql, { bind, type: db.QueryTypes.INSERT });
    const rows = await db.sequelize.query(
        `SELECT r.id, r.prjname, r.itemid, r.applicant, r.area, r.areaname,
                r.categoryname, r.status, r.combineid, r.itemname, r.spec,
                r.weight, r.class, r.description, r.purpose, r.implement,
                r.supply, r.workcontent, r.benefit, r.note,
                c.code AS categorycode
         FROM r02 r
         LEFT JOIN category c ON r.categoryname = c.categoryname
         WHERE r.itemid = $itemid LIMIT 1`,
        { bind: { itemid: body.itemid }, type: db.QueryTypes.SELECT }
    );
    res.status(200).json(rows[0]);
}

async function update(req, res) {
    const itemid = req.params.itemid;
    const exist = await db.sequelize.query(
        'SELECT id FROM r02 WHERE itemid = $itemid LIMIT 1',
        { bind: { itemid }, type: db.QueryTypes.SELECT }
    );
    if (!exist.length) return res.status(404).json({ message: '找不到項目' });

    const body = req.body || {};
    if (body.prjname != null && !body.prjname) {
        return res.status(400).json({ message: 'prjname 不可為空' });
    }
    if (body.itemname != null && !body.itemname) {
        return res.status(400).json({ message: 'itemname 不可為空' });
    }
    const bind = { itemid };
    const sets = [];
    R02_EDITABLE_FIELDS.forEach(f => {
        if (f === 'itemid') return;
        if (Object.prototype.hasOwnProperty.call(body, f)) {
            sets.push(`${f} = $${f}`);
            bind[f] = body[f] != null ? String(body[f]) : null;
        }
    });
    if (!sets.length) return res.status(400).json({ message: '沒有可更新的欄位' });

    const sql = `UPDATE r02 SET ${sets.join(', ')} WHERE itemid = $itemid`;
    await db.sequelize.query(sql, { bind, type: db.QueryTypes.UPDATE });
    const rows = await db.sequelize.query(
        `SELECT r.id, r.prjname, r.itemid, r.applicant, r.area, r.areaname,
                r.categoryname, r.status, r.combineid, r.itemname, r.spec,
                r.weight, r.class, r.description, r.purpose, r.implement,
                r.supply, r.workcontent, r.benefit, r.note,
                c.code AS categorycode
         FROM r02 r
         LEFT JOIN category c ON r.categoryname = c.categoryname
         WHERE r.itemid = $itemid LIMIT 1`,
        { bind: { itemid }, type: db.QueryTypes.SELECT }
    );
    res.status(200).json(rows[0]);
}

async function remove(req, res) {
    const itemid = req.params.itemid;
    const exist = await db.sequelize.query(
        'SELECT id FROM r02 WHERE itemid = $itemid LIMIT 1',
        { bind: { itemid }, type: db.QueryTypes.SELECT }
    );
    if (!exist.length) return res.status(404).json({ message: '找不到項目' });

    const refs = await db.sequelize.query(
        'SELECT COUNT(*) AS cnt FROM r02 WHERE combineid = $itemid',
        { bind: { itemid }, type: db.QueryTypes.SELECT }
    );
    if (refs[0].cnt > 0) {
        return res.status(400).json({
            message: `此項目被 ${refs[0].cnt} 筆資料的合併至編號引用，請先處理引用關係`
        });
    }

    await db.sequelize.query(
        'DELETE FROM r02 WHERE itemid = $itemid',
        { bind: { itemid }, type: db.QueryTypes.DELETE }
    );
    res.status(200).json({ message: '刪除成功' });
}

module.exports = { getAll, getBy, getById, stats, distinctField, create, update, remove };
