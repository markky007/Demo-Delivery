<template>
  <q-page class="tables-page q-pa-md">
    <div class="tables-container">
      <!-- Actions bar -->
      <div class="row items-center justify-between q-mb-lg flex-wrap q-gutter-y-sm">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">จัดการโต๊ะและ QR Code</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            สร้างและพิมพ์ QR Code สำหรับติดประจำโต๊ะอาหาร (QR Code ถาวร ไม่เปลี่ยน)
          </p>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-btn
            outline
            color="primary"
            no-caps
            rounded
            icon="print"
            label="พิมพ์ QR ทุกโต๊ะ (A4 / PDF)"
            @click="printAllQRs"
            :loading="isBatchProcessing"
            :disable="tablesWithQR.length === 0"
            class="action-btn"
          >
            <q-tooltip>พิมพ์แผ่นรวม QR ทุกโต๊ะในขนาด A4 พร้อมเส้นประสำหรับตัดแปะ</q-tooltip>
          </q-btn>

          <q-btn
            outline
            color="secondary"
            no-caps
            rounded
            icon="file_download"
            label="ดาวน์โหลด QR ทั้งหมด (.ZIP)"
            @click="downloadAllQRs"
            :loading="isDownloadingZip"
            :disable="tablesWithQR.length === 0"
            class="action-btn"
          >
            <q-tooltip>ดาวน์โหลดรูปภาพ QR Code ของทุกโต๊ะรวมเป็นไฟล์ ZIP ในคลิกเดียว</q-tooltip>
          </q-btn>

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
            <div class="q-mt-xs">
              <q-badge color="positive" outline class="q-px-sm">
                <q-icon name="verified" size="12px" class="q-mr-xs" />
                <span>QR ถาวรประจำโต๊ะ</span>
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
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import JSZip from 'jszip';
import { useNotify } from 'src/composables/useNotify';
import {
  fetchTables,
  createTable as createTableApi,
  updateTable,
  generateQRToken,
} from 'src/services/tableService';
import { supabase } from 'src/services/supabase';
import { getAppUrl } from 'src/utils/constants';
import QRCode from 'qrcode';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { TableWithQR } from 'src/types/database';

const { notifySuccess, notifyError, notifyWarning } = useNotify();

const tables = ref<TableWithQR[]>([]);
const isLoading = ref(true);
const showCreateDialog = ref(false);
const newTableName = ref('');
const isCreating = ref(false);
const isBatchProcessing = ref(false);
const isDownloadingZip = ref(false);
const qrCanvasRefs = reactive<Record<string, HTMLCanvasElement | null>>({});

let restaurantId = '';
let restaurantName = 'DEMO Bang saen';

const tablesWithQR = computed(() => tables.value.filter((t) => !!t.active_qr));

