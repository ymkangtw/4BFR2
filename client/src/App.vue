<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Fold, Expand } from '@element-plus/icons-vue';

const route = useRoute();
const activeMenu = computed(() => {
    if (route.path.startsWith('/detail')) return '/list';
    return route.path;
});

const COLLAPSE_KEY = 'r02-aside-collapsed';
const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1');

function toggleCollapse() {
    collapsed.value = !collapsed.value;
    localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0');
}
</script>

<template>
    <el-container style="height: 100vh">
        <el-aside :width="collapsed ? '64px' : '240px'" class="app-aside">
            <div class="aside-header" :class="{ 'aside-header--collapsed': collapsed }">
                <span v-if="!collapsed" class="aside-title">4BFR2 項目查詢</span>
                <el-button text :icon="collapsed ? Expand : Fold" @click="toggleCollapse" class="collapse-btn" />
            </div>
            <el-menu :default-active="activeMenu" router :collapse="collapsed" style="border-right: none;">
                <el-menu-item index="/">
                    <el-icon><DataBoard /></el-icon>
                    <template #title>總覽</template>
                </el-menu-item>
                <el-menu-item index="/list">
                    <el-icon><Search /></el-icon>
                    <template #title>項目清單</template>
                </el-menu-item>
                <el-menu-item index="/admin">
                    <el-icon><Edit /></el-icon>
                    <template #title>資料維護</template>
                </el-menu-item>
            </el-menu>
        </el-aside>
        <el-container>
            <el-main style="padding: 20px;">
                <router-view v-slot="{ Component }">
                    <keep-alive include="ItemList">
                        <component :is="Component" />
                    </keep-alive>
                </router-view>
            </el-main>
        </el-container>
    </el-container>
</template>

<style>
.app-aside {
    background: #ffffff;
    border-right: 1px solid #e5e7eb;
    transition: width 0.2s;
    overflow: hidden;
}
.aside-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #e5e7eb;
}
.aside-header--collapsed {
    justify-content: center;
    padding: 14px 0;
}
.aside-title {
    font-size: 20px;
    font-weight: 800;
    color: #111827;
}
.collapse-btn {
    font-size: 20px !important;
    color: #4b5563;
}
.el-menu-item.is-active {
    background-color: #f3f4f6 !important;
    border-left: 3px solid #2563eb;
    font-weight: 700;
}
.el-menu--collapse {
    width: 64px;
}
</style>
