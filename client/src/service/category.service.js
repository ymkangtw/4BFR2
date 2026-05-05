import http from './http.js';

export default class CategoryService {
    async getAll() {
        return await http.get('/api/category').then(res => res.data);
    }
}
