<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import R02Service from '@/service/r02.service.js';
import CategoryService from '@/service/category.service.js';
import AdminService from '@/service/admin.service.js';

defineOptions({ name: 'AdminEdit' });

const r02Service = new R02Service();
const categoryService = new CategoryService();
const adminService = new AdminService();

const activeTab = ref('r02');

// ===== r02 列表狀態 =====
const r02Loading = ref(false);
const items = ref([]);
const filter = ref({ keyword: '', categoryname: '' });
const categories = ref([]);
const selectedRows = ref([]);
const r02TableRef = ref(null);

// 下拉選單去重資料（編輯 drawer 用）
const distinctStatus = ref([]);
const distinctArea = ref([]);
const distinctAreaname = ref([]);
const distinctApplicant = ref([]);
const distinctClass = ref([]);

// ===== r02 顯示欄位（與 ItemList 分開 localStorage key） =====
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
const COLUMN_STORAGE_KEY = 'r02-admin-columns';
const validKeys = COLUMN_OPTIONS.map(c => c.key);
const DEFAULT_COLUMNS = ['itemid', 'prjname', 'itemname', 'categoryname', 'area', 'status'];

function loadVisibleColumns() {
    try {
        const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (raw !== null) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return arr.filter(k => validKeys.includes(k));
        }
    } catch (e) { /* ignore */ }
    return [...DEFAULT_COLUMNS];
}
const visibleColumns = ref(loadVisibleColumns());
watch(visibleColumns, (val) => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(val));
}, { deep: true });
function isColVisible(key) { return visibleColumns.value.includes(key); }

const checkAll = computed({
    get: () => visibleColumns.value.length === COLUMN_OPTIONS.length,
    set: (val) => { visibleColumns.value = val ? [...validKeys] : []; }
});
const checkIndeterminate = computed(() =>
    visibleColumns.value.length > 0 && visibleColumns.value.length < COLUMN_OPTIONS.length
);

// ===== r02 編輯 drawer =====
const r02Drawer = ref(false);
const r02DrawerMode = ref('create'); // 'create' | 'edit'
const r02DrawerSaving = ref(false);
const r02Form = reactive({
    itemid: '', prjname: '', itemname: '', applicant: '',
    categoryname: '', status: '', area: '', areaname: '', class: '',
    combineid: '', spec: '', weight: '', implement: '', supply: '',
    description: '', purpose: '', workcontent: '', benefit: '', note: ''
});

function resetR02Form() {
    Object.assign(r02Form, {
        itemid: '', prjname: '', itemname: '', applicant: '',
        categoryname: '', status: '', area: '', areaname: '', class: '',
        combineid: '', spec: '', weight: '', implement: '', supply: '',
        description: '', purpose: '', workcontent: '', benefit: '', note: ''
    });
}

function openR02Create() {
    r02DrawerMode.value = 'create';
    resetR02Form();
    r02Drawer.value = true;
}

function openR02Edit(row) {
    r02DrawerMode.value = 'edit';
    Object.assign(r02Form, {
        itemid: row.itemid || '',
        prjname: row.prjname || '',
        itemname: row.itemname || '',
        applicant: row.applicant || '',
        categoryname: row.categoryname || '',
        status: row.status || '',
        area: row.area || '',
        areaname: row.areaname || '',
        class: row.class || '',
        combineid: row.combineid || '',
        spec: row.spec || '',
        weight: row.weight || '',
        implement: row.implement || '',
        supply: row.supply || '',
        description: row.description || '',
        purpose: row.purpose || '',
        workcontent: row.workcontent || '',
        benefit: row.benefit || '',
        note: row.note || ''
    });
    r02Drawer.value = true;
}

async function saveR02() {
    if (!r02Form.itemid?.trim()) return ElMessage.warning('請填寫項目編號');
    if (!r02Form.prjname?.trim()) return ElMessage.warning('請填寫專案名稱');
    if (!r02Form.itemname?.trim()) return ElMessage.warning('請填寫項目名稱');

    r02DrawerSaving.value = true;
    try {
        const body = { ...r02Form };
        if (r02DrawerMode.value === 'create') {
            const created = await adminService.createR02(body);
            items.value.unshift(created);
            ElMessage.success('已新增');
        } else {
            const updated = await adminService.updateR02(r02Form.itemid, body);
            const idx = items.value.findIndex(it => it.itemid === r02Form.itemid);
            if (idx !== -1) items.value.splice(idx, 1, updated);
            ElMessage.success('已更新');
        }
        r02Drawer.value = false;
    } finally {
        r02DrawerSaving.value = false;
    }
}

