module.exports = (app) => {
    const api = require('../ctrl/r02.ctrl');
    const router = require('express').Router();
    console.log('load r02 api');
    router.get('/', api.getAll);
    router.get('/getby', api.getBy);
    router.get('/stats', api.stats);
    router.get('/:itemid', api.getById);
    app.use('/api/r02', router);
};
