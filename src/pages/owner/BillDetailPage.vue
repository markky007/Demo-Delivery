<template>
  <q-page class="bill-detail-page q-pa-md">
    <div v-if="isLoading" class="q-pa-xl column items-center">
      <LoadingSkeleton type="list" :count="2" />
    </div>

    <template v-else-if="session">
      <div class="bill-detail-container">
        <!-- Session Info Card -->
        <div class="session-info-card q-mb-md">
          <div class="row items-center justify-between">
            <div>
              <div class="row items-center">
                <q-icon name="table_restaurant" size="22px" color="primary" class="q-mr-xs" />
                <span class="text-h6 text-weight-bold table-title">{{ tableName }}</span>
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">
                เปิดโต๊ะเมื่อ {{ formatDateTime(session.created_at) }}
              </div>
            </div>
            <StatusBadge
              :status="session.status"
              mode="raw"
              :custom-label="session.status === 'ACTIVE' ? 'กำลังนั่งทาน' : 'ปิดโต๊ะแล้ว'"
            />
          </div>
        </div>

        <!-- Orders Breakdown List -->
        <div class="section-title q-mb-xs text-weight-bold text-subtitle1">
          รายการออเดอร์ในโต๊ะนี้ ({{ orders.length }} ออเดอร์)
        </div>

        <div class="orders-list q-gutter-y-sm q-mb-lg">
          <div v-for="order in orders" :key="order.id" class="order-bill-card">
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-weight-bold order-seq">{{
                formatQueueNumber(order.queue_number)
              }}</span>
              <StatusBadge :status="order.status" mode="customer" />
            </div>

            <div class="dishes-list q-my-xs">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="row justify-between text-body2 q-py-xs"
              >
                <div>
                  <span class="text-weight-medium">{{ item.snapshot_name }}</span>
                  <span class="text-grey-7 q-ml-xs">x{{ item.quantity }}</span>
                </div>
                <span class="text-weight-bold">{{ formatPrice(item.subtotal) }}</span>
              </div>
            </div>

            <div class="row justify-end q-mt-xs text-caption text-grey-7">
              <span
                >รวมออเดอร์นี้:
                <strong class="text-dark">{{ formatPrice(order.total_amount) }}</strong></span
              >
            </div>
          </div>
        </div>

        <!-- Bill Total Card -->
        <div class="total-summary-card q-mb-lg">
          <div class="row justify-between items-center q-mb-xs">
            <span class="text-grey-7">สถานะการชำระเงิน</span>
            <q-badge
              :color="bill?.status === 'PAID' ? 'positive' : 'warning'"
              :label="bill?.status === 'PAID' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'"
              rounded
              class="q-px-sm"
            />
          </div>
          <q-separator class="q-my-sm" />
          <div class="row justify-between items-center">
            <span class="text-h6 text-weight-bold">ยอดรวมทั้งสิ้น</span>
            <span class="text-h5 text-weight-bold text-primary">{{ formatPrice(billTotal) }}</span>
          </div>
        </div>

        <!-- Action Controls -->
        <div v-if="session.status === 'ACTIVE'" class="column q-gutter-y-sm">
          <!-- Cannot pay if not all served -->
          <div v-if="!allServed" class="not-served-warning q-pa-md q-mb-xs">
            <div class="row items-center">
              <q-icon name="warning" size="20px" class="q-mr-xs text-amber-9" />
              <span class="text-weight-bold text-amber-10">ยังมีอาหารที่ยังไม่ได้เสิร์ฟ</span>
            </div>
            <p class="q-mb-none text-caption text-grey-8 q-mt-xs">
              ต้องเสิร์ฟอาหารให้ครบทุกรายการก่อน จึงจะสามารถรับชำระเงินและปิดโต๊ะได้
            </p>
          </div>

          <q-btn
            v-if="!bill || bill.status !== 'PAID'"
            color="primary"
            unelevated
            no-caps
            size="lg"
            class="full-width action-button"
            :disable="!allServed"
            @click="handleMarkPaid"
            :loading="isProcessing"
          >
            <q-icon name="payments" class="q-mr-sm" />
            <span>รับชำระเงินเรียบร้อย ({{ formatPrice(billTotal) }})</span>
          </q-btn>

          <q-btn
            v-if="bill?.status === 'PAID'"
            color="grey-8"
            unelevated
            no-caps
            size="lg"
            class="full-width action-button"
            @click="handleCloseSession"
            :loading="isProcessing"
          >
            <q-icon name="check_circle" class="q-mr-sm" />
            <span>ปิดโต๊ะ / จบบิลนี้</span>
          </q-btn>
        </div>

        <div v-if="session.status === 'CLOSED'" class="closed-banner q-pa-md text-center">
          <q-icon name="task_alt" size="32px" color="positive" class="q-mb-xs" />
          <div class="text-weight-bold">โต๊ะนี้ปิดบิลเรียบร้อยแล้ว</div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { getOrCreateBill, markBillPaid } from 'src/services/billService';
