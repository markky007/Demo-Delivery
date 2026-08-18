import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';
import { useAuthStore } from 'src/stores/authStore';

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // Auth guard for owner routes
  Router.beforeEach(async (to) => {
    if (to.matched.some((record) => record.meta.requiresAuth)) {
      const authStore = useAuthStore();

      // Initialize auth if not done
      if (authStore.isLoading) {
        await authStore.initialize();
      }

      if (!authStore.isAuthenticated) {
        return { name: 'owner-login', query: { redirect: to.fullPath } };
      }
    }
  });

  return Router;
});
