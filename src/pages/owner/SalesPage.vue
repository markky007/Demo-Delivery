<template>
  <q-page class="sales-page q-pa-md">
    <div class="sales-container">
      <!-- Header Bar & Date Filters -->
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">ประวัติยอดขาย</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            ตรวจสอบยอดขายย้อนหลังและรายการบิลที่ชำระเงินแล้ว
          </p>
        </div>

        <div class="row items-center q-gutter-sm date-filter-row">
          <q-input
            v-model="dateFrom"
            outlined
            dense
            type="date"
            label="ตั้งแต่วันที่"
            class="date-input"
          />
          <q-input
            v-model="dateTo"
            outlined
            dense
            type="date"
            label="ถึงวันที่"
            class="date-input"
          />
          <q-btn
            unelevated
            no-caps
            rounded
            color="primary"
            icon="filter_alt"
            label="กรองข้อมูล"
            @click="loadSales"
            class="q-px-md"
          />
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="isLoading">
        <div class="stats-row q-mb-lg">
          <div v-for="i in 2" :key="i" class="stat-box row items-center">
            <q-skeleton
              type="rect"
              width="52px"
              height="52px"
              class="rounded-borders"
              animation="wave"
            />
            <div class="col q-ml-md">
              <q-skeleton type="text" width="60%" height="14px" class="q-mb-xs" animation="wave" />
              <q-skeleton type="text" width="80%" height="26px" animation="wave" />
            </div>
          </div>
        </div>
        <LoadingSkeleton type="table" :count="5" />
      </div>

      <template v-else>
        <!-- Stats Summary -->
        <div class="stats-row q-mb-lg">
          <div class="stat-box">
            <div class="stat-icon-wrap stat-icon-wrap--primary">
              <q-icon name="payments" size="24px" color="primary" />
            </div>
            <div>
              <div class="text-caption text-grey-7">ยอดขายรวมในช่วงเวลานี้</div>
              <div class="text-h5 text-weight-bold text-primary">{{ formatPrice(totalSales) }}</div>
            </div>
          </div>

          <div class="stat-box">
            <div class="stat-icon-wrap stat-icon-wrap--green">
              <q-icon name="receipt_long" size="24px" color="green-8" />
            </div>
            <div>
              <div class="text-caption text-grey-7">จำนวนบิลที่ชำระสำเร็จ</div>
              <div class="text-h5 text-weight-bold">
                {{ bills.length }} <span class="text-caption text-grey-6">บิล</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bills Table -->
        <q-table
          :rows="bills"
          :columns="columns"
          row-key="id"
          flat
          bordered
          class="sales-table"
          no-data-label="ไม่พบประวัติยอดขายในช่วงเวลานี้"
          :rows-per-page-options="[10, 20, 50]"
        >
          <template v-slot:body-cell-id="props">
            <q-td :props="props">
              <span class="text-weight-mono text-grey-8">{{ props.value }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props">
              <span class="text-weight-bold text-primary">{{
                formatPrice(props.value as number)
              }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <StatusBadge status="SERVED" mode="raw" custom-label="ชำระเงินแล้ว" />
            </q-td>
          </template>
          <template v-slot:body-cell-paid_at="props">
            <q-td :props="props">
              {{ props.value ? formatDateTime(props.value as string) : '—' }}
            </q-td>
          </template>
        </q-table>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { supabase } from 'src/services/supabase';
import { formatPrice, formatDateTime } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
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
    label: 'รหัสบิล',
    field: 'id',
    align: 'left',
    sortable: false,
    format: (val: string) => `#${val.slice(0, 8)}`,
  },
  { name: 'amount', label: 'ยอดเงินรวม', field: 'total_amount', align: 'right', sortable: true },
  { name: 'status', label: 'สถานะ', field: 'status', align: 'center' },
  { name: 'paid_at', label: 'วันและเวลาที่ชำระ', field: 'paid_at', align: 'left', sortable: true },
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
  background: var(--color-background);
}

.sales-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.date-input {
  max-width: 150px;
  background: #ffffff;
  border-radius: var(--radius-sm);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.stat-box {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-subtle);
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap--primary {
  background: var(--color-primary-soft);
}

.stat-icon-wrap--green {
  background: #dcfce7;
}

.sales-table {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
</style>