async function deleteSelected() {
    if (selectedRows.value.length === 0) return;
    const targets = [...selectedRows.value];
    try {
        await ElMessageBox.confirm(
            `確定刪除已勾選的 ${targets.length} 筆項目？`,
            '刪除確認',
            { confirmButtonText: '刪除', cancelButtonText: '取消', type: 'warning' }
        );
    } catch (e) { return; }

    const success = [];
    const failed = [];
    for (const row of targets) {
        try {
            await adminService.deleteR02(row.itemid);
            success.push(row.itemid);
        } catch (err) {
            failed.push(row.itemid);
        }
    }
    if (success.length) {
        items.value = items.value.filter(it => !success.includes(it.itemid));
    }
    if (r02TableRef.value) r02TableRef.value.clearSelection();
    selectedRows.value = [];

    if (failed.length === 0) {
        ElMessage.success(`已刪除 ${success.length} 筆`);
    } else if (success.length === 0) {
        ElMessage.error(`刪除失敗 ${failed.length} 筆`);
    } else {
        ElMessage.warning(`成功 ${success.length} 筆，失敗 ${failed.length} 筆（被引用無法刪除）`);
    }
}

// combineid autocomplete
function combineidSuggest(query, cb) {
    if (!query) return cb([]);
    const q = String(query).toLowerCase();
    const matches = items.value
        .filter(it => it.itemid && it.itemid !== r02Form.itemid && it.itemid.toLowerCase().includes(q))
        .slice(0, 20)
        .map(it => ({ value: it.itemid, label: `${it.itemid}  ${it.itemname || ''}` }));
    cb(matches);
}

// ===== category =====
const catLoading = ref(false);
const catDrawer = ref(false);
const catDrawerMode = ref('create');
const catDrawerSaving = ref(false);
const catForm = reactive({ id: null, code: '', categoryname: '', _origName: '' });
const selectedCats = ref([]);
const catTableRef = ref(null);

function openCatCreate() {
    catDrawerMode.value = 'create';
    Object.assign(catForm, { id: null, code: '', categoryname: '', _origName: '' });
    catDrawer.value = true;
}

function openCatEdit(row) {
    catDrawerMode.value = 'edit';
    Object.assign(catForm, {
        id: row.id,
        code: row.code || '',
        categoryname: row.categoryname || '',
        _origName: row.categoryname || ''
    });
    catDrawer.value = true;
}

async function saveCat() {
    if (!catForm.code?.trim()) return ElMessage.warning('請填寫代碼');
    if (!catForm.categoryname?.trim()) return ElMessage.warning('請填寫類別名稱');

    if (catDrawerMode.value === 'edit' && catForm.categoryname.trim() !== catForm._origName) {
        try {
            const refInfo = await adminService.getCategoryRefCount(catForm.id);
            if (refInfo.count > 0) {
                await ElMessageBox.confirm(
                    `將同步更新 ${refInfo.count} 筆 r02 項目的系統類別名稱（${catForm._origName} → ${catForm.categoryname}），確定繼續？`,
                    '修改類別名稱',
                    { confirmButtonText: '確定同步更新', cancelButtonText: '取消', type: 'warning' }
                );
            }
        } catch (e) { return; }
    }

    catDrawerSaving.value = true;
    try {
        const body = { code: catForm.code.trim(), categoryname: catForm.categoryname.trim() };
        if (catDrawerMode.value === 'create') {
            const created = await adminService.createCategory(body);
            categories.value.push(created);
            categories.value.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
            ElMessage.success('已新增類別');
        } else {
            const result = await adminService.updateCategory(catForm.id, body);
            const idx = categories.value.findIndex(c => c.id === catForm.id);
            if (idx !== -1) categories.value.splice(idx, 1, result.category);
            categories.value.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
            // 若 categoryname 改名，同步刷新 r02 items 內的 categoryname 顯示
            if (result.syncedR02 > 0) {
                items.value.forEach(it => {
                    if (it.categoryname === catForm._origName) it.categoryname = result.category.categoryname;
                });
                ElMessage.success(`已更新類別，同步更新 ${result.syncedR02} 筆 r02 項目`);
            } else {
                ElMessage.success('已更新類別');
            }
        }
        catDrawer.value = false;
    } finally {
        catDrawerSaving.value = false;
    }
}

