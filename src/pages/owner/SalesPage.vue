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
          <template v-slot:body-cell-table_name="props">
            <q-td :props="props">
              <q-badge color="grey-2" text-color="dark" class="q-px-sm text-weight-medium">
                <q-icon name="table_restaurant" size="14px" class="q-mr-xs text-primary" />
                {{ props.value }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props">
              <span class="text-weight-bold text-primary font-mono">{{
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
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                rounded
                no-caps
                size="sm"
                color="primary"
                icon="receipt_long"
                label="ดูใบเสร็จ"
                @click="openReceiptDialog(props.row.id)"
                class="q-px-sm"
              />
            </q-td>
          </template>
        </q-table>
      </template>

      <!-- Receipt Modal Dialog -->
      <q-dialog v-model="showReceiptModal" transition-show="scale" transition-hide="scale">
        <q-card style="width: 480px; max-width: 95vw; border-radius: 12px" class="q-pa-sm">
          <q-card-section class="row items-center justify-between q-pb-none no-print">
            <div class="text-h6 text-weight-bold">ใบเสร็จรับเงิน</div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section>
            <div v-if="isReceiptLoading" class="q-py-xl text-center">
              <q-spinner color="primary" size="40px" />
              <div class="text-caption text-grey-7 q-mt-sm">กำลังโหลดข้อมูลใบเสร็จ...</div>
            </div>

            <ReceiptSlip
              v-else-if="selectedReceiptData"
              :bill="selectedReceiptData.bill"
              :table-name="selectedReceiptData.tableName"
              :orders="selectedReceiptData.orders"
              :show-actions="true"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { supabase } from 'src/services/supabase';
import { fetchBillWithDetails } from 'src/services/billService';
import { formatPrice, formatDateTime } from 'src/utils/formatters';
import { useNotify } from 'src/composables/useNotify';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import ReceiptSlip from 'src/components/ReceiptSlip.vue';
import type { QTableColumn } from 'quasar';
import type { Bill, OrderWithItems } from 'src/types/database';

interface BillRow {
  id: string;
  table_session_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  table_name?: string;
}

const { notifyError } = useNotify();

const bills = ref<BillRow[]>([]);
const isLoading = ref(true);

const today = new Date().toISOString().slice(0, 10);
const dateFrom = ref(today);
const dateTo = ref(today);

const showReceiptModal = ref(false);
const isReceiptLoading = ref(false);
const selectedReceiptData = ref<{
  bill: Bill;
  tableName: string;
  orders: OrderWithItems[];
} | null>(null);

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
  {
    name: 'table_name',
    label: 'โต๊ะ',
    field: 'table_name',
    align: 'left',
    sortable: true,
  },
  { name: 'amount', label: 'ยอดเงินรวม', field: 'total_amount', align: 'right', sortable: true },
  { name: 'status', label: 'สถานะ', field: 'status', align: 'center' },
  { name: 'paid_at', label: 'วันและเวลาที่ชำระ', field: 'paid_at', align: 'left', sortable: true },
  { name: 'actions', label: 'จัดการ', field: 'actions', align: 'center' },
];

onMounted(() => loadSales());

async function loadSales() {
  isLoading.value = true;
  const fromDate = new Date(dateFrom.value || today);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(dateTo.value || today);
  toDate.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('bills')
    .select(
      `
      *,
      table_session:table_sessions (
        customer_name,
        table:tables(name)
      )
    `,
    )
    .eq('status', 'PAID')
    .gte('paid_at', fromDate.toISOString())
    .lte('paid_at', toDate.toISOString())
    .order('paid_at', { ascending: false });

  if (error) {
    notifyError('ไม่สามารถโหลดประวัติยอดขายได้');
    isLoading.value = false;
    return;
  }

  interface SupabaseBillWithTable extends BillRow {
    table_session?: {
      customer_name?: string | null;
      table?: {
        name?: string;
      } | null;
    } | null;
  }

  bills.value = ((data ?? []) as unknown as SupabaseBillWithTable[]).map((b) => {
    const rawTableName = b.table_session?.table?.name ?? 'โต๊ะ';
    const custName = b.table_session?.customer_name;
    let displayName = rawTableName;
    if (
      custName &&
      (rawTableName.includes('กลับบ้าน') || rawTableName.toLowerCase().includes('takeaway'))
    ) {
      displayName = `สั่งกลับบ้าน (${custName})`;
    } else if (custName) {
      displayName = `${rawTableName} (${custName})`;
    }
    return {
      ...b,
      table_name: displayName,
    };
  });

  isLoading.value = false;
}

async function openReceiptDialog(billId: string) {
  showReceiptModal.value = true;
  isReceiptLoading.value = true;
  selectedReceiptData.value = null;

  try {
    const data = await fetchBillWithDetails(billId);
    if (data) {
      selectedReceiptData.value = data;
    } else {
      notifyError('ไม่พบข้อมูลใบเสร็จนี้');
      showReceiptModal.value = false;
    }
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถโหลดใบเสร็จได้');
    showReceiptModal.value = false;
  } finally {
    isReceiptLoading.value = false;
  }
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
  box-shadow: var(--shadow-subtle);
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
