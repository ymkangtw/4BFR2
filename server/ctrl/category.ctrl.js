const db = require('../models');

async function getAll(req, res) {
    const sql = 'SELECT id, code, categoryname FROM category ORDER BY code ASC';
    const rows = await db.sequelize.query(sql, { type: db.QueryTypes.SELECT });
    res.status(200).json(rows);
}

module.exports = { getAll };
