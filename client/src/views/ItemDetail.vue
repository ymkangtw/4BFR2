<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import R02Service from '@/service/r02.service.js';
import { itemListContext } from '@/store/itemListContext.js';

const route = useRoute();
const router = useRouter();
const r02Service = new R02Service();

const loading = ref(false);
const item = ref(null);

const currentIndex = computed(() =>
    itemListContext.itemids.indexOf(route.params.itemid)
);
const total = computed(() => itemListContext.itemids.length);
const hasSequence = computed(() => total.value > 0 && currentIndex.value !== -1);
const hasPrev = computed(() => hasSequence.value && currentIndex.value > 0);
const hasNext = computed(() => hasSequence.value && currentIndex.value < total.value - 1);

function goPrev() {
    if (!hasPrev.value) return;
    const id = itemListContext.itemids[currentIndex.value - 1];
    router.push({ name: 'detail', params: { itemid: id } });
}

function goNext() {
    if (!hasNext.value) return;
    const id = itemListContext.itemids[currentIndex.value + 1];
    router.push({ name: 'detail', params: { itemid: id } });
}

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
        <div class="detail-nav-bar">
            <el-button :icon="'ArrowLeft'" @click="router.push('/list')">返回清單</el-button>
            <div class="detail-nav-right">
                <span class="detail-nav-counter" :class="{ 'is-empty': !hasSequence }">
                    <template v-if="hasSequence">{{ currentIndex + 1 }} / {{ total }}</template>
                    <template v-else>無搜尋序列</template>
                </span>
                <el-button :icon="'ArrowLeft'" :disabled="!hasPrev" @click="goPrev">上一筆</el-button>
                <el-button :disabled="!hasNext" @click="goNext">
                    下一筆
                    <el-icon style="margin-left: 4px;"><ArrowRight /></el-icon>
                </el-button>
            </div>
        </div>

        <div class="page-header">
            <h2 class="page-title">
                {{ item?.itemid }}
                <span style="margin-left: 8px; font-weight: 600; color: #6b7280; font-size: 26px;">{{ item?.itemname }}</span>
            </h2>
        </div>

        <el-card v-if="item" shadow="never">
            <el-descriptions :column="3" border size="default">
                <el-descriptions-item label="專案名稱" :span="3">{{ item.prjname || '-' }}</el-descriptions-item>
                <el-descriptions-item label="項目名稱" :span="3">{{ item.itemname || '-' }}</el-descriptions-item>
                <el-descriptions-item label="項目編號">{{ item.itemid }}</el-descriptions-item>
                <el-descriptions-item label="狀態">
                    <el-tag :type="statusTagType(item.status)">{{ item.status || '-' }}</el-tag>
                </el-descriptions-item>
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
                <el-descriptions-item label="建議方式" :span="2">{{ item.implement || '-' }}</el-descriptions-item>
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

<style scoped>
.detail-nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
.detail-nav-right {
    display: flex;
    align-items: center;
    gap: 12px;
}
.detail-nav-counter {
    font-size: 17px;
    color: #1f2937;
    font-weight: 600;
    padding: 0 8px;
}
.detail-nav-counter.is-empty {
    color: #9ca3af;
    font-weight: 400;
    font-size: 15px;
}
</style>