async function deleteSelectedCats() {
    if (selectedCats.value.length === 0) return;
    const targets = [...selectedCats.value];
    try {
        await ElMessageBox.confirm(
            `確定刪除已勾選的 ${targets.length} 個類別？`,
            '刪除確認',
            { confirmButtonText: '刪除', cancelButtonText: '取消', type: 'warning' }
        );
    } catch (e) { return; }

    const success = [];
    const failed = [];
    for (const row of targets) {
        try {
            await adminService.deleteCategory(row.id);
            success.push(row.id);
        } catch (err) {
            failed.push(row.id);
        }
    }
    if (success.length) {
        categories.value = categories.value.filter(c => !success.includes(c.id));
    }
    if (catTableRef.value) catTableRef.value.clearSelection();
    selectedCats.value = [];

    if (failed.length === 0) {
        ElMessage.success(`已刪除 ${success.length} 個類別`);
    } else if (success.length === 0) {
        ElMessage.error(`刪除失敗 ${failed.length} 個（仍被 r02 引用）`);
    } else {
        ElMessage.warning(`成功 ${success.length} 個，失敗 ${failed.length} 個（被引用無法刪除）`);
    }
}

// ===== 載入 =====
async function loadR02() {
    r02Loading.value = true;
    try {
        const param = {};
        if (filter.value.keyword) param.keyword = filter.value.keyword;
        if (filter.value.categoryname) param.categoryname = filter.value.categoryname;
        items.value = Object.keys(param).length
            ? await r02Service.getBy(param)
            : await r02Service.getAll();
    } finally {
        r02Loading.value = false;
    }
}

function resetFilter() {
    filter.value = { keyword: '', categoryname: '' };
    loadR02();
}

async function loadCategories() {
    catLoading.value = true;
    try {
        categories.value = await categoryService.getAll();
    } finally {
        catLoading.value = false;
    }
}

async function loadDistincts() {
    [distinctStatus.value, distinctArea.value, distinctAreaname.value,
     distinctApplicant.value, distinctClass.value] = await Promise.all([
        adminService.getDistinct('status'),
        adminService.getDistinct('area'),
        adminService.getDistinct('areaname'),
        adminService.getDistinct('applicant'),
        adminService.getDistinct('class')
    ]);
}

