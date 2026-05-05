import http from './http.js';

export default class R02Service {
    async getAll() {
        return await http.get('/api/r02').then(res => res.data);
    }
    async getBy(param) {
        return await http.get('/api/r02/getby', { params: param }).then(res => res.data);
    }
    async getById(itemid) {
        return await http.get(`/api/r02/${encodeURIComponent(itemid)}`).then(res => res.data);
    }
    async stats() {
        return await http.get('/api/r02/stats').then(res => res.data);
    }
}
