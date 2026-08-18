<template>
  <div class="fullscreen not-found-page flex flex-center text-center q-pa-md">
    <div class="not-found-card q-pa-xl column items-center">
      <div class="error-code text-weight-bold text-primary">404</div>
      <h5 class="q-my-sm text-weight-bold text-dark">ไม่พบหน้าที่คุณต้องการ</h5>
      <p class="text-grey-7 q-mb-lg max-w-sm">
        หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออกไปแล้ว หรือลิงก์อาจไม่ถูกต้อง
      </p>

      <q-btn color="primary" unelevated no-caps rounded size="lg" to="/" class="home-btn">
        <q-icon name="home" class="q-mr-xs" />
        <span>กลับสู่หน้าหลัก</span>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.not-found-page {
  background: radial-gradient(circle at top, #ffffff 0%, var(--color-background) 100%);
}

.not-found-card {
  background: #ffffff;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  max-width: 440px;
  width: 100%;
}

.error-code {
  font-size: 5rem;
  line-height: 1;
  letter-spacing: -2px;
}

.max-w-sm {
  max-width: 320px;
}

.home-btn {
  padding: 10px 32px;
  font-weight: 600;
  font-size: 1rem;
}
</style>
