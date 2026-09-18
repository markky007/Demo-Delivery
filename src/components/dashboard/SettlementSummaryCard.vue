<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="receipt_long" color="primary" size="22px" />
          <span class="card-title">สรุปการชำระเงิน & รอบบิลวันนี้</span>
        </div>
        <div class="card-subtitle">ยอดเงินรับชำระแล้วเทียบกับยอดระหว่างรับประทาน</div>
      </div>
      <q-btn
        flat
        dense
        no-caps
        rounded
        color="primary"
        label="ดูรายการบิล →"
        to="/owner/sales"
        class="action-link-btn"
      />
    </div>

    <!-- Main Settlement Highlight Box -->
    <div class="settlement-highlight q-mb-md">
      <div class="row items-baseline justify-between q-mb-xs">
        <div>
          <div class="settlement-label">ยอดที่รับชำระแล้ว (Paid)</div>
          <div class="settlement-value font-mono text-positive">
            {{ formatPrice(paidSales) }}
          </div>
        </div>
        <div class="settlement-badge">
          <span class="dot-indicator"></span>
          ปิดบิลแล้ว {{ settlementPercent }}%
        </div>
      </div>

      <!-- Ratio Progress Bar: Paid vs Pending -->
      <div class="progress-track">
        <div
          class="progress-fill progress-fill--paid"
          :style="{ width: `${settlementPercent}%` }"
        ></div>
        <div
          class="progress-fill progress-fill--pending"
          :style="{ width: `${100 - settlementPercent}%` }"
        ></div>
      </div>
      <div class="row items-center justify-between text-caption text-muted q-mt-xs font-mono">
        <span>ปิดบิลสำเร็จ {{ paidBillsCount }} รายการ</span>
        <span>รอเช็คบิล {{ pendingBillsCount }} รายการ</span>
      </div>
    </div>

    <!-- Secondary Metrics 2 Columns -->
    <div class="row q-col-gutter-sm">
      <div class="col-12 col-sm-6">
        <div class="metric-box">
          <div class="metric-label">ยอดรอชำระ (Pending)</div>
          <div class="metric-value font-mono text-ink">
            {{ formatPrice(pendingSales) }}
          </div>
          <div class="metric-caption text-muted">กำลังรับประทาน / รอเก็บเงิน</div>
        </div>
      </div>

      <div class="col-12 col-sm-6">
        <div class="metric-box">
          <div class="metric-label">สัดส่วนบิลที่สำเร็จ</div>
          <div class="metric-value font-mono text-primary">
            {{ paidBillsCount }} <span class="metric-unit">/ {{ totalBillsCount }} บิล</span>
          </div>
          <div class="metric-caption text-muted">จากบิลทั้งหมดที่เปิดวันนี้</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatPrice } from 'src/utils/formatters';

const props = defineProps<{
  paidSales: number;
  pendingSales: number;
  paidBillsCount: number;
  totalBillsCount: number;
}>();

const pendingBillsCount = computed(() => {
  return Math.max(0, props.totalBillsCount - props.paidBillsCount);
});

const totalSalesEstimate = computed(() => {
  return props.paidSales + props.pendingSales;
});

const settlementPercent = computed(() => {
  if (totalSalesEstimate.value <= 0) return 100;
  return Math.min(100, Math.round((props.paidSales / totalSalesEstimate.value) * 100));
});
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

.settlement-highlight {
  background: #fafafc;
  border: 1px solid #f0f0f4;
  border-radius: 18px;
  padding: 16px;
}

.settlement-label {
  font-size: 0.8125rem;
  color: var(--colors-muted, #6e6e73);
  margin-bottom: 2px;
}

.settlement-value {
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1.15;
  color: #0071e3;
}

.settlement-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 980px;
  background: #e6f4ea;
  color: #137333;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #137333;
  display: inline-block;
}

.progress-track {
  height: 8px;
  background: #e8e8ed;
  border-radius: 980px;
  overflow: hidden;
  display: flex;
  margin: 12px 0 6px;
}

.progress-fill--paid {
  background: #137333;
  transition: width 0.4s ease;
}

.progress-fill--pending {
  background: #e8e8ed;
  transition: width 0.4s ease;
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
