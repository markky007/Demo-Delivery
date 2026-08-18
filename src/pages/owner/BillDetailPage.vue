<template>
  <q-page class="bill-detail-page q-pa-md">
    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else-if="session">
      <!-- Session info -->
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section>
          <div class="row items-center justify-between">
            <div>
              <div class="text-h6 text-weight-bold">{{ tableName }}</div>
              <div class="text-caption text-grey-6">
                Session since {{ formatDateTime(session.created_at) }}
              </div>
            </div>
            <q-badge
              :color="session.status === 'ACTIVE' ? 'positive' : 'grey'"
              :label="session.status"
              size="md"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Orders list -->
      <h6 class="q-mb-sm q-mt-none text-weight-bold">Orders</h6>
      <q-card
        v-for="order in orders"
        :key="order.id"
        flat
        bordered
        class="q-mb-sm"
        style="border-radius: 12px"
      >
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <span class="text-weight-bold">{{ formatQueueNumber(order.queue_number) }}</span>
            <q-badge :color="STATUS_COLORS[order.status]" :label="order.status" />
          </div>
          <div v-for="item in order.items" :key="item.id" class="text-body2">
            {{ item.snapshot_name }} x{{ item.quantity }} — {{ formatPrice(item.subtotal) }}
          </div>
          <div class="text-right text-weight-bold q-mt-xs">
            {{ formatPrice(order.total_amount) }}
          </div>
        </q-card-section>
      </q-card>

      <!-- Bill total -->
      <q-separator class="q-my-md" />
      <div class="row justify-between items-center q-mb-lg">
        <span class="text-h5 text-weight-medium">Total</span>
        <span class="text-h5 text-weight-bold text-primary">{{ formatPrice(billTotal) }}</span>
      </div>

      <!-- Actions -->
      <div v-if="session.status === 'ACTIVE'" class="column q-gutter-sm">
        <q-btn
          v-if="!bill || bill.status !== 'PAID'"
          color="positive"
          unelevated
          no-caps
          size="lg"
          class="full-width"
          style="border-radius: 12px"
          :disable="!allServed"
          @click="handleMarkPaid"
          :loading="isProcessing"
        >
          <q-icon name="payments" class="q-mr-sm" />
          Mark Bill as Paid
        </q-btn>
        <q-banner v-if="!allServed" class="bg-warning text-dark q-mb-sm" rounded dense>
          All orders must be SERVED before marking bill as paid.
        </q-banner>

        <q-btn
          v-if="bill?.status === 'PAID'"
          color="blue-grey"
          unelevated
          no-caps
          size="lg"
          class="full-width"
          style="border-radius: 12px"
          @click="handleCloseSession"
          :loading="isProcessing"
        >
          <q-icon name="check_circle" class="q-mr-sm" />
          Close Session
        </q-btn>
      </div>

      <q-banner v-if="session.status === 'CLOSED'" class="bg-grey-3 q-mt-md" rounded>
        This session has been closed.
      </q-banner>
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
import { STATUS_COLORS } from 'src/utils/constants';
import { OrderStatus } from 'src/types/enums';
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
    tableName.value =
      (sessionData as unknown as { table: { name: string } }).table?.name ?? 'Table';
  }
  orders.value = (ordersData ?? []) as OrderWithItems[];

  // Get or create bill
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
    notifySuccess('Bill marked as paid');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to mark bill paid');
  } finally {
    isProcessing.value = false;
  }
}

async function handleCloseSession() {
  if (!session.value) return;
  isProcessing.value = true;
  try {
    await closeTableSession(session.value.id);
    notifySuccess('Session closed');
    void router.push('/owner/bills');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to close session');
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style scoped>
.bill-detail-page {
  background: #f5f7fa;
}
</style>
