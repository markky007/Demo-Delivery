import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // ─── Customer Routes (no auth) ─────────────────────
  {
    path: '/t/:publicToken',
    component: () => import('@/layouts/CustomerLayout.vue'),
    children: [
      {
        path: '',
        name: 'customer-welcome',
        component: () => import('@/pages/customer/WelcomePage.vue'),
        meta: { title: '' },
      },
      {
        path: 'menu',
        name: 'customer-menu',
        component: () => import('@/pages/customer/MenuPage.vue'),
        meta: { title: 'Menu' },
      },
      {
        path: 'menu/:itemId',
        name: 'customer-product-detail',
        component: () => import('@/pages/customer/ProductDetailPage.vue'),
        meta: { title: 'Item Detail' },
      },
      {
        path: 'cart',
        name: 'customer-cart',
        component: () => import('@/pages/customer/CartPage.vue'),
        meta: { title: 'Cart' },
      },
      {
        path: 'orders',
        name: 'customer-orders',
        component: () => import('@/pages/customer/OrdersPage.vue'),
        meta: { title: 'Orders' },
      },
      {
        path: 'orders/:orderId',
        name: 'customer-order-detail',
        component: () => import('@/pages/customer/OrderDetailPage.vue'),
        meta: { title: 'Order Detail' },
      },
    ],
  },

  // ─── Owner Routes (auth required) ──────────────────
  {
    path: '/owner/login',
    component: () => import('@/layouts/BlankLayout.vue'),
    children: [
      {
        path: '',
        name: 'owner-login',
        component: () => import('@/pages/owner/LoginPage.vue'),
        meta: { title: 'Login' },
      },
    ],
  },
  {
    path: '/owner',
    component: () => import('@/layouts/OwnerLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/owner/dashboard',
      },
      {
        path: 'dashboard',
        name: 'owner-dashboard',
        component: () => import('@/pages/owner/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'queue',
        name: 'owner-queue',
        component: () => import('@/pages/owner/QueuePage.vue'),
        meta: { title: 'Order Queue' },
      },
      {
        path: 'tables',
        name: 'owner-tables',
        component: () => import('@/pages/owner/TablesPage.vue'),
        meta: { title: 'Tables' },
      },
      {
        path: 'menu',
        name: 'owner-menu',
        component: () => import('@/pages/owner/MenuManagementPage.vue'),
        meta: { title: 'Menu Management' },
      },
      {
        path: 'options',
        name: 'owner-options',
        component: () => import('@/pages/owner/OptionsPage.vue'),
        meta: { title: 'Option Management' },
      },
      {
        path: 'bills',
        name: 'owner-bills',
        component: () => import('@/pages/owner/BillsPage.vue'),
        meta: { title: 'Bills' },
      },
      {
        path: 'bills/:sessionId',
        name: 'owner-bill-detail',
        component: () => import('@/pages/owner/BillDetailPage.vue'),
        meta: { title: 'Bill Detail' },
      },
      {
        path: 'sales',
        name: 'owner-sales',
        component: () => import('@/pages/owner/SalesPage.vue'),
        meta: { title: 'Sales History' },
      },
    ],
  },

  // ─── Root redirect ─────────────────────────────────
  {
    path: '/',
    redirect: '/owner/login',
  },

  // ─── 404 catch-all ─────────────────────────────────
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
