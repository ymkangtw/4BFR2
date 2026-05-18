module.exports = (app) => {
    const api = require('../ctrl/category.ctrl');
    const router = require('express').Router();
    console.log('load category api');
    router.get('/', api.getAll);
    router.get('/:id/refcount', api.refCount);
    router.post('/', api.create);
    router.put('/:id', api.update);
    router.delete('/:id', api.remove);
    app.use('/api/category', router);
};
