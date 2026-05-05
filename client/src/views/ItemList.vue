<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { exportExcel } from '@/util/exportExcel.js';
import R02Service from '@/service/r02.service.js';
import CategoryService from '@/service/category.service.js';

defineOptions({ name: 'ItemList' });

const router = useRouter();
const r02Service = new R02Service();
const categoryService = new CategoryService();

const loading = ref(false);
const items = ref([]);
const categories = ref([]);

const filter = ref({
    keyword: '',
    categoryname: ''
});

const COLUMN_OPTIONS = [
    { key: 'prjname', label: '專案名稱' },
    { key: 'itemid', label: '項目編號' },
    { key: 'applicant', label: '申請人' },
    { key: 'area', label: '區域' },
    { key: 'areaname', label: '區域名稱' },
    { key: 'categoryname', label: '系統類別' },
    { key: 'status', label: '狀態' },
    { key: 'combineid', label: '合併至編號' },
    { key: 'itemname', label: '項目名稱' },
    { key: 'spec', label: '規格數量' },
    { key: 'weight', label: '設備重量' },
    { key: 'class', label: '分類' },
    { key: 'description', label: '現況問題說明' },
    { key: 'purpose', label: '更新目的' },
    { key: 'implement', label: '建議方式' },
    { key: 'supply', label: '設計供應' },
    { key: 'workcontent', label: '內容規格' },
    { key: 'benefit', label: '預期效益' },
    { key: 'note', label: '批示' }
];
const COLUMN_STORAGE_KEY = 'r02-itemlist-columns';
const validKeys = COLUMN_OPTIONS.map(c => c.key);
const visibleColumns = ref(loadVisibleColumns());

function loadVisibleColumns() {
    try {
        const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (raw !== null) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
                return arr.filter(k => validKeys.includes(k));
            }
        }
    } catch (e) { /* ignore */ }
    return [...validKeys];
}