onMounted(async () => {
  try {
    const { data } = await supabase.from('restaurants').select('id, name').limit(1).single();
    if (data) {
      restaurantId = data.id;
      if (data.name) restaurantName = data.name;
    }
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
    notifySuccess('สร้าง QR Code ใหม่แล้ว');
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

/**
 * Print all active table QR codes in an A4 sheet layout (2 columns x 3 rows grid)
 * with dashed cut lines and table names, ready for printing or saving as PDF.
 */
async function printAllQRs() {
  const activeTables = tablesWithQR.value;
  if (activeTables.length === 0) {
    notifyWarning('ไม่มีโต๊ะที่มี QR Code สำหรับพิมพ์');
    return;
  }

  isBatchProcessing.value = true;

  try {
    const baseUrl = getAppUrl();
    const tableCardsHtml: string[] = [];

    for (const table of activeTables) {
      const url = `${baseUrl}/t/${table.active_qr!.public_token}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 1,
        color: {
          dark: '#1e1b18',
          light: '#ffffff',
        },
      });

      tableCardsHtml.push(`
        <div class="cut-card">
          <div class="cut-guide-label">✂️ ตัดตามรอยประ</div>
          <div class="card-inner">
            <div class="card-header">
              <div class="restaurant-title">${restaurantName}</div>
              <div class="subtitle">สแกนเพื่อสั่งอาหาร</div>
            </div>
            <div class="qr-image-wrap">
              <img class="qr-img" src="${qrDataUrl}" alt="${table.name}" />
            </div>
            <div class="card-footer">
              <div class="table-badge">${table.name}</div>
              <div class="welcome-text">ยินดีต้อนรับ</div>
            </div>
          </div>
        </div>
      `);
    }

    const win = window.open('', '_blank');
    if (!win) {
      notifyError('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาตป๊อปอัปในเบราว์เซอร์');
      return;
    }

    win.document.write(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>พิมพ์ QR Code ทุกโต๊ะ (A4) - ${restaurantName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: 'Prompt', -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #2d231e;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .sheet-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8mm;
              width: 100%;
            }

            .cut-card {
              position: relative;
              border: 1.5px dashed #b0a49c;
              border-radius: 16px;
              padding: 10px;
              page-break-inside: avoid;
              break-inside: avoid;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 86mm;
            }

            .cut-guide-label {
              position: absolute;
              top: -8px;
              right: 14px;
              background: #ffffff;
              padding: 0 6px;
              font-size: 9px;
              color: #9c8e84;
              font-weight: 500;
            }

            .card-inner {
              width: 100%;
              border: 1px solid #f0e6dd;
              border-radius: 12px;
              padding: 12px 14px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              background: #fdfaf7;
            }

            .card-header {
              margin-bottom: 6px;
            }

            .restaurant-title {
              font-size: 15px;
              font-weight: 800;
              color: #e05836;
              letter-spacing: 0.2px;
            }

            .subtitle {
              font-size: 11px;
              color: #6e6259;
              font-weight: 500;
            }

            .qr-image-wrap {
              background: #ffffff;
              border-radius: 10px;
              padding: 6px;
              border: 1px solid #ede4db;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
              margin: 4px 0;
            }

            .qr-img {
              width: 150px;
              height: 150px;
              display: block;
            }

            .card-footer {
              margin-top: 6px;
              width: 100%;
            }

            .table-badge {
              display: inline-block;
              background: #e05836;
              color: #ffffff;
              font-size: 17px;
              font-weight: 800;
              padding: 4px 20px;
              border-radius: 20px;
              letter-spacing: 0.3px;
            }

            .welcome-text {
              font-size: 10px;
              color: #8c7f75;
              font-weight: 500;
              margin-top: 3px;
            }

            @media print {
              body {
                background: none;
              }
              .cut-card {
                border-color: #999999;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet-grid">
            ${tableCardsHtml.join('')}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </` +
        `script>
        </body>
      </html>
    `,
    );
    win.document.close();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างเอกสารพิมพ์');
  } finally {
    isBatchProcessing.value = false;
  }
}

/**
 * Download all active QR codes as a single ZIP file with individual high-resolution PNGs.
 */
async function downloadAllQRs() {
  const activeTables = tablesWithQR.value;
  if (activeTables.length === 0) {
    notifyWarning('ไม่มีโต๊ะที่มี QR Code สำหรับดาวน์โหลด');
    return;
  }

  isDownloadingZip.value = true;

  try {
    const zip = new JSZip();
    const baseUrl = getAppUrl();

    for (const table of activeTables) {
      const url = `${baseUrl}/t/${table.active_qr!.public_token}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 500,
        margin: 2,
        color: {
          dark: '#1e1b18',
          light: '#ffffff',
        },
      });

      // Extract base64 image data
      const parts = qrDataUrl.split(',');
      const base64Data = parts[1] ?? '';
      const sanitizedName = table.name.replace(/[/\\?%*:|"<>]/g, '_').trim();
      if (base64Data) {
        zip.file(`QR_${sanitizedName}.png`, base64Data, { base64: true });
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    downloadLink.download = `QR_Codes_All_Tables_${new Date().toISOString().slice(0, 10)}.zip`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);

    notifySuccess(`ดาวน์โหลด QR Code รวม ${activeTables.length} โต๊ะเรียบร้อยแล้ว`);
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถดาวน์โหลดไฟล์ ZIP ได้');
  } finally {
    isDownloadingZip.value = false;
  }
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

.action-btn {
  padding: 6px 16px;
  font-weight: 600;
  font-size: 0.88rem;
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
