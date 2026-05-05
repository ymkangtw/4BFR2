module.exports = (app) => {
    const api = require('../ctrl/category.ctrl');
    const router = require('express').Router();
    console.log('load category api');
    router.get('/', api.getAll);
    app.use('/api/category', router);
};
