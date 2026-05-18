<script setup>
import { ref } from 'vue';
import OllamaService from '@/service/ollama.service.js';

const ollamaService = new OllamaService();
const loading = ref(false);
const models = ref([]);
const loaded = ref(false);

async function loadModels() {
    loading.value = true;
    try {
        models.value = await ollamaService.getModels();
        loaded.value = true;
    } finally {
        loading.value = false;
    }
}

function formatSize(bytes) {
    if (!bytes) return '-';
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}

function formatDate(s) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shortDigest(s) {
    return s ? s.slice(0, 12) : '-';
}
</script>

<template>
    <div>
        <div class="page-header">
            <div>
                <h2 class="page-title">Ollama 模型清單</h2>
                <div class="page-subtitle">
                    本機 Ollama 服務已下載的模型
                    <span v-if="loaded">（共 {{ models.length }} 個）</span>
                </div>
            </div>
            <el-button type="primary" :icon="'Refresh'" @click="loadModels" :loading="loading">
                {{ loaded ? '重新載入' : '載入模型清單' }}
            </el-button>
        </div>

        <el-card shadow="never">
            <el-table
                v-loading="loading"
                element-loading-text="查詢中..."
                :data="models"
                border
                style="width: 100%; font-size: 17px;"
                :header-cell-style="{ textAlign: 'center', fontWeight: 700 }"
            >
                <el-table-column prop="name" label="模型名稱" min-width="220" resizable />
                <el-table-column label="參數量" width="120" align="center" resizable>
                    <template #default="{ row }">
                        {{ row.details?.parameter_size || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="量化" width="140" align="center" resizable>
                    <template #default="{ row }">
                        {{ row.details?.quantization_level || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="模型家族" width="140" align="center" resizable>
                    <template #default="{ row }">
                        {{ row.details?.family || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="格式" width="100" align="center" resizable>
                    <template #default="{ row }">
                        {{ row.details?.format || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="大小" width="120" align="right" resizable>
                    <template #default="{ row }">
                        {{ formatSize(row.size) }}
                    </template>
                </el-table-column>
                <el-table-column label="修改時間" width="180" align="center" resizable>
                    <template #default="{ row }">
                        {{ formatDate(row.modified_at) }}
                    </template>
                </el-table-column>
                <el-table-column label="Digest" width="140" align="center" resizable>
                    <template #default="{ row }">
                        <span style="font-family: monospace; color: #6b7280;">{{ shortDigest(row.digest) }}</span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>
