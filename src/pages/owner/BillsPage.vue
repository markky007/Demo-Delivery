<template>
  <q-page class="bills-page q-pa-md">
    <h6 class="q-mb-md q-mt-none">Active Sessions</h6>

    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <div v-else class="sessions-grid">
      <q-card
        v-for="session in activeSessions"
        :key="session.id"
        flat
        bordered
        class="session-card cursor-pointer"
        @click="openBill(session.id)"
      >
        <q-card-section>
          <div class="row items-center justify-between">
            <div>
              <div class="text-weight-bold text-h6">{{ session.table?.name || 'Table' }}</div>
              <div class="text-caption text-grey-6">Since {{ formatTime(session.created_at) }}</div>
            </div>
            <q-badge
              :color="session.status === 'ACTIVE' ? 'positive' : 'grey'"
              :label="session.status"
            />
          </div>
          <div class="q-mt-sm text-grey-7">{{ session.orders?.length || 0 }} orders</div>
        </q-card-section>
      </q-card>

      <div v-if="activeSessions.length === 0" class="text-center q-pa-xl text-grey-5">
        No active sessions
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from 'src/services/supabase';
import { formatTime } from 'src/utils/formatters';

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
  background: #f5f7fa;
}
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.session-card {
  border-radius: 12px;
}
</style>
