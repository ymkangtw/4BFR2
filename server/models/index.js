const path = require('path');
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './data/r02.db');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

module.exports = {
    Sequelize,
    sequelize,
    QueryTypes
};
