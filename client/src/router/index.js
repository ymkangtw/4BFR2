import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    { path: '/', name: 'overview', component: () => import('@/views/Overview.vue') },
    { path: '/list', name: 'list', component: () => import('@/views/ItemList.vue') },
    { path: '/detail/:itemid', name: 'detail', component: () => import('@/views/ItemDetail.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
