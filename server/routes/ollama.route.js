module.exports = (app) => {
    const api = require('../ctrl/ollama.ctrl');
    const router = require('express').Router();
    console.log('load ollama api');
    router.get('/models', api.getModels);
    app.use('/api/ollama', router);
};
