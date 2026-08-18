<template>
  <q-page class="options-page q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h6 class="q-my-none">Option Groups</h6>
      <q-btn
        color="primary"
        unelevated
        no-caps
        icon="add"
        label="Add Option Group"
        @click="openGroupDialog()"
      />
    </div>

    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <q-list v-else bordered separator class="rounded-borders">
      <q-expansion-item
        v-for="group in optionGroups"
        :key="group.id"
        :label="group.name"
        :caption="`${group.selection_type === 'single' ? 'Single' : 'Multi'} select${group.is_required ? ' • Required' : ''}`"
        icon="tune"
        expand-separator
      >
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <span class="text-caption text-grey-6">
                Min: {{ group.min_selections }} | Max: {{ group.max_selections ?? '∞' }}
              </span>
              <div>
                <q-btn flat dense icon="edit" size="sm" @click="openGroupDialog(group)" />
                <q-btn
                  flat
                  dense
                  icon="add"
                  size="sm"
                  color="primary"
                  @click="openOptionDialog(group.id)"
                />
              </div>
            </div>

            <q-list dense>
              <q-item v-for="opt in groupOptions(group.id)" :key="opt.id">
                <q-item-section>
                  <q-item-label>{{ opt.name }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <span v-if="opt.price_adjustment !== 0" class="text-weight-medium">
                    {{ opt.price_adjustment > 0 ? '+' : '' }}{{ formatPrice(opt.price_adjustment) }}
                  </span>
                </q-item-section>
                <q-item-section side>
                  <q-badge
                    :color="opt.is_available ? 'positive' : 'negative'"
                    :label="opt.is_available ? 'Available' : 'Unavailable'"
                  />
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    dense
                    icon="edit"
                    size="sm"
                    @click="openOptionDialog(group.id, opt)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>

    <!-- Option Group dialog -->
    <q-dialog v-model="showGroupDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingGroup ? 'Edit' : 'Add' }} Option Group</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="groupForm.name" outlined label="Group Name" />
          <q-select
            v-model="groupForm.selection_type"
            :options="['single', 'multi']"
            outlined
            label="Selection Type"
          />
          <q-toggle v-model="groupForm.is_required" label="Required" />
          <q-input
            v-model.number="groupForm.min_selections"
            outlined
            label="Min Selections"
            type="number"
            min="0"
          />
          <q-input
            v-model.number="groupForm.max_selections"
            outlined
            label="Max Selections (0 = unlimited)"
            type="number"
            min="0"
          />
          <q-toggle v-model="groupForm.is_active" label="Active" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="primary" label="Save" @click="saveGroup" :loading="isSaving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Option dialog -->
    <q-dialog v-model="showOptionDialog">
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">{{ editingOption ? 'Edit' : 'Add' }} Option</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="optionForm.name" outlined label="Option Name" />
          <q-input
            v-model.number="optionForm.price_adjustment"
            outlined
            label="Price Adjustment (฿)"
            type="number"
          />
          <q-toggle v-model="optionForm.is_active" label="Active" />
          <q-toggle v-model="optionForm.is_available" label="Available" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="primary" label="Save" @click="saveOption" :loading="isSaving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { formatPrice } from 'src/utils/formatters';
import type { OptionGroup, Option } from 'src/types/database';

const { notifySuccess, notifyError } = useNotify();

const optionGroups = ref<OptionGroup[]>([]);
const options = ref<Option[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const showGroupDialog = ref(false);
const showOptionDialog = ref(false);
const editingGroup = ref<OptionGroup | null>(null);
const editingOption = ref<Option | null>(null);
const currentGroupId = ref('');

let restaurantId = '';

const groupForm = reactive({
  name: '',
  selection_type: 'single',
  is_required: false,
  min_selections: 0,
  max_selections: 0,
  is_active: true,
});

const optionForm = reactive({
  name: '',
  price_adjustment: 0,
  is_active: true,
  is_available: true,
});

function groupOptions(groupId: string): Option[] {
  return options.value
    .filter((o) => o.option_group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

onMounted(async () => {
  const { data } = await supabase.from('restaurants').select('id').limit(1).single();
  if (data) restaurantId = data.id;
  await loadData();
});

async function loadData() {
  isLoading.value = true;
  const [{ data: groups }, { data: opts }] = await Promise.all([
    supabase.from('option_groups').select('*').order('sort_order'),
    supabase.from('options').select('*').order('sort_order'),
  ]);
  optionGroups.value = (groups ?? []) as OptionGroup[];
  options.value = (opts ?? []) as Option[];
  isLoading.value = false;
}

function openGroupDialog(group?: OptionGroup) {
  editingGroup.value = group ?? null;
  groupForm.name = group?.name ?? '';
  groupForm.selection_type = group?.selection_type ?? 'single';
  groupForm.is_required = group?.is_required ?? false;
  groupForm.min_selections = group?.min_selections ?? 0;
  groupForm.max_selections = group?.max_selections ?? 0;
  groupForm.is_active = group?.is_active ?? true;
  showGroupDialog.value = true;
}

async function saveGroup() {
  isSaving.value = true;
  try {
    const payload = {
      name: groupForm.name,
      selection_type: groupForm.selection_type,
      is_required: groupForm.is_required,
      min_selections: groupForm.min_selections,
      max_selections: groupForm.max_selections || null,
      is_active: groupForm.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editingGroup.value) {
      await supabase.from('option_groups').update(payload).eq('id', editingGroup.value.id);
    } else {
      const maxOrder = Math.max(0, ...optionGroups.value.map((g) => g.sort_order)) + 1;
      await supabase.from('option_groups').insert({
        ...payload,
        restaurant_id: restaurantId,
        sort_order: maxOrder,
      });
    }
    showGroupDialog.value = false;
    await loadData();
    notifySuccess('Option group saved');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to save');
  } finally {
    isSaving.value = false;
  }
}

function openOptionDialog(groupId: string, opt?: Option) {
  currentGroupId.value = groupId;
  editingOption.value = opt ?? null;
  optionForm.name = opt?.name ?? '';
  optionForm.price_adjustment = opt?.price_adjustment ?? 0;
  optionForm.is_active = opt?.is_active ?? true;
  optionForm.is_available = opt?.is_available ?? true;
  showOptionDialog.value = true;
}

async function saveOption() {
  isSaving.value = true;
  try {
    const payload = {
      name: optionForm.name,
      price_adjustment: optionForm.price_adjustment,
      is_active: optionForm.is_active,
      is_available: optionForm.is_available,
      updated_at: new Date().toISOString(),
    };

    if (editingOption.value) {
      await supabase.from('options').update(payload).eq('id', editingOption.value.id);
    } else {
      const groupOpts = groupOptions(currentGroupId.value);
      const maxOrder = Math.max(0, ...groupOpts.map((o) => o.sort_order)) + 1;
      await supabase.from('options').insert({
        ...payload,
        option_group_id: currentGroupId.value,
        sort_order: maxOrder,
      });
    }
    showOptionDialog.value = false;
    await loadData();
    notifySuccess('Option saved');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to save');
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.options-page {
  background: #f5f7fa;
}
</style>
