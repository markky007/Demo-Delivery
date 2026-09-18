<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="apple-qr-card text-center q-pa-md">
      <!-- Header -->
      <q-card-section class="q-pb-none">
        <div class="row items-center justify-between no-wrap">
          <span class="qr-table-title text-ink">{{ table?.name }}</span>
          <q-btn icon="close" flat round dense v-close-popup class="text-muted" />
        </div>
        <div class="text-caption text-muted q-mt-xs">
          สแกน QR เพื่อเปิดเมนูและสั่งอาหารประจำโต๊ะนี้
        </div>
      </q-card-section>

      <!-- QR Canvas Box -->
      <q-card-section class="column items-center q-py-md">
        <div class="qr-canvas-wrapper">
          <canvas ref="canvasRef" class="qr-canvas"></canvas>
        </div>
        <div class="table-url-text text-caption font-tabular ellipsis q-mt-sm">
          {{ tableUrl }}
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="center" class="q-gutter-xs">
        <q-btn
          unelevated
          no-caps
          class="apple-pill-btn apple-pill-btn--secondary"
          icon="content_copy"
          label="คัดลอกลิงก์"
          @click="$emit('copy-link')"
        />
        <q-btn
          unelevated
          no-caps
          class="apple-pill-btn apple-pill-btn--primary"
          icon="open_in_new"
          label="เปิดหน้าลูกค้า"
          @click="$emit('open-link')"
        />
        <q-btn
          flat
          no-caps
          class="apple-pill-btn apple-pill-btn--warning"
          icon="refresh"
          label="สร้าง QR ใหม่"
          @click="$emit('regenerate-qr')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import QRCode from 'qrcode';
import type { TableWithQR } from 'src/types/database';

const props = defineProps<{
  modelValue: boolean;
  table: TableWithQR | null;
  tableUrl: string;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'copy-link'): void;
  (e: 'open-link'): void;
  (e: 'regenerate-qr'): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

watch(
  () => [props.modelValue, props.tableUrl],
  async ([open, url]) => {
    if (open && url) {
      await nextTick();
      if (canvasRef.value) {
        void QRCode.toCanvas(canvasRef.value, String(url), {
          width: 200,
          margin: 2,
          color: {
            dark: '#1D1D1F',
            light: '#FFFFFF',
          },
        });
      }
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.apple-qr-card {
  width: 100%;
  max-width: 380px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
}

.qr-table-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.qr-canvas-wrapper {
  background: #ffffff;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid var(--color-hairline, #d2d2d7);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  display: inline-flex;
}

.qr-canvas {
  width: 200px;
  height: 200px;
  display: block;
}

.table-url-text {
  color: var(--color-muted, #6e6e73);
  max-width: 260px;
}

.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.8125rem;
  font-weight: 600;
  height: 36px;
  padding: 0 14px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:hover {
  background: #0066cc !important;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
}

.apple-pill-btn--secondary:hover {
  background: #dedee3 !important;
}

.apple-pill-btn--warning {
  color: #d97706 !important;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