watch(visibleColumns, (val) => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

function isColVisible(key) {
    return visibleColumns.value.includes(key);
}

const checkAll = computed({
    get: () => visibleColumns.value.length === COLUMN_OPTIONS.length,
    set: (val) => {
        visibleColumns.value = val ? [...validKeys] : [];
    }
});
const checkIndeterminate = computed(() =>
    visibleColumns.value.length > 0 && visibleColumns.value.length < COLUMN_OPTIONS.length
);

async function load() {
    loading.value = true;
    try {
        const param = {};
        if (filter.value.keyword) param.keyword = filter.value.keyword;
        if (filter.value.categoryname) param.categoryname = filter.value.categoryname;

        if (Object.keys(param).length === 0) {
            items.value = await r02Service.getAll();
        } else {
            items.value = await r02Service.getBy(param);
        }
    } finally {
        loading.value = false;
    }
}

function reset() {
    filter.value = { keyword: '', categoryname: '' };
    load();
}

onMounted(async () => {
    categories.value = await categoryService.getAll();
    await load();
});

function onRowClick(row) {
    router.push({ name: 'detail', params: { itemid: row.itemid } });
}

function handleExport() {
    if (items.value.length === 0) {
        ElMessage.warning('沒有資料可匯出');
        return;
    }
    const cols = COLUMN_OPTIONS.filter(c => visibleColumns.value.includes(c.key));
    if (cols.length === 0) {
        ElMessage.warning('未選擇任何欄位，請至「顯示欄位」勾選後再匯出');
        return;
    }
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    exportExcel({
        rows: items.value,
        columns: cols,
        filename: `4BFR2-項目清單-${ymd}.xlsx`,
        sheetName: '項目清單'
    });
    ElMessage.success(`已匯出 ${items.value.length} 筆，共 ${cols.length} 個欄位`);
}

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
    <div>
        <div class="page-header">
            <div>
                <h2 class="page-title">項目清單</h2>
                <div class="page-subtitle">共 {{ items.length }} 筆</div>
            </div>
        </div>

        <el-card shadow="never" style="margin-bottom: 16px;">
            <div style="display: grid; grid-template-columns: 2fr 1fr auto auto; gap: 12px; align-items: end;">
                <div>
                    <div style="font-size: 16px; color: #6b7280; margin-bottom: 4px;">關鍵字</div>
                    <el-input
                        v-model="filter.keyword"
                        placeholder="多關鍵字以空白分隔"
                        clearable
                        @keyup.enter="load"
                    />
                </div>
                <div>
                    <div style="font-size: 16px; color: #6b7280; margin-bottom: 4px;">系統類別</div>
                    <el-select v-model="filter.categoryname" placeholder="全部" clearable style="width: 100%;">
                        <el-option
                            v-for="c in categories"
                            :key="c.code"
                            :label="c.categoryname"
                            :value="c.categoryname"
                        />
                    </el-select>
                </div>
                <el-button type="primary" :icon="'Search'" @click="load">查詢</el-button>
                <el-button :icon="'Refresh'" @click="reset">重置</el-button>
            </div>
        </el-card>

        <el-card shadow="never">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 17px; color: #6b7280;">
                    搜尋結果：<span style="color: #1f2937; font-weight: 600;">{{ items.length }}</span> 筆
                </div>
                <div style="display: flex; gap: 8px;">
                <el-button type="success" :icon="'Download'" size="small" @click="handleExport">匯出 Excel</el-button>
                <el-popover placement="bottom-end" :width="240" trigger="click">
                    <template #reference>
                        <el-button :icon="'Setting'" size="small">顯示欄位</el-button>
                    </template>
                    <div style="border-bottom: 1px solid #ebeef5; padding-bottom: 6px; margin-bottom: 6px;">
                        <el-checkbox v-model="checkAll" :indeterminate="checkIndeterminate">全選</el-checkbox>
                    </div>
                    <el-checkbox-group v-model="visibleColumns">
                        <div v-for="c in COLUMN_OPTIONS" :key="c.key" style="margin-bottom: 4px;">
                            <el-checkbox :value="c.key" :label="c.label" />
                        </div>
                    </el-checkbox-group>
                </el-popover>
                </div>
            </div>
            <el-table
                v-loading="loading"
                element-loading-text="查詢中..."
                :data="items"
                border
                show-overflow-tooltip
                max-height="calc(100vh - 320px)"
                style="width: 100%; font-size: 17px;"
                :header-cell-style="{ textAlign: 'center', fontWeight: 700 }"
                @row-dblclick="onRowClick"
            >
                <el-table-column v-if="isColVisible('prjname')" prop="prjname" label="專案名稱" width="180" resizable />
                <el-table-column v-if="isColVisible('itemid')" prop="itemid" label="項目編號" width="100" align="center" resizable />
                <el-table-column v-if="isColVisible('applicant')" prop="applicant" label="申請人" width="140" resizable />
                <el-table-column v-if="isColVisible('area')" prop="area" label="區域" width="180" resizable />
                <el-table-column v-if="isColVisible('areaname')" prop="areaname" label="區域名稱" width="180" resizable />
                <el-table-column v-if="isColVisible('categoryname')" prop="categoryname" label="系統類別" width="200" resizable />
                <el-table-column v-if="isColVisible('status')" label="狀態" width="160" align="center" resizable :show-overflow-tooltip="false">
                    <template #default="{ row }">
                        <el-tag :type="statusTagType(row.status)" size="small">{{ row.status || '-' }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column v-if="isColVisible('combineid')" label="合併至編號" width="120" align="center" resizable :show-overflow-tooltip="false">
                    <template #default="{ row }">
                        <el-link
                            v-if="row.combineid"
                            type="primary"
                            @click.stop="router.push({ name: 'detail', params: { itemid: row.combineid } })"
                        >
                            {{ row.combineid }}
                        </el-link>
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column v-if="isColVisible('itemname')" prop="itemname" label="項目名稱" min-width="220" resizable />
                <el-table-column v-if="isColVisible('spec')" prop="spec" label="規格數量" width="200" resizable />
                <el-table-column v-if="isColVisible('weight')" prop="weight" label="設備重量" width="120" resizable />
                <el-table-column v-if="isColVisible('class')" prop="class" label="分類" width="120" resizable />
                <el-table-column v-if="isColVisible('description')" prop="description" label="現況問題說明" width="260" resizable />
                <el-table-column v-if="isColVisible('purpose')" prop="purpose" label="更新目的" width="240" resizable />
                <el-table-column v-if="isColVisible('implement')" prop="implement" label="建議方式" width="200" resizable />
                <el-table-column v-if="isColVisible('supply')" prop="supply" label="設計供應" width="160" resizable />
                <el-table-column v-if="isColVisible('workcontent')" prop="workcontent" label="內容規格" width="260" resizable />
                <el-table-column v-if="isColVisible('benefit')" prop="benefit" label="預期效益" width="200" resizable />
                <el-table-column v-if="isColVisible('note')" prop="note" label="批示" width="160" resizable />
                <el-table-column label="操作" width="100" align="center" fixed="right" :show-overflow-tooltip="false">
                    <template #default="{ row }">
                        <el-button size="small" type="primary" link @click.stop="onRowClick(row)">檢視</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>
