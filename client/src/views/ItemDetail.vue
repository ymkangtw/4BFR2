<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import R02Service from '@/service/r02.service.js';

const route = useRoute();
const router = useRouter();
const r02Service = new R02Service();

const loading = ref(false);
const item = ref(null);

async function load(itemid) {
    loading.value = true;
    item.value = null;
    try {
        item.value = await r02Service.getById(itemid);
    } finally {
        loading.value = false;
    }
}

onMounted(() => load(route.params.itemid));
watch(() => route.params.itemid, (id) => { if (id) load(id); });

function statusTagType(s) {
    if (s === '未送出') return 'info';
    if (s === '已合併') return 'warning';
    if (s === '已取消') return 'danger';
    if (s === '送協辦單位確認中') return 'primary';
    if (s === '協辦單位確認完成') return 'success';
    return '';
}
</script>

<template>
    <div v-loading="loading" element-loading-text="載入中...">
        <div class="page-header">
            <div>
                <el-button :icon="'ArrowLeft'" @click="router.push('/list')" style="margin-bottom: 8px;">返回清單</el-button>
                <h2 class="page-title">
                    {{ item?.itemid }}
                    <span style="margin-left: 8px; font-weight: 400; color: #6b7280; font-size: 20px;">{{ item?.itemname }}</span>
                </h2>
                <div class="page-subtitle">{{ item?.prjname }}</div>
            </div>
            <div v-if="item">
                <el-tag :type="statusTagType(item.status)" size="large">{{ item.status || '-' }}</el-tag>
            </div>
        </div>

        <el-card v-if="item" shadow="never">
            <el-descriptions :column="3" border size="default">
                <el-descriptions-item label="項目編號">{{ item.itemid }}</el-descriptions-item>
                <el-descriptions-item label="申請人">{{ item.applicant || '-' }}</el-descriptions-item>
                <el-descriptions-item label="合併至編號">
                    <el-link
                        v-if="item.combineid"
                        type="primary"
                        @click="router.push({ name: 'detail', params: { itemid: item.combineid } })"
                    >
                        {{ item.combineid }}
                    </el-link>
                    <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="區域">{{ item.area || '-' }}</el-descriptions-item>
                <el-descriptions-item label="區域名稱">{{ item.areaname || '-' }}</el-descriptions-item>
                <el-descriptions-item label="系統類別">{{ item.categoryname || '-' }}</el-descriptions-item>
                <el-descriptions-item label="分類">{{ item.class || '-' }}</el-descriptions-item>
                <el-descriptions-item label="設備重量">{{ item.weight || '-' }}</el-descriptions-item>
                <el-descriptions-item label="設計供應">{{ item.supply || '-' }}</el-descriptions-item>
                <el-descriptions-item label="建議方式" :span="3">{{ item.implement || '-' }}</el-descriptions-item>
            </el-descriptions>

            <el-descriptions :column="1" border size="default" style="margin-top: 16px;">
                <el-descriptions-item label="規格數量">
                    <div class="long-text">{{ item.spec || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="現況問題說明">
                    <div class="long-text">{{ item.description || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="更新目的">
                    <div class="long-text">{{ item.purpose || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="內容規格">
                    <div class="long-text">{{ item.workcontent || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="預期效益">
                    <div class="long-text">{{ item.benefit || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="批示">
                    <div class="long-text">{{ item.note || '-' }}</div>
                </el-descriptions-item>
            </el-descriptions>
        </el-card>
    </div>
</template>
