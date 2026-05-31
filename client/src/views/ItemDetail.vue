<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import R02Service from '@/service/r02.service.js';
import CategoryService from '@/service/category.service.js';
import AdminService from '@/service/admin.service.js';
import { itemListContext } from '@/store/itemListContext.js';

const route = useRoute();
const router = useRouter();
const r02Service = new R02Service();
const categoryService = new CategoryService();
const adminService = new AdminService();

const loading = ref(false);
const item = ref(null);

// ===== 編輯模式 =====
const editing = ref(false);
const saving = ref(false);
const optionsLoaded = ref(false);
const categories = ref([]);
const distinctStatus = ref([]);
const distinctArea = ref([]);
const distinctAreaname = ref([]);
const distinctApplicant = ref([]);
const distinctClass = ref([]);

const form = reactive({
    itemid: '', prjname: '', itemname: '', applicant: '',
    categoryname: '', status: '', area: '', areaname: '', class: '',
    combineid: '', spec: '', weight: '', implement: '', supply: '',
    description: '', purpose: '', workcontent: '', benefit: '', note: ''
});

async function loadOptions() {
    if (optionsLoaded.value) return;
    const [cats, status, area, areaname, applicant, klass] = await Promise.all([
        categoryService.getAll(),
        adminService.getDistinct('status'),
        adminService.getDistinct('area'),
        adminService.getDistinct('areaname'),
        adminService.getDistinct('applicant'),
        adminService.getDistinct('class')
    ]);
    categories.value = cats;
    distinctStatus.value = status;
    distinctArea.value = area;
    distinctAreaname.value = areaname;
    distinctApplicant.value = applicant;
    distinctClass.value = klass;
    optionsLoaded.value = true;
}

async function enterEdit() {
    if (!item.value) return;
    Object.assign(form, {
        itemid: item.value.itemid || '',
        prjname: item.value.prjname || '',
        itemname: item.value.itemname || '',
        applicant: item.value.applicant || '',
        categoryname: item.value.categoryname || '',
        status: item.value.status || '',
        area: item.value.area || '',
        areaname: item.value.areaname || '',
        class: item.value.class || '',
        combineid: item.value.combineid || '',
        spec: item.value.spec || '',
        weight: item.value.weight || '',
        implement: item.value.implement || '',
        supply: item.value.supply || '',
        description: item.value.description || '',
        purpose: item.value.purpose || '',
        workcontent: item.value.workcontent || '',
        benefit: item.value.benefit || '',
        note: item.value.note || ''
    });
    editing.value = true;
    try {
        await loadOptions();
    } catch (e) {
        ElMessage.error('載入選項失敗');
    }
}

function cancelEdit() {
    editing.value = false;
}

async function save() {
    if (!form.prjname?.trim()) return ElMessage.warning('請填寫專案名稱');
    if (!form.itemname?.trim()) return ElMessage.warning('請填寫項目名稱');

    saving.value = true;
    try {
        const updated = await adminService.updateR02(form.itemid, { ...form });
        item.value = updated;
        editing.value = false;
        ElMessage.success('已更新');
    } finally {
        saving.value = false;
    }
}

