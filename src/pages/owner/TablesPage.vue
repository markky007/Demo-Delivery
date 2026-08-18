<template>
  <q-page class="tables-page q-pa-md">
    <!-- Actions bar -->
    <div class="row items-center justify-between q-mb-md">
      <h6 class="q-my-none">Tables</h6>
      <q-btn
        color="primary"
        unelevated
        no-caps
        icon="add"
        label="Add Table"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Tables grid -->
    <div v-else class="tables-grid">
      <q-card v-for="table in tables" :key="table.id" class="table-card" flat bordered>
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <span class="text-h6 text-weight-bold">{{ table.name }}</span>
            <q-badge
              :color="table.is_active ? 'positive' : 'grey-5'"
              :label="table.is_active ? 'Active' : 'Inactive'"
            />
          </div>

          <!-- QR section -->
          <div v-if="table.active_qr" class="qr-section q-mt-md text-center">
            <canvas
              :ref="(el) => (qrCanvasRefs[table.id] = el as HTMLCanvasElement)"
              class="qr-canvas"
            ></canvas>
            <div class="text-caption text-grey-6 q-mt-xs">{{ table.active_qr.public_token }}</div>
            <div class="row justify-center q-gutter-sm q-mt-sm">
              <q-btn
                dense
                flat
                no-caps
                icon="download"
                label="Download"
                size="sm"
                @click="downloadQR(table)"
              />
              <q-btn
                dense
                flat
                no-caps
                icon="print"
                label="Print"
                size="sm"
                @click="printQR(table)"
              />
              <q-btn
                dense
                flat
                no-caps
                icon="refresh"
                label="Regenerate"
                size="sm"
                color="warning"
                @click="regenerateQR(table)"
              />
            </div>
          </div>
          <div v-else class="text-center q-mt-md">
            <q-btn unelevated no-caps color="primary" size="sm" @click="generateQR(table)">
              Generate QR
            </q-btn>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat no-caps dense color="primary" icon="edit" @click="editTable(table)" />
          <q-btn
            flat
            no-caps
            dense
            :color="table.is_active ? 'negative' : 'positive'"
            :icon="table.is_active ? 'block' : 'check_circle'"
            @click="toggleTableStatus(table)"
          />
        </q-card-actions>
      </q-card>
    </div>

    <!-- Create table dialog -->
    <q-dialog v-model="showCreateDialog">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Add New Table</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="newTableName"
            outlined
            label="Table Name"
            placeholder="e.g. Table 01"
            autofocus
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Create"
            :disable="!newTableName.trim()"
            @click="handleCreateTable"
            :loading="isCreating"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
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
import { APP_URL } from 'src/utils/constants';
import QRCode from 'qrcode';
import type { TableWithQR } from 'src/types/database';

const { notifySuccess, notifyError } = useNotify();

const tables = ref<TableWithQR[]>([]);
const isLoading = ref(true);
const showCreateDialog = ref(false);
const newTableName = ref('');
const isCreating = ref(false);
const qrCanvasRefs = reactive<Record<string, HTMLCanvasElement | null>>({});

// Fetch restaurant ID (first restaurant)
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
  for (const table of tables.value) {
    if (table.active_qr && qrCanvasRefs[table.id]) {
      const url = `${APP_URL}/t/${table.active_qr.public_token}`;
      void QRCode.toCanvas(qrCanvasRefs[table.id]!, url, { width: 160, margin: 2 });
    }
  }
}

// Re-render QR codes when refs become available
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
    notifySuccess('Table created');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to create table');
  } finally {
    isCreating.value = false;
  }
}

async function generateQR(table: TableWithQR) {
  try {
    await generateQRToken(table.id);
    await loadTables();
    notifySuccess('QR code generated');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to generate QR');
  }
}

async function regenerateQR(table: TableWithQR) {
  try {
    await generateQRToken(table.id);
    await loadTables();
    notifySuccess('QR code regenerated — old QR is now invalid');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to regenerate QR');
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
  win.document.write(`
    <html><head><title>QR - ${table.name}</title>
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
    h2{margin-bottom:16px;}img{width:300px;height:300px;}</style></head>
    <body><h2>${table.name}</h2><img src="${canvas.toDataURL('image/png')}" />
    <script>window.print();window.close();</` + `script></body></html>
  `);
}

function editTable(table: TableWithQR) {
  // TODO: Edit dialog
  void table;
}

async function toggleTableStatus(table: TableWithQR) {
  try {
    await updateTable(table.id, { is_active: !table.is_active });
    await loadTables();
    notifySuccess(`Table ${table.is_active ? 'deactivated' : 'activated'}`);
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to update table');
  }
}
</script>

<style scoped>
.tables-page {
  background: #f5f7fa;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.table-card {
  border-radius: 12px;
}

.qr-canvas {
  border-radius: 8px;
}

.qr-section {
  padding: 12px;
  background: #fafbfc;
  border-radius: 10px;
}
</style>
