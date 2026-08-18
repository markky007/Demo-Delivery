<template>
  <q-page class="login-page column items-center justify-center">
    <div class="login-card">
      <div class="text-center q-mb-lg">
        <q-icon name="restaurant" size="48px" color="primary" />
        <h5 class="q-mt-md q-mb-xs text-weight-bold">QR Food Order</h5>
        <p class="text-grey-6">Owner Login</p>
      </div>

      <q-form @submit.prevent="handleLogin" class="q-gutter-md">
        <q-input
          v-model="email"
          outlined
          label="Email"
          type="email"
          :rules="[(val) => !!val || 'Email is required']"
          autocomplete="email"
        >
          <template v-slot:prepend>
            <q-icon name="email" />
          </template>
        </q-input>

        <q-input
          v-model="password"
          outlined
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          :rules="[(val) => !!val || 'Password is required']"
          autocomplete="current-password"
        >
          <template v-slot:prepend>
            <q-icon name="lock" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-banner v-if="errorMsg" class="bg-negative text-white q-mt-sm" rounded dense>
          {{ errorMsg }}
        </q-banner>

        <q-btn
          type="submit"
          color="primary"
          unelevated
          no-caps
          size="lg"
          class="full-width login-btn"
          :loading="isLoading"
        >
          Login
        </q-btn>
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  isLoading.value = true;
  errorMsg.value = '';

  try {
    const { error } = await authStore.login(email.value, password.value);

    if (error) {
      errorMsg.value = error;
      return;
    }

    const redirect = (route.query.redirect as string) || '/owner/dashboard';
    await router.push(redirect);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Login failed';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 20px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  margin: 20px;
}

.login-btn {
  border-radius: 12px;
  height: 48px;
  font-weight: 600;
  margin-top: 8px;
}
</style>
