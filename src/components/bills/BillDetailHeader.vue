<template>
  <div class="bill-header row items-center justify-between q-mb-lg no-print">
    <!-- Left: Back Navigation & Table Title Info -->
    <div class="row items-center no-wrap">
      <q-btn
        flat
        round
        to="/owner/bills"
        icon="arrow_back"
        aria-label="กลับหน้ารายการบิล"
        class="back-nav-btn q-mr-md"
      >
        <q-tooltip anchor="top middle" self="bottom middle">กลับหน้ารายการบิล</q-tooltip>
      </q-btn>

      <div>
        <div class="row items-center no-wrap q-gutter-x-sm">
          <h1 class="table-title ellipsis q-ma-none">{{ tableName }}</h1>
          <!-- Apple Live / Closed Status Badge -->
          <div v-if="sessionStatus === 'ACTIVE'" class="apple-live-badge">
            <span class="live-dot"></span>
            <span>กำลังนั่งทาน</span>
          </div>
          <div v-else class="apple-closed-badge">
            <q-icon name="check" size="14px" class="q-mr-xs" />
            <span>ปิดโต๊ะแล้ว</span>
          </div>
        </div>

        <div class="bill-meta-caption q-mt-xs font-mono">
          บิล #{{ billId ? billId.slice(0, 8) : '—' }} • {{ totalItemsCount }} รายการ •
          {{ orderCount }} ออเดอร์
        </div>
      </div>
    </div>

    <!-- Right: Header Action Buttons (Apple Pill Style) -->
    <div class="row items-center q-gutter-sm header-actions">
      <q-btn
        v-if="canTransfer"
        unelevated
        no-caps
        icon="swap_horiz"
        label="ขอย้ายโต๊ะ"
        @click="$emit('transfer')"
        class="apple-pill-btn apple-pill-btn--secondary"
      />
      <q-btn
        unelevated
        no-caps
        icon="print"
        label="พิมพ์ใบเสร็จ"
        @click="$emit('print')"
        class="apple-pill-btn apple-pill-btn--secondary"
      />
      <q-btn
        unelevated
        no-caps
        icon="content_copy"
        label="คัดลอกสรุป"
        @click="$emit('copy')"
        class="apple-pill-btn apple-pill-btn--secondary gt-xs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tableName: string;
    sessionStatus?: string;
    billId?: string | null | undefined;
    totalItemsCount?: number;
    orderCount?: number;
    canTransfer?: boolean;
  }>(),
  {
    sessionStatus: 'ACTIVE',
    billId: null,
    totalItemsCount: 0,
    orderCount: 0,
    canTransfer: true,
  },
);

defineEmits<{
  (e: 'transfer'): void;
  (e: 'print'): void;
  (e: 'copy'): void;
}>();
</script>

<style scoped>
.bill-header {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.back-nav-btn {
  width: 40px;
  height: 40px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  color: var(--color-ink, #1d1d1f);
  transition: all 0.18s ease;
}

.back-nav-btn:hover {
  background: var(--color-surface-alt, #e8e8ed);
  border-color: #b0b0b8;
  transform: translateX(-2px);
}

.table-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-ink, #1d1d1f);
  letter-spacing: normal;
}

@media (max-width: 599px) {
  .table-title {
    font-size: 1.25rem;
  }
}

/* Apple Live Badge */
.apple-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(52, 199, 89, 0.12);
  color: #15803d;
  padding: 3px 10px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #34c759;
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.3);
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.75;
  }
}

.apple-closed-badge {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-muted, #6e6e73);
  padding: 3px 10px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 600;
}

.bill-meta-caption {
  font-size: 0.8125rem;
  color: var(--color-muted, #6e6e73);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

/* Apple Pill Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.8125rem;
  font-weight: 600;
  height: 36px;
  padding: 0 16px;
  transition: all 0.18s ease;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
  border: 1px solid transparent;
}

.apple-pill-btn--secondary:hover {
  background: #d8d8de !important;
  transform: translateY(-1px);
}
</style>
