<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="table_restaurant" color="primary" size="22px" />
          <span class="card-title">สถานะโต๊ะสด & การหมุนเวียน</span>
        </div>
        <div class="card-subtitle">การใช้งานหน้าร้านและอัตราการหมุนเวียนโต๊ะวันนี้</div>
      </div>
      <q-btn
        flat
        dense
        no-caps
        rounded
        color="primary"
        label="จัดการโต๊ะ →"
        to="/owner/tables"
        class="action-link-btn"
      />
    </div>

    <!-- Main Occupancy Visual -->
    <div class="occupancy-highlight q-mb-md">
      <div class="row items-baseline justify-between q-mb-xs">
        <div class="row items-baseline q-gutter-xs">
          <span class="occupancy-number font-mono">{{ occupiedTables }}</span>
          <span class="occupancy-total font-mono">/ {{ totalTables }}</span>
          <span class="occupancy-unit">โต๊ะกำลังใช้งาน</span>
        </div>
        <div class="occupancy-badge" :class="occupancyBadgeClass">
          {{ occupancyPercent }}% ครองโต๊ะ
        </div>
      </div>

      <!-- Clean Apple Progress Track -->
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${occupancyPercent}%` }"></div>
      </div>
      <div class="row items-center justify-between text-caption text-muted q-mt-xs font-mono">
        <span>ใช้งานอยู่ {{ occupiedTables }} โต๊ะ</span>
        <span>ว่างพร้อมรับ {{ availableTables }} โต๊ะ</span>
      </div>
    </div>

    <!-- Secondary Metrics 2 Columns -->
    <div class="row q-col-gutter-sm">
      <div class="col-12 col-sm-6">
        <div class="metric-box">
          <div class="metric-label">เวลานั่งทานเฉลี่ย</div>
          <div class="metric-value font-mono text-ink">
            {{ formatMinutes(avgDwellMins) }}
          </div>
          <div class="metric-caption text-muted">ต่อรอบโต๊ะในวันนี้</div>
        </div>
      </div>

      <div class="col-12 col-sm-6">
        <div class="metric-box">
          <div class="metric-label">อัตราการหมุนเวียน</div>
          <div class="metric-value font-mono text-primary">
            {{ turnoverRate.toFixed(1) }} <span class="metric-unit">รอบ/โต๊ะ</span>
          </div>
          <div class="metric-caption text-muted">รอบการเปิดโต๊ะต่อวัน</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  occupiedTables: number;
  totalTables: number;
  avgDwellMins: number;
  turnoverRate: number;
}>();

const availableTables = computed(() => {
  return Math.max(0, props.totalTables - props.occupiedTables);
});

const occupancyPercent = computed(() => {
  if (props.totalTables <= 0) return 0;
  return Math.min(100, Math.round((props.occupiedTables / props.totalTables) * 100));
});

const occupancyBadgeClass = computed(() => {
  if (occupancyPercent.value >= 80) return 'occupancy-badge--high';
  if (occupancyPercent.value >= 40) return 'occupancy-badge--med';
  return 'occupancy-badge--normal';
});

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '—';
  if (mins < 1) return '< 1 นาที';
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  }
  return `${Math.round(mins)} นาที`;
}
</script>

<style scoped>
.apple-card {
  background: var(--colors-surface, #ffffff);
  border-radius: 28px;
  border: 1px solid var(--colors-hairline, #e8e8ed);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
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
  margin-top: 2px;
}

.action-link-btn {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0071e3;
  padding: 4px 12px;
}

.occupancy-highlight {
  background: #fafafc;
  border: 1px solid #f0f0f4;
  border-radius: 18px;
  padding: 16px;
}

.occupancy-number {
  font-size: 2rem;
  font-weight: 700;
  color: #0071e3;
  line-height: 1;
}

.occupancy-total {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--colors-muted, #6e6e73);
}

.occupancy-unit {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--colors-body, #414143);
  margin-left: 6px;
}

.occupancy-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 980px;
  letter-spacing: 0;
}

.occupancy-badge--normal {
  background: #e8f4fd;
  color: #0071e3;
}

.occupancy-badge--med {
  background: #fef3c7;
  color: #b45309;
}

.occupancy-badge--high {
  background: #fee2e2;
  color: #dc2626;
}

.progress-track {
  height: 8px;
  background: #e8e8ed;
  border-radius: 980px;
  overflow: hidden;
  margin: 10px 0 6px;
}

.progress-fill {
  height: 100%;
  background: #0071e3;
  border-radius: 980px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.metric-box {
  background: #fafafc;
  border: 1px solid #f0f0f4;
  border-radius: 18px;
  padding: 14px;
  text-align: left;
}

.metric-label {
  font-size: 0.8125rem;
  color: var(--colors-muted, #6e6e73);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
}

.metric-unit {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--colors-muted, #6e6e73);
}

.metric-caption {
  font-size: 0.75rem;
  margin-top: 4px;
}

.text-ink {
  color: var(--colors-ink, #1d1d1f);
}

.text-muted {
  color: var(--colors-muted, #6e6e73);
}
</style>
