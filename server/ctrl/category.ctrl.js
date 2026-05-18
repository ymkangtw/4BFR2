const db = require('../models');

async function getAll(req, res) {
    const sql = 'SELECT id, code, categoryname FROM category ORDER BY code ASC';
    const rows = await db.sequelize.query(sql, { type: db.QueryTypes.SELECT });
    res.status(200).json(rows);
}

async function create(req, res) {
    const body = req.body || {};
    const code = (body.code || '').trim();
    const categoryname = (body.categoryname || '').trim();
    if (!code || !categoryname) {
        return res.status(400).json({ message: 'code、categoryname 為必填' });
    }
    const dup = await db.sequelize.query(
        'SELECT id FROM category WHERE code = $code OR categoryname = $categoryname LIMIT 1',
        { bind: { code, categoryname }, type: db.QueryTypes.SELECT }
    );
    if (dup.length) {
        return res.status(400).json({ message: `code 或 categoryname 已存在` });
    }
    await db.sequelize.query(
        'INSERT INTO category (code, categoryname) VALUES ($code, $categoryname)',
        { bind: { code, categoryname }, type: db.QueryTypes.INSERT }
    );
    const rows = await db.sequelize.query(
        'SELECT id, code, categoryname FROM category WHERE code = $code LIMIT 1',
        { bind: { code }, type: db.QueryTypes.SELECT }
    );
    res.status(200).json(rows[0]);
}

async function update(req, res) {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: '無效的 id' });

    const exist = await db.sequelize.query(
        'SELECT id, code, categoryname FROM category WHERE id = $id LIMIT 1',
        { bind: { id }, type: db.QueryTypes.SELECT }
    );
    if (!exist.length) return res.status(404).json({ message: '找不到類別' });

    const body = req.body || {};
    const newCode = (body.code || '').trim();
    const newName = (body.categoryname || '').trim();
    if (!newCode || !newName) {
        return res.status(400).json({ message: 'code、categoryname 為必填' });
    }

    const dup = await db.sequelize.query(
        `SELECT id FROM category
         WHERE id != $id AND (code = $code OR categoryname = $categoryname)
         LIMIT 1`,
        { bind: { id, code: newCode, categoryname: newName }, type: db.QueryTypes.SELECT }
    );
    if (dup.length) {
        return res.status(400).json({ message: 'code 或 categoryname 與其他類別重複' });
    }

    const oldName = exist[0].categoryname;
    const nameChanged = oldName !== newName;
    let syncedCount = 0;

    const tx = await db.sequelize.transaction();
    try {
        await db.sequelize.query(
            'UPDATE category SET code = $code, categoryname = $categoryname WHERE id = $id',
            { bind: { id, code: newCode, categoryname: newName }, type: db.QueryTypes.UPDATE, transaction: tx }
        );
        if (nameChanged) {
            const cnt = await db.sequelize.query(
                'SELECT COUNT(*) AS cnt FROM r02 WHERE categoryname = $oldName',
                { bind: { oldName }, type: db.QueryTypes.SELECT, transaction: tx }
            );
            syncedCount = cnt[0].cnt;
            if (syncedCount > 0) {
                await db.sequelize.query(
                    'UPDATE r02 SET categoryname = $newName WHERE categoryname = $oldName',
                    { bind: { oldName, newName }, type: db.QueryTypes.UPDATE, transaction: tx }
                );
            }
        }
        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    const rows = await db.sequelize.query(
        'SELECT id, code, categoryname FROM category WHERE id = $id LIMIT 1',
        { bind: { id }, type: db.QueryTypes.SELECT }
    );
    res.status(200).json({ category: rows[0], syncedR02: syncedCount });
}

async function remove(req, res) {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: '無效的 id' });

    const exist = await db.sequelize.query(
        'SELECT id, categoryname FROM category WHERE id = $id LIMIT 1',
        { bind: { id }, type: db.QueryTypes.SELECT }
    );
    if (!exist.length) return res.status(404).json({ message: '找不到類別' });

    const refs = await db.sequelize.query(
        'SELECT COUNT(*) AS cnt FROM r02 WHERE categoryname = $name',
        { bind: { name: exist[0].categoryname }, type: db.QueryTypes.SELECT }
    );
    if (refs[0].cnt > 0) {
        return res.status(400).json({
            message: `此類別仍被 ${refs[0].cnt} 筆 r02 項目使用，無法刪除`
        });
    }

    await db.sequelize.query(
        'DELETE FROM category WHERE id = $id',
        { bind: { id }, type: db.QueryTypes.DELETE }
    );
    res.status(200).json({ message: '刪除成功' });
}

async function refCount(req, res) {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: '無效的 id' });
    const cat = await db.sequelize.query(
        'SELECT categoryname FROM category WHERE id = $id LIMIT 1',
        { bind: { id }, type: db.QueryTypes.SELECT }
    );
    if (!cat.length) return res.status(404).json({ message: '找不到類別' });
    const refs = await db.sequelize.query(
        'SELECT COUNT(*) AS cnt FROM r02 WHERE categoryname = $name',
        { bind: { name: cat[0].categoryname }, type: db.QueryTypes.SELECT }
    );
    res.status(200).json({ count: refs[0].cnt });
}

module.exports = { getAll, create, update, remove, refCount };
