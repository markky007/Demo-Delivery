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
        meta: { title: 'เมนูอาหาร' },
      },
      {
        path: 'menu/:itemId',
        name: 'customer-product-detail',
        component: () => import('@/pages/customer/ProductDetailPage.vue'),
        meta: { title: 'เลือกเมนูอาหาร' },
      },
      {
        path: 'cart',
        name: 'customer-cart',
        component: () => import('@/pages/customer/CartPage.vue'),
        meta: { title: 'ตะกร้าของคุณ' },
      },
      {
        path: 'orders',
        name: 'customer-orders',
        component: () => import('@/pages/customer/OrdersPage.vue'),
        meta: { title: 'รายการอาหารที่สั่ง' },
      },
      {
        path: 'orders/:orderId',
        name: 'customer-order-detail',
        component: () => import('@/pages/customer/OrderDetailPage.vue'),
        meta: { title: 'สถานะออเดอร์' },
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
        meta: { title: 'เข้าสู่ระบบร้านอาหาร' },
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
        meta: { title: 'ภาพรวมร้านค้า' },
      },
      {
        path: 'queue',
        name: 'owner-queue',
        component: () => import('@/pages/owner/QueuePage.vue'),
        meta: { title: 'คิวออเดอร์' },
      },
      {
        path: 'tables',
        name: 'owner-tables',
        component: () => import('@/pages/owner/TablesPage.vue'),
        meta: { title: 'จัดการโต๊ะและ QR' },
      },
      {
        path: 'menu',
        name: 'owner-menu',
        component: () => import('@/pages/owner/MenuManagementPage.vue'),
        meta: { title: 'จัดการเมนูอาหาร' },
      },
      {
        path: 'options',
        name: 'owner-options',
        component: () => import('@/pages/owner/OptionsPage.vue'),
        meta: { title: 'ตัวเลือกเสริม' },
      },
      {
        path: 'bills',
        name: 'owner-bills',
        component: () => import('@/pages/owner/BillsPage.vue'),
        meta: { title: 'บิลและโต๊ะที่เปิดอยู่' },
      },
      {
        path: 'bills/:sessionId',
        name: 'owner-bill-detail',
        component: () => import('@/pages/owner/BillDetailPage.vue'),
        meta: { title: 'รายละเอียดบิล' },
      },
      {
        path: 'sales',
        name: 'owner-sales',
        component: () => import('@/pages/owner/SalesPage.vue'),
        meta: { title: 'ประวัติยอดขาย' },
      },
      {
        path: 'location',
        name: 'owner-location',
        component: () => import('@/pages/owner/LocationSettingsPage.vue'),
        meta: { title: 'พิกัดร้าน & ขอบเขต' },
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
