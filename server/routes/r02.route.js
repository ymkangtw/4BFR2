module.exports = (app) => {
    const api = require('../ctrl/r02.ctrl');
    const router = require('express').Router();
    console.log('load r02 api');
    router.get('/', api.getAll);
    router.get('/getby', api.getBy);
    router.get('/stats', api.stats);
    router.get('/distinct/:field', api.distinctField);
    router.post('/', api.create);
    router.put('/:itemid', api.update);
    router.delete('/:itemid', api.remove);
    router.get('/:itemid', api.getById);
    app.use('/api/r02', router);
};
