<template>
  <q-page class="tables-page q-pa-md">
    <div class="tables-container">
      <!-- Actions bar -->
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">จัดการโต๊ะและ QR Code</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            สร้างและพิมพ์ QR Code สำหรับติดประจำโต๊ะอาหาร
          </p>
        </div>
        <q-btn
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="เพิ่มโต๊ะใหม่"
          @click="showCreateDialog = true"
          class="add-table-btn"
        />
      </div>

      <!-- Loading Skeleton -->
      <LoadingSkeleton v-if="isLoading" type="tables" :count="6" />

      <!-- Tables Grid -->
      <div v-else class="tables-grid">
        <div v-for="table in tables" :key="table.id" class="table-card">
          <!-- Table Card Header -->
          <div class="row items-center justify-between q-mb-md">
            <div class="row items-center">
              <div class="table-icon-wrap q-mr-sm">
                <q-icon name="table_restaurant" size="22px" color="primary" />
              </div>
              <span class="text-h6 text-weight-bold table-name">{{ table.name }}</span>
            </div>
            <StatusBadge
              :status="table.is_active ? 'ACTIVE' : 'INACTIVE'"
              mode="raw"
              :custom-label="table.is_active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'"
            />
          </div>

          <!-- Printable QR Stand Card -->
          <div v-if="table.active_qr" class="qr-stand-preview">
            <div class="qr-restaurant-label">สแกนสั่งอาหาร</div>
            <div class="qr-canvas-wrap q-my-sm">
              <canvas
                :ref="(el) => (qrCanvasRefs[table.id] = el as HTMLCanvasElement)"
                class="qr-canvas"
              ></canvas>
            </div>
            <div class="qr-scan-hint">{{ table.name }}</div>
            <div v-if="table.active_qr?.expires_at" class="q-mt-xs">
              <q-badge
                :color="formatRemainingExpiry(table.active_qr.expires_at).color"
                outline
                class="q-px-sm"
              >
                <q-icon name="schedule" size="12px" class="q-mr-xs" />
                <span>{{ formatRemainingExpiry(table.active_qr.expires_at).label }}</span>
              </q-badge>
            </div>

            <!-- Action buttons -->
            <div class="row justify-center q-gutter-xs q-mt-md">
              <q-btn
                dense
                flat
                no-caps
                icon="file_download"
                label="ดาวน์โหลด"
                size="sm"
                class="qr-tool-btn"
                @click="downloadQR(table)"
              />
              <q-btn
                dense
                flat
                no-caps
                icon="print"
                label="พิมพ์ QR"
                size="sm"
                class="qr-tool-btn"
                @click="printQR(table)"
              />
              <q-btn
                dense
                flat
                no-caps
                icon="refresh"
                label="สร้างใหม่"
                size="sm"
                color="warning"
                class="qr-tool-btn"
                @click="regenerateQR(table)"
              />
            </div>
          </div>

          <!-- No Active QR State -->
          <div v-else class="no-qr-state text-center q-pa-lg">
            <q-icon name="qr_code_2" size="44px" color="grey-4" class="q-mb-xs" />
            <div class="text-caption text-grey-6 q-mb-md">ยังไม่มี QR Code สำหรับโต๊ะนี้</div>
            <q-btn unelevated no-caps rounded color="primary" size="sm" @click="generateQR(table)">
              สร้าง QR Code
            </q-btn>
          </div>

          <q-separator class="q-my-md separator-subtle" />

          <!-- Card Bottom Actions -->
          <div class="row items-center justify-between">
            <q-btn
              flat
              no-caps
              dense
              size="sm"
              :color="table.is_active ? 'negative' : 'positive'"
              :icon="table.is_active ? 'block' : 'check_circle'"
              :label="table.is_active ? 'ปิดใช้งานโต๊ะ' : 'เปิดใช้งานโต๊ะ'"
              @click="toggleTableStatus(table)"
            />
          </div>
        </div>
      </div>

      <!-- Create Table Dialog -->
      <q-dialog v-model="showCreateDialog">
        <q-card style="min-width: 360px; max-width: 440px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">เพิ่มโต๊ะใหม่</div>
            <div class="text-caption text-grey-7">ระบุชื่อหรือหมายเลขโต๊ะสำหรับให้บริการ</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="newTableName"
              outlined
              label="ชื่อหรือหมายเลขโต๊ะ"
              placeholder="เช่น โต๊ะ 01, โต๊ะ A1"
              autofocus
            />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              label="สร้างโต๊ะ"
              no-caps
              rounded
              :disable="!newTableName.trim()"
              @click="handleCreateTable"
              :loading="isCreating"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import {
  fetchTables,
  createTable as createTableApi,
  updateTable,
  generateQRToken,
} from 'src/services/tableService';
import { supabase } from 'src/services/supabase';
import { getAppUrl } from 'src/utils/constants';
import { formatRemainingExpiry } from 'src/utils/formatters';
import QRCode from 'qrcode';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { TableWithQR } from 'src/types/database';