import { closeTableSession } from 'src/services/sessionService';
import { formatPrice, formatDateTime, formatQueueNumber } from 'src/utils/formatters';
import { OrderStatus } from 'src/types/enums';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { TableSession, Bill, OrderWithItems } from 'src/types/database';

const route = useRoute();
const router = useRouter();
const { notifySuccess, notifyError } = useNotify();

const session = ref<TableSession | null>(null);
const orders = ref<OrderWithItems[]>([]);
const bill = ref<Bill | null>(null);
const tableName = ref('');
const isLoading = ref(true);
const isProcessing = ref(false);

const billTotal = computed(() => orders.value.reduce((sum, o) => sum + o.total_amount, 0));

const allServed = computed(
  () => orders.value.length > 0 && orders.value.every((o) => o.status === OrderStatus.SERVED),
);

onMounted(async () => {
  const sessionId = route.params.sessionId as string;

  const [{ data: sessionData }, { data: ordersData }] = await Promise.all([
    supabase.from('table_sessions').select('*, table:tables(name)').eq('id', sessionId).single(),
    supabase
      .from('orders')
      .select('*, items:order_items(*, options:order_item_options(*))')
      .eq('table_session_id', sessionId)
      .order('queue_number'),
  ]);

  if (sessionData) {
    session.value = sessionData;
    tableName.value = (sessionData as unknown as { table: { name: string } }).table?.name ?? 'โต๊ะ';
  }
  orders.value = (ordersData ?? []) as OrderWithItems[];

  if (session.value) {
    bill.value = await getOrCreateBill(session.value.id);
  }

  isLoading.value = false;
});

async function handleMarkPaid() {
  if (!bill.value) return;
  isProcessing.value = true;
  try {
    bill.value = await markBillPaid(bill.value.id);
    notifySuccess('บันทึกการรับชำระเงินเรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการชำระเงินได้');
  } finally {
    isProcessing.value = false;
  }
}

async function handleCloseSession() {
  if (!session.value) return;
  isProcessing.value = true;
  try {
    await closeTableSession(session.value.id);
    notifySuccess('ปิดโต๊ะเรียบร้อยแล้ว โต๊ะพร้อมรับลูกค้าท่านถัดไป');
    void router.push('/owner/bills');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปิดโต๊ะได้');
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style scoped>
.bill-detail-page {
  background: var(--color-background);
}

.bill-detail-container {
  max-width: 650px;
  margin: 0 auto;
}

.session-info-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
}

.table-title {
  color: var(--color-text-primary);
}

.order-bill-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px 16px;
  box-shadow: var(--shadow-subtle);
}

.order-seq {
  font-size: 1.05rem;
  color: var(--color-text-primary);
}

.dishes-list {
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}

.total-summary-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px;
  box-shadow: var(--shadow-subtle);
}

.not-served-warning {
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
}

.action-button {
  border-radius: var(--radius-md);
  height: 52px;
  font-weight: 600;
  box-shadow: var(--shadow-md);
}

.closed-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  color: #166534;
}
</style>
