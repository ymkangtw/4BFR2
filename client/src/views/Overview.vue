<script setup>
import { ref, computed, onMounted } from 'vue';
import R02Service from '@/service/r02.service.js';

const r02Service = new R02Service();
const loading = ref(false);
const data = ref({ total: 0, byCategory: [], byArea: [] });

onMounted(async () => {
    loading.value = true;
    try {
        data.value = await r02Service.stats();
    } finally {
        loading.value = false;
    }
});

const maxCategoryCnt = computed(() =>
    Math.max(1, ...data.value.byCategory.map(r => r.cnt))
);
const maxAreaCnt = computed(() =>
    Math.max(1, ...data.value.byArea.map(r => r.cnt))
);
</script>

<template>
    <div v-loading="loading" element-loading-text="載入中...">
        <div class="page-header">
            <div>
                <h2 class="page-title">總覽</h2>
                <div class="page-subtitle">肆號高爐第二爐代大修 (4BFR2) 項目資料庫</div>
            </div>
            <el-card shadow="never" class="stat-card">
                <div class="label">Total Items</div>
                <div class="value">{{ data.total }}</div>
            </el-card>
        </div>

        <el-card shadow="never">
            <template #header>
                <div style="font-weight: 700;">區域分布</div>
            </template>
            <el-table :data="data.byArea" border style="width: 100%; font-size: 17px;" max-height="420" :header-cell-style="{ textAlign: 'center', fontWeight: 700 }">
                <el-table-column prop="area" label="區域" min-width="220" show-overflow-tooltip />
                <el-table-column prop="cnt" label="筆數" width="100" align="right" />
                <el-table-column label="比例" width="240">
                    <template #default="{ row }">
                        <el-progress
                            :percentage="row.cnt / maxAreaCnt * 100"
                            :show-text="false"
                            :stroke-width="16"
                            style="display: inline-block; width: 130px; vertical-align: middle;"
                        />
                        <span style="margin-left: 8px; color: #1f2937; font-weight: 600;">
                            {{ data.total ? (row.cnt / data.total * 100).toFixed(1) : 0 }}%
                        </span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-card shadow="never" style="margin-top: 20px;">
            <template #header>
                <div style="font-weight: 700;">系統類別分布</div>
            </template>
            <el-table :data="data.byCategory" border style="width: 100%; font-size: 17px;" :header-cell-style="{ textAlign: 'center', fontWeight: 700 }">
                <el-table-column prop="code" label="代碼" width="80" align="center" />
                <el-table-column prop="categoryname" label="系統類別" min-width="240" show-overflow-tooltip />
                <el-table-column prop="cnt" label="筆數" width="100" align="right" />
                <el-table-column label="比例" width="240">
                    <template #default="{ row }">
                        <el-progress
                            :percentage="row.cnt / maxCategoryCnt * 100"
                            :show-text="false"
                            :stroke-width="16"
                            style="display: inline-block; width: 130px; vertical-align: middle;"
                        />
                        <span style="margin-left: 8px; color: #1f2937; font-weight: 600;">
                            {{ data.total ? (row.cnt / data.total * 100).toFixed(1) : 0 }}%
                        </span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>
