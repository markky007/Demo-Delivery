<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="timer" color="primary" size="22px" />
        <span class="card-title">สถิติความเร็วการบริการเฉลี่ย</span>
      </div>
      <div class="card-subtitle">คำนวณจากออเดอร์วันนี้</div>
    </div>

    <!-- Metrics Row -->
    <div class="row q-col-gutter-sm">
      <!-- 1. Wait time before cooking -->
      <div class="col-12 col-sm-4">
        <div class="velocity-box">
          <div class="velocity-label text-muted">เวลารอคิวเฉลี่ย</div>
          <div class="velocity-value text-amber-9 font-mono">
            {{ formatMinutes(avgWaitMins) }}
          </div>
          <div class="velocity-caption text-muted">ตั้งแต่รับจนเริ่มปรุง</div>
        </div>
      </div>

      <!-- 2. Cooking duration -->
      <div class="col-12 col-sm-4">
        <div class="velocity-box">
          <div class="velocity-label text-muted">เวลาปรุงอาหารเฉลี่ย</div>
          <div class="velocity-value text-primary font-mono">
            {{ formatMinutes(avgCookMins) }}
          </div>
          <div class="velocity-caption text-muted">ตั้งแต่เริ่มปรุงจนเสร็จ</div>
        </div>
      </div>

      <!-- 3. Total completion time -->
      <div class="col-12 col-sm-4">
        <div class="velocity-box">
          <div class="velocity-label text-muted">เวลารวมเฉลี่ยถึงเสิร์ฟ</div>
          <div class="velocity-value text-positive font-mono">
            {{ formatMinutes(avgTotalMins) }}
          </div>
          <div class="velocity-caption text-muted">รับออเดอร์จนถึงโต๊ะ</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  avgWaitMins: number;
  avgCookMins: number;
  avgTotalMins: number;
}>();

function formatMinutes(val: number): string {
  if (!val || val <= 0) return '—';
  if (val < 1) return '< 1 นาที';
  if (val >= 60) {
    const hrs = Math.floor(val / 60);
    const mins = Math.round(val % 60);
    return mins > 0 ? `${hrs} ชม. ${mins} น.` : `${hrs} ชม.`;
  }
  return `${Math.round(val)} นาที`;
}
</script>

<style scoped>
.apple-card {
  background: var(--colors-surface, #ffffff);
  border-radius: 28px;
  border: 1px solid var(--colors-hairline, #e8e8ed);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--colors-ink, #1d1d1f);
  line-height: 1.3;
}

.card-subtitle {
  font-size: 0.8125rem;
  color: var(--colors-muted, #6e6e73);
}

.velocity-box {
  padding: 16px 12px;
  border-radius: 18px;
  background: #fafafc;
  border: 1px solid #f0f0f4;
  text-align: center;
}

.velocity-label {
  font-size: 0.8125rem;
}

.velocity-value {
  font-size: 1.45rem;
  font-weight: 700;
  margin: 6px 0 2px;
  line-height: 1.2;
}

.velocity-caption {
  font-size: 0.72rem;
}

.text-muted {
  color: #6e6e73;
}
</style>