const { notifySuccess, notifyError } = useNotify();

const tables = ref<TableWithQR[]>([]);
const isLoading = ref(true);
const showCreateDialog = ref(false);
const newTableName = ref('');
const isCreating = ref(false);
const qrCanvasRefs = reactive<Record<string, HTMLCanvasElement | null>>({});

let restaurantId = '';

onMounted(async () => {
  try {
    const { data } = await supabase.from('restaurants').select('id').limit(1).single();
    if (data) restaurantId = data.id;
    await loadTables();
  } finally {
    isLoading.value = false;
  }
});

async function loadTables() {
  tables.value = await fetchTables();
  await nextTick();
  renderAllQRCodes();
}

function renderAllQRCodes() {
  const baseUrl = getAppUrl();
  for (const table of tables.value) {
    if (table.active_qr && qrCanvasRefs[table.id]) {
      const url = `${baseUrl}/t/${table.active_qr.public_token}`;
      void QRCode.toCanvas(qrCanvasRefs[table.id]!, url, { width: 150, margin: 2 });
    }
  }
}

watch(
  qrCanvasRefs,
  () => {
    renderAllQRCodes();
  },
  { deep: true },
);

async function handleCreateTable() {
  if (!newTableName.value.trim()) return;
  isCreating.value = true;
  try {
    await createTableApi(newTableName.value.trim(), restaurantId);
    newTableName.value = '';
    showCreateDialog.value = false;
    await loadTables();
    notifySuccess('สร้างโต๊ะใหม่เรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถสร้างโต๊ะได้');
  } finally {
    isCreating.value = false;
  }
}

async function generateQR(table: TableWithQR) {
  try {
    await generateQRToken(table.id);
    await loadTables();
    notifySuccess('สร้าง QR Code สำเร็จ');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'สร้าง QR ไม่สำเร็จ');
  }
}

async function regenerateQR(table: TableWithQR) {
  try {
    await generateQRToken(table.id);
    await loadTables();
    notifySuccess('สร้าง QR Code ใหม่แล้ว (QR เดิมถูกยกเลิก)');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'สร้าง QR ใหม่ไม่สำเร็จ');
  }
}

function downloadQR(table: TableWithQR) {
  const canvas = qrCanvasRefs[table.id];
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `QR-${table.name}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function printQR(table: TableWithQR) {
  const canvas = qrCanvasRefs[table.id];
  if (!canvas) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(
    `
    <html>
      <head>
        <title>พิมพ์ QR - ${table.name}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: 'Prompt', sans-serif;
            margin: 0;
            background: #fff;
          }
          .qr-box {
            border: 2px dashed #e05836;
            border-radius: 20px;
            padding: 32px;
            text-align: center;
            width: 320px;
          }
          h2 { margin: 0 0 8px 0; color: #2d231e; }
          p { margin: 0 0 16px 0; color: #7a6e65; font-size: 14px; }
          img { width: 220px; height: 220px; border-radius: 12px; }
          .hint { margin-top: 16px; font-weight: 600; color: #e05836; }
        </style>
      </head>
      <body>
        <div class="qr-box">
          <h2>${table.name}</h2>
          <p>สแกนเพื่อเลือกดูเมนูและสั่งอาหาร</p>
          <img src="${canvas.toDataURL('image/png')}" />
          <div class="hint">ยินดีต้อนรับครับ/ค่ะ</div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </` +
      `script>
      </body>
    </html>
  `,
  );
}

async function toggleTableStatus(table: TableWithQR) {
  try {
    await updateTable(table.id, { is_active: !table.is_active });
    await loadTables();
    notifySuccess(`อัปเดตสถานะโต๊ะ ${table.name} แล้ว`);
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะโต๊ะได้');
  }
}
</script>

<style scoped>
.tables-page {
  background: var(--color-background);
}

.tables-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.add-table-btn {
  padding: 8px 20px;
  font-weight: 600;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.table-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px;
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
}

.table-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-name {
  color: var(--color-text-primary);
}

/* Printable QR Stand Card */
.qr-stand-preview {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  border: 1px dashed var(--color-border);
}

.qr-restaurant-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
}

.qr-canvas-wrap {
  display: flex;
  justify-content: center;
}

.qr-canvas {
  border-radius: var(--radius-sm);
  background: #ffffff;
  padding: 4px;
}

.qr-scan-hint {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.qr-tool-btn {
  border-radius: var(--radius-pill);
  background: #ffffff;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
}

.no-qr-state {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-md);
}

.separator-subtle {
  background: var(--color-border-subtle);
}
</style>
