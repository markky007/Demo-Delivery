<template>
  <q-page class="bills-page q-pa-md">
    <div class="bills-container">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">บิลและโต๊ะที่เปิดอยู่</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            รายการโต๊ะที่กำลังรับประทานอาหารและรอเช็กบิล
          </p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="q-pa-xl column items-center">
        <LoadingSkeleton type="list" :count="3" />
      </div>

      <!-- Active Sessions Grid -->
      <div v-else class="sessions-grid">
        <div
          v-for="session in activeSessions"
          :key="session.id"
          class="session-card cursor-pointer"
          @click="openBill(session.id)"
        >
          <div class="row items-center justify-between q-mb-sm">
            <div class="row items-center">
              <div class="table-avatar q-mr-sm">
                <q-icon name="table_restaurant" size="20px" color="primary" />
              </div>
              <span class="text-weight-bold text-h6 table-name">
                {{ session.table?.name || 'โต๊ะ' }}
              </span>
            </div>
            <StatusBadge
              :status="session.status"
              mode="raw"
              :custom-label="session.status === 'ACTIVE' ? 'กำลังนั่งทาน' : 'ปิดโต๊ะแล้ว'"
            />
          </div>

          <div class="session-info-row q-mt-md">
            <div class="row items-center text-caption text-grey-7">
              <q-icon name="schedule" size="14px" class="q-mr-xs" />
              <span>เริ่มสั่งเมื่อ {{ formatTime(session.created_at) }}</span>
            </div>
            <div class="row items-center text-caption text-grey-7 q-mt-xs">
              <q-icon name="receipt" size="14px" class="q-mr-xs" />
              <span>สั่งทั้งหมด {{ session.orders?.length || 0 }} ออเดอร์</span>
            </div>
          </div>

          <div class="row items-center justify-between q-mt-md text-primary text-weight-bold">
            <span class="text-caption">ดูรายละเอียดบิล</span>
            <q-icon name="arrow_forward" size="16px" />
          </div>
        </div>

        <div v-if="activeSessions.length === 0" class="col-12">
          <EmptyState
            icon="table_restaurant"
            title="ยังไม่มีโต๊ะที่กำลังรับประทานอาหาร"
            description="เมื่อลูกค้าสแกน QR Code สั่งอาหาร โต๊ะจะแสดงที่นี่เพื่อรอคิดเงิน"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from 'src/services/supabase';
import { formatTime } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import EmptyState from 'src/components/EmptyState.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';

const router = useRouter();

interface SessionRow {
  id: string;
  table_id: string;
  status: string;
  created_at: string;
  table: { name: string } | null;
  orders: { id: string }[];
}

const activeSessions = ref<SessionRow[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  const { data } = await supabase
    .from('table_sessions')
    .select('id, table_id, status, created_at, table:tables(name), orders(id)')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  activeSessions.value = (data ?? []) as unknown as SessionRow[];
  isLoading.value = false;
});

function openBill(sessionId: string) {
  void router.push(`/owner/bills/${sessionId}`);
}
</script>

<style scoped>
.bills-page {
  background: var(--color-background);
}

.bills-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.session-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px;
  box-shadow: var(--shadow-subtle);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.table-avatar {
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

.session-info-row {
  background: var(--color-surface-subtle);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}
</style>
