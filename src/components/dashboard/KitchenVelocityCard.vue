<template>
  <div class="chart-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="timer" color="deep-purple-7" size="22px" />
        <span class="text-subtitle1 text-weight-bold">สถิติความเร็วการบริการเฉลี่ย</span>
      </div>
      <div class="text-caption text-grey-7">คำนวณจากออเดอร์วันนี้</div>
    </div>

    <!-- Metrics Row -->
    <div class="row q-col-gutter-sm">
      <!-- 1. Wait time before cooking -->
      <div class="col-12 col-sm-4">
        <div class="velocity-box velocity-box--wait">
          <div class="text-caption text-grey-7">เวลารอคิวเฉลี่ย</div>
          <div class="velocity-value text-amber-9 font-mono">
            {{ formatMinutes(avgWaitMins) }}
          </div>
          <div class="text-caption text-grey-6 text-xs">ตั้งแต่รับจนเริ่มปรุง</div>
        </div>
      </div>

      <!-- 2. Cooking duration -->
      <div class="col-12 col-sm-4">
        <div class="velocity-box velocity-box--cook">
          <div class="text-caption text-grey-7">เวลาปรุงอาหารเฉลี่ย</div>
          <div class="velocity-value text-light-blue-8 font-mono">
            {{ formatMinutes(avgCookMins) }}
          </div>
          <div class="text-caption text-grey-6 text-xs">ตั้งแต่เริ่มปรุงจนเสร็จ</div>
        </div>
      </div>

      <!-- 3. Total completion time -->
      <div class="col-12 col-sm-4">
        <div class="velocity-box velocity-box--total">
          <div class="text-caption text-grey-7">เวลารวมเฉลี่ยจนถึงเสิร์ฟ</div>
          <div class="velocity-value text-positive font-mono">
            {{ formatMinutes(avgTotalMins) }}
          </div>
          <div class="text-caption text-grey-6 text-xs">รับออเดอร์จนถึงโต๊ะ</div>
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
.chart-card {
  background: #ffffff;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  padding: 20px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.05));
}

.velocity-box {
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  text-align: center;
}

.velocity-box--wait {
  border-top: 3px solid #f59e0b;
}

.velocity-box--cook {
  border-top: 3px solid #0288d1;
}

.velocity-box--total {
  border-top: 3px solid #2e7d32;
}

.velocity-value {
  font-size: 1.45rem;
  font-weight: 700;
  margin: 4px 0 2px;
  line-height: 1.2;
}

.text-xs {
  font-size: 0.72rem;
}
</style>
