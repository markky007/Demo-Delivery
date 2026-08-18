/**
 * Supabase boot file.
 * Registers the Supabase client as a global plugin
 * and makes it available throughout the application.
 */
import { defineBoot } from '#q-app';
import { supabase } from 'src/services/supabase';
import { useAuthStore } from 'src/stores/authStore';

// Simply importing the module initializes the client.
// This boot file ensures it's loaded early in the app lifecycle.
export default defineBoot(async ({ app }) => {
  // Provide supabase client to all components via inject
  app.provide('supabase', supabase);

  // Initialize auth state
  const authStore = useAuthStore();
  await authStore.initialize();
});
