import axios from 'axios';
import { ElMessage } from 'element-plus';

const http = axios.create();

http.interceptors.response.use(
    (response) => response,
    (error) => {
        const msg = error.response?.data?.message || error.response?.data || error.message || '請求失敗';
        ElMessage.error(String(msg));
        return Promise.reject(error);
    }
);

export default http;
