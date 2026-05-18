import http from './http.js';

export default class OllamaService {
    async getModels() {
        return await http.get('/api/ollama/models').then(res => res.data);
    }
}