const currentIndex = computed(() =>
    itemListContext.itemids.indexOf(route.params.itemid)
);
const total = computed(() => itemListContext.itemids.length);
const hasSequence = computed(() => total.value > 0 && currentIndex.value !== -1);
const hasPrev = computed(() => hasSequence.value && currentIndex.value > 0 && !editing.value);
const hasNext = computed(() => hasSequence.value && currentIndex.value < total.value - 1 && !editing.value);

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
    editing.value = false;
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
            <div class="detail-nav-left">
                <el-button :icon="'ArrowLeft'" :disabled="editing" @click="router.push('/list')">返回清單</el-button>
                <template v-if="!editing">
                    <el-button type="primary" :icon="'Edit'" :disabled="!item" @click="enterEdit">編輯</el-button>
                </template>
                <template v-else>
                    <el-button type="success" :icon="'Check'" :loading="saving" @click="save">儲存</el-button>
                    <el-button :icon="'Close'" :disabled="saving" @click="cancelEdit">取消</el-button>
                </template>
            </div>
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
            <el-descriptions :column="1" border size="default" label-width="130px">
                <el-descriptions-item label="專案名稱">
                    <el-input v-if="editing" v-model="form.prjname" />
                    <template v-else>{{ item.prjname || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="項目名稱">
                    <el-input v-if="editing" v-model="form.itemname" />
                    <template v-else>{{ item.itemname || '-' }}</template>
                </el-descriptions-item>
            </el-descriptions>

            <el-descriptions :column="3" border size="default" label-width="130px" style="margin-top: 16px;">
                <el-descriptions-item label="項目編號">{{ item.itemid }}</el-descriptions-item>
                <el-descriptions-item label="狀態">
                    <el-select v-if="editing" v-model="form.status" filterable allow-create clearable style="width: 100%;">
                        <el-option v-for="v in distinctStatus" :key="v" :label="v" :value="v" />
                    </el-select>
                    <el-tag v-else :type="statusTagType(item.status)">{{ item.status || '-' }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="申請人">
                    <el-select v-if="editing" v-model="form.applicant" filterable allow-create clearable style="width: 100%;">
                        <el-option v-for="v in distinctApplicant" :key="v" :label="v" :value="v" />
                    </el-select>
                    <template v-else>{{ item.applicant || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="合併至編號">
                    <el-input v-if="editing" v-model="form.combineid" placeholder="輸入項目編號" />
                    <template v-else>
                        <el-link
                            v-if="item.combineid"
                            type="primary"
                            @click="router.push({ name: 'detail', params: { itemid: item.combineid } })"
                        >
                            {{ item.combineid }}
                        </el-link>
                        <span v-else>-</span>
                    </template>
                </el-descriptions-item>
                <el-descriptions-item label="區域">
                    <el-select v-if="editing" v-model="form.area" filterable allow-create clearable style="width: 100%;">
                        <el-option v-for="v in distinctArea" :key="v" :label="v" :value="v" />
                    </el-select>
                    <template v-else>{{ item.area || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="區域名稱">
                    <el-select v-if="editing" v-model="form.areaname" filterable allow-create clearable style="width: 100%;">
                        <el-option v-for="v in distinctAreaname" :key="v" :label="v" :value="v" />
                    </el-select>
                    <template v-else>{{ item.areaname || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="系統類別">
                    <el-select v-if="editing" v-model="form.categoryname" clearable placeholder="選擇" style="width: 100%;">
                        <el-option v-for="c in categories" :key="c.code" :label="c.categoryname" :value="c.categoryname" />
                    </el-select>
                    <template v-else>{{ item.categoryname || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="分類">
                    <el-select v-if="editing" v-model="form.class" filterable allow-create clearable style="width: 100%;">
                        <el-option v-for="v in distinctClass" :key="v" :label="v" :value="v" />
                    </el-select>
                    <template v-else>{{ item.class || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="設備重量">
                    <el-input v-if="editing" v-model="form.weight" />
                    <template v-else>{{ item.weight || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="設計供應">
                    <el-input v-if="editing" v-model="form.supply" />
                    <template v-else>{{ item.supply || '-' }}</template>
                </el-descriptions-item>
                <el-descriptions-item label="建議方式" :span="2">
                    <el-input v-if="editing" v-model="form.implement" type="textarea" :autosize="{ minRows: 2, maxRows: 12 }" />
                    <template v-else>{{ item.implement || '-' }}</template>
                </el-descriptions-item>
            </el-descriptions>

            <el-descriptions :column="1" border size="default" label-width="130px" style="margin-top: 16px;">
                <el-descriptions-item label="規格數量">
                    <el-input v-if="editing" v-model="form.spec" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" />
                    <div v-else class="long-text">{{ item.spec || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="現況問題說明">
                    <el-input v-if="editing" v-model="form.description" type="textarea" :autosize="{ minRows: 4, maxRows: 20 }" />
                    <div v-else class="long-text">{{ item.description || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="更新目的">
                    <el-input v-if="editing" v-model="form.purpose" type="textarea" :autosize="{ minRows: 4, maxRows: 20 }" />
                    <div v-else class="long-text">{{ item.purpose || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="內容規格">
                    <el-input v-if="editing" v-model="form.workcontent" type="textarea" :autosize="{ minRows: 6, maxRows: 25 }" />
                    <div v-else class="long-text">{{ item.workcontent || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="預期效益">
                    <el-input v-if="editing" v-model="form.benefit" type="textarea" :autosize="{ minRows: 3, maxRows: 15 }" />
                    <div v-else class="long-text">{{ item.benefit || '-' }}</div>
                </el-descriptions-item>
                <el-descriptions-item label="批示">
                    <el-input v-if="editing" v-model="form.note" type="textarea" :autosize="{ minRows: 2, maxRows: 10 }" />
                    <div v-else class="long-text">{{ item.note || '-' }}</div>
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
/* 固定表格欄寬，讓檢視 / 編輯模式欄位寬度一致 */
:deep(.el-descriptions__table) {
    table-layout: fixed;
}
/* 編輯欄位字級對齊唯讀模式（17px） */
:deep(.el-descriptions__content .el-input__inner),
:deep(.el-descriptions__content .el-textarea__inner),
:deep(.el-descriptions__content .el-select__selected-item),
:deep(.el-descriptions__content .el-select__placeholder) {
    font-size: 17px;
}
.detail-nav-left {
    display: flex;
    align-items: center;
    gap: 12px;
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
