<template>
  <q-page class="sales-page q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h6 class="q-my-none">Sales History</h6>
      <div class="row q-gutter-sm">
        <q-input
          v-model="dateFrom"
          outlined
          dense
          type="date"
          label="From"
          style="max-width: 160px"
        />
        <q-input v-model="dateTo" outlined dense type="date" label="To" style="max-width: 160px" />
        <q-btn unelevated no-caps color="primary" label="Filter" @click="loadSales" />
      </div>
    </div>

    <!-- Summary -->
    <div class="stats-row q-mb-lg">
      <q-card flat bordered class="stat-card" style="border-radius: 12px">
        <q-card-section>
          <div class="text-caption text-grey-6">Total Sales</div>
          <div class="text-h5 text-weight-bold">{{ formatPrice(totalSales) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="stat-card" style="border-radius: 12px">
        <q-card-section>
          <div class="text-caption text-grey-6">Total Orders</div>
          <div class="text-h5 text-weight-bold">{{ bills.length }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Bills table -->
    <q-table
      :rows="bills"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="isLoading"
      class="rounded-borders"
    >
      <template v-slot:body-cell-amount="props">
        <q-td :props="props">
          <span class="text-weight-bold">{{ formatPrice(props.value as number) }}</span>
        </q-td>
      </template>
      <template v-slot:body-cell-paid_at="props">
        <q-td :props="props">
          {{ props.value ? formatDateTime(props.value as string) : '—' }}
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { supabase } from 'src/services/supabase';
import { formatPrice, formatDateTime } from 'src/utils/formatters';
import type { QTableColumn } from 'quasar';

interface BillRow {
  id: string;
  table_session_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

const bills = ref<BillRow[]>([]);
const isLoading = ref(true);

const today = new Date().toISOString().slice(0, 10);
const dateFrom = ref(today);
const dateTo = ref(today);

const totalSales = computed(() => bills.value.reduce((sum, b) => sum + b.total_amount, 0));

const columns: QTableColumn[] = [
  {
    name: 'id',
    label: 'Bill ID',
    field: 'id',
    align: 'left',
    sortable: false,
    format: (val: string) => val.slice(0, 8) + '...',
  },
  { name: 'amount', label: 'Amount', field: 'total_amount', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'paid_at', label: 'Paid At', field: 'paid_at', align: 'left', sortable: true },
];

onMounted(() => loadSales());

async function loadSales() {
  isLoading.value = true;
  const fromDate = new Date(dateFrom.value || today);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(dateTo.value || today);
  toDate.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from('bills')
    .select('*')
    .eq('status', 'PAID')
    .gte('paid_at', fromDate.toISOString())
    .lte('paid_at', toDate.toISOString())
    .order('paid_at', { ascending: false });

  bills.value = (data ?? []) as BillRow[];
  isLoading.value = false;
}
</script>

<style scoped>
.sales-page {
  background: #f5f7fa;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
</style>
