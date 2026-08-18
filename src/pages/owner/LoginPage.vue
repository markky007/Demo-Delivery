<template>
  <q-page class="login-page column items-center justify-center q-pa-md">
    <div class="login-card">
      <!-- Header / Logo -->
      <div class="text-center q-mb-xl">
        <div class="login-logo-wrap q-mx-auto q-mb-md">
          <q-icon name="restaurant_menu" size="36px" color="primary" />
        </div>
        <h5 class="q-my-xs text-weight-bold login-title">ระบบจัดการร้านอาหาร</h5>
        <p class="text-grey-7 q-mb-none text-caption">
          เข้าสู่ระบบสำหรับเจ้าของร้าน (Owner Portal)
        </p>
      </div>

      <q-form @submit.prevent="handleLogin" class="q-gutter-y-md">
        <div>
          <div class="field-label q-mb-xs">อีเมล</div>
          <q-input
            v-model="email"
            outlined
            placeholder="admin@restaurant.com"
            type="email"
            :rules="[(val) => !!val || 'กรุณาระบุอีเมล']"
            autocomplete="email"
            class="login-input"
          >
            <template v-slot:prepend>
              <q-icon name="mail_outline" color="grey-6" />
            </template>
          </q-input>
        </div>

        <div>
          <div class="field-label q-mb-xs">รหัสผ่าน</div>
          <q-input
            v-model="password"
            outlined
            placeholder="••••••••"
            :type="showPassword ? 'text' : 'password'"
            :rules="[(val) => !!val || 'กรุณาระบุรหัสผ่าน']"
            autocomplete="current-password"
            class="login-input"
          >
            <template v-slot:prepend>
              <q-icon name="lock_outline" color="grey-6" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                color="grey-6"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
        </div>

        <q-banner v-if="errorMsg" class="bg-red-1 text-negative q-mt-sm" rounded dense>
          <template v-slot:avatar>
            <q-icon name="error_outline" color="negative" />
          </template>
          {{ errorMsg }}
        </q-banner>

        <q-btn
          type="submit"
          color="primary"
          unelevated
          no-caps
          size="lg"
          class="full-width login-btn q-mt-md"
          :loading="isLoading"
        >
          <span>เข้าสู่ระบบ</span>
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
      errorMsg.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      return;
    }

    const redirect = (route.query.redirect as string) || '/owner/dashboard';
    await router.push(redirect);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #ffffff 0%, var(--color-background) 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
}

.login-logo-wrap {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.field-label {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.login-btn {
  border-radius: var(--radius-md);
  height: 50px;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: var(--shadow-md);
}
</style>