onMounted(async () => {
    await Promise.all([loadCategories(), loadR02(), loadDistincts()]);
});

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
                <h2 class="page-title">資料維護</h2>
                <div class="page-subtitle">編輯 r02 項目與 category 類別資料</div>
            </div>
        </div>

        <el-alert
            title="注意：執行 npm run init-db 會重建資料表並清除所有編輯內容。重新匯入 Excel 前請自行備份 server/data/r02.db。"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 16px;"
        />

        <el-tabs v-model="activeTab" type="border-card">
            <!-- ===== r02 Tab ===== -->
            <el-tab-pane label="r02" name="r02">
                <el-card shadow="never" style="margin-bottom: 16px;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr auto auto auto auto; gap: 12px; align-items: end;">
                        <div>
                            <div style="font-size: 16px; color: #6b7280; margin-bottom: 4px;">關鍵字</div>
                            <el-input
                                v-model="filter.keyword"
                                placeholder="多關鍵字以空白分隔"
                                clearable
                                @keyup.enter="loadR02"
                            />
                        </div>
                        <div>
                            <div style="font-size: 16px; color: #6b7280; margin-bottom: 4px;">系統類別</div>
                            <el-select v-model="filter.categoryname" placeholder="全部" clearable style="width: 100%;">
                                <el-option v-for="c in categories" :key="c.code" :label="c.categoryname" :value="c.categoryname" />
                            </el-select>
                        </div>
                        <el-button type="primary" :icon="'Search'" @click="loadR02">查詢</el-button>
                        <el-button :icon="'Refresh'" @click="resetFilter">重置</el-button>
                        <el-button type="success" :icon="'Plus'" @click="openR02Create">新增項目</el-button>
                        <el-button
                            type="danger"
                            :icon="'Delete'"
                            :disabled="selectedRows.length === 0"
                            @click="deleteSelected"
                        >刪除項目<span v-if="selectedRows.length > 0">（{{ selectedRows.length }}）</span></el-button>
                    </div>
                </el-card>

                <el-card shadow="never">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="font-size: 17px; color: #6b7280;">
                            共 <span style="color: #1f2937; font-weight: 600;">{{ items.length }}</span> 筆
                        </div>
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
                    <el-table
                        ref="r02TableRef"
                        v-loading="r02Loading"
                        element-loading-text="查詢中..."
                        :data="items"
                        border
                        show-overflow-tooltip
                        max-height="calc(100vh - 380px)"
                        style="width: 100%; font-size: 17px;"
                        :header-cell-style="{ textAlign: 'center', fontWeight: 700 }"
                        row-key="itemid"
                        @selection-change="rows => selectedRows = rows"
                    >
                        <el-table-column type="selection" width="55" align="center" :show-overflow-tooltip="false" />
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
                        <el-table-column v-if="isColVisible('combineid')" prop="combineid" label="合併至編號" width="120" align="center" resizable />
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
                        <el-table-column label="操作" width="90" align="center" fixed="right" :show-overflow-tooltip="false">
                            <template #default="{ row }">
                                <el-button size="small" type="primary" link @click.stop="openR02Edit(row)">編輯</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </el-tab-pane>

            <!-- ===== category Tab ===== -->
            <el-tab-pane label="category" name="category">
                <el-card shadow="never" style="margin-bottom: 16px;">
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <el-button type="success" :icon="'Plus'" @click="openCatCreate">新增類別</el-button>
                        <el-button
                            type="danger"
                            :icon="'Delete'"
                            :disabled="selectedCats.length === 0"
                            @click="deleteSelectedCats"
                        >刪除類別<span v-if="selectedCats.length > 0">（{{ selectedCats.length }}）</span></el-button>
                    </div>
                </el-card>

                <el-card shadow="never">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="font-size: 17px; color: #6b7280;">
                            共 <span style="color: #1f2937; font-weight: 600;">{{ categories.length }}</span> 個類別
                        </div>
                    </div>
                    <el-table
                        ref="catTableRef"
                        v-loading="catLoading"
                        :data="categories"
                        border
                        style="width: 100%; font-size: 17px;"
                        :header-cell-style="{ textAlign: 'center', fontWeight: 700 }"
                        row-key="id"
                        @selection-change="rows => selectedCats = rows"
                    >
                        <el-table-column type="selection" width="55" align="center" :show-overflow-tooltip="false" />
                        <el-table-column prop="code" label="代碼" width="120" align="center" />
                        <el-table-column prop="categoryname" label="系統類別名稱" min-width="280" />
                        <el-table-column label="操作" width="90" align="center" :show-overflow-tooltip="false">
                            <template #default="{ row }">
                                <el-button size="small" type="primary" link @click.stop="openCatEdit(row)">編輯</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </el-tab-pane>
        </el-tabs>

        <!-- ===== r02 編輯 drawer ===== -->
        <el-drawer v-model="r02Drawer" :title="r02DrawerMode === 'create' ? '新增 r02 項目' : `編輯 r02 項目 - ${r02Form.itemid}`"
                   direction="rtl" size="960px" :close-on-click-modal="false">
            <div class="drawer-section-title">基本資訊</div>
            <el-form label-width="120px" label-position="right">
                <el-row :gutter="12">
                    <el-col :span="12">
                        <el-form-item label="項目編號" required>
                            <el-input v-model="r02Form.itemid" :disabled="r02DrawerMode === 'edit'" placeholder="必填，編輯時不可改" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="申請人">
                            <el-select v-model="r02Form.applicant" filterable allow-create clearable placeholder="可選擇或輸入新值" style="width: 100%;">
                                <el-option v-for="v in distinctApplicant" :key="v" :label="v" :value="v" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item label="專案名稱" required>
                    <el-input v-model="r02Form.prjname" placeholder="必填" />
                </el-form-item>
                <el-form-item label="項目名稱" required>
                    <el-input v-model="r02Form.itemname" placeholder="必填" />
                </el-form-item>
            </el-form>

            <div class="drawer-section-title">分類與狀態</div>
            <el-form label-width="120px" label-position="right">
                <el-row :gutter="12">
                    <el-col :span="12">
                        <el-form-item label="系統類別">
                            <el-select v-model="r02Form.categoryname" clearable placeholder="選擇" style="width: 100%;">
                                <el-option v-for="c in categories" :key="c.code" :label="c.categoryname" :value="c.categoryname" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="狀態">
                            <el-select v-model="r02Form.status" filterable allow-create clearable style="width: 100%;">
                                <el-option v-for="v in distinctStatus" :key="v" :label="v" :value="v" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-row :gutter="12">
                    <el-col :span="12">
                        <el-form-item label="區域">
                            <el-select v-model="r02Form.area" filterable allow-create clearable style="width: 100%;">
                                <el-option v-for="v in distinctArea" :key="v" :label="v" :value="v" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="區域名稱">
                            <el-select v-model="r02Form.areaname" filterable allow-create clearable style="width: 100%;">
                                <el-option v-for="v in distinctAreaname" :key="v" :label="v" :value="v" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-row :gutter="12">
                    <el-col :span="12">
                        <el-form-item label="分類">
                            <el-select v-model="r02Form.class" filterable allow-create clearable style="width: 100%;">
                                <el-option v-for="v in distinctClass" :key="v" :label="v" :value="v" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="合併至編號">
                            <el-autocomplete
                                v-model="r02Form.combineid"
                                :fetch-suggestions="combineidSuggest"
                                placeholder="輸入查詢項目編號"
                                clearable
                                style="width: 100%;"
                            >
                                <template #default="{ item }">
                                    <div style="font-size: 14px;">{{ item.label }}</div>
                                </template>
                            </el-autocomplete>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>

            <div class="drawer-section-title">規格資訊</div>
            <el-form label-width="120px" label-position="right">
                <el-form-item label="規格數量">
                    <el-input v-model="r02Form.spec" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" />
                </el-form-item>
                <el-row :gutter="12">
                    <el-col :span="12">
                        <el-form-item label="設備重量">
                            <el-input v-model="r02Form.weight" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="設計供應">
                            <el-input v-model="r02Form.supply" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item label="建議方式">
                    <el-input v-model="r02Form.implement" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" />
                </el-form-item>
            </el-form>

            <div class="drawer-section-title">長文描述</div>
            <el-form label-width="120px" label-position="right">
                <el-form-item label="現況問題說明">
                    <el-input v-model="r02Form.description" type="textarea" :autosize="{ minRows: 4, maxRows: 20 }" />
                </el-form-item>
                <el-form-item label="更新目的">
                    <el-input v-model="r02Form.purpose" type="textarea" :autosize="{ minRows: 4, maxRows: 20 }" />
                </el-form-item>
                <el-form-item label="內容規格">
                    <el-input v-model="r02Form.workcontent" type="textarea" :autosize="{ minRows: 6, maxRows: 25 }" />
                </el-form-item>
                <el-form-item label="預期效益">
                    <el-input v-model="r02Form.benefit" type="textarea" :autosize="{ minRows: 3, maxRows: 15 }" />
                </el-form-item>
                <el-form-item label="批示">
                    <el-input v-model="r02Form.note" type="textarea" :autosize="{ minRows: 2, maxRows: 10 }" />
                </el-form-item>
            </el-form>

            <template #footer>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <el-button @click="r02Drawer = false">取消</el-button>
                    <el-button type="primary" :loading="r02DrawerSaving" @click="saveR02">儲存</el-button>
                </div>
            </template>
        </el-drawer>

        <!-- ===== category 編輯 drawer ===== -->
        <el-drawer v-model="catDrawer" :title="catDrawerMode === 'create' ? '新增類別' : '編輯類別'"
                   direction="rtl" size="960px" :close-on-click-modal="false">
            <div class="drawer-section-title">類別資訊</div>
            <el-form label-width="120px" label-position="right">
                <el-row :gutter="12">
                    <el-col :span="8">
                        <el-form-item label="代碼" required>
                            <el-input v-model="catForm.code" placeholder="例：A、B、C..." maxlength="4" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="16">
                        <el-form-item label="類別名稱" required>
                            <el-input v-model="catForm.categoryname" placeholder="例：A.儀錶控制系統(DCS)" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-alert
                    v-if="catDrawerMode === 'edit' && catForm.categoryname !== catForm._origName"
                    title="修改類別名稱會同步更新所有 r02 項目中對應此類別的紀錄。"
                    type="info"
                    :closable="false"
                    style="margin-top: 8px;"
                />
            </el-form>
            <template #footer>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <el-button @click="catDrawer = false">取消</el-button>
                    <el-button type="primary" :loading="catDrawerSaving" @click="saveCat">儲存</el-button>
                </div>
            </template>
        </el-drawer>
    </div>
</template>

<style scoped>
.drawer-section-title {
    font-size: 17px;
    font-weight: 700;
    color: #1f2937;
    margin: 12px 0 8px;
    padding-left: 8px;
    border-left: 4px solid #2563eb;
}
</style>
