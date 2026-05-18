import http from './http.js';

export default class AdminService {
    async getDistinct(field) {
        return await http.get(`/api/r02/distinct/${encodeURIComponent(field)}`).then(res => res.data);
    }
    async createR02(body) {
        return await http.post('/api/r02', body).then(res => res.data);
    }
    async updateR02(itemid, body) {
        return await http.put(`/api/r02/${encodeURIComponent(itemid)}`, body).then(res => res.data);
    }
    async deleteR02(itemid) {
        return await http.delete(`/api/r02/${encodeURIComponent(itemid)}`).then(res => res.data);
    }
    async createCategory(body) {
        return await http.post('/api/category', body).then(res => res.data);
    }
    async updateCategory(id, body) {
        return await http.put(`/api/category/${id}`, body).then(res => res.data);
    }
    async deleteCategory(id) {
        return await http.delete(`/api/category/${id}`).then(res => res.data);
    }
    async getCategoryRefCount(id) {
        return await http.get(`/api/category/${id}/refcount`).then(res => res.data);
    }
}
