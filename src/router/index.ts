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

  // Handle dynamic import failures (e.g. after a new build/deployment)
  Router.onError((error, to) => {
    const isChunkLoadFailed =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Expected a JavaScript-or-Wasm module script') ||
      error?.name === 'ChunkLoadError';

    if (isChunkLoadFailed) {
      if (to?.fullPath) {
        window.location.href = to.fullPath;
      } else {
        window.location.reload();
      }
    }
  });

  return Router;
});
