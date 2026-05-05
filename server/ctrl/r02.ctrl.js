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

module.exports = { getAll, getBy, getById, stats };
