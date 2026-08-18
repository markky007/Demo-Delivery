<template>
  <q-page class="options-page q-pa-md">
    <div class="options-container">
      <!-- Header Bar -->
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">ตัวเลือกเสริมของอาหาร</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            จัดการกลุ่มตัวเลือก เช่น ระดับความเผ็ด, ท็อปปิ้ง, ขนาดจาน
          </p>
        </div>
        <q-btn
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="เพิ่มกลุ่มตัวเลือก"
          @click="openGroupDialog()"
          class="add-group-btn"
        />
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="q-pa-xl column items-center">
        <LoadingSkeleton type="spinner" message="กำลังโหลดตัวเลือกเสริม..." />
      </div>

      <!-- Option Groups List -->
      <div v-else class="groups-list q-gutter-y-md">
        <div v-for="group in optionGroups" :key="group.id" class="group-expansion-card">
          <q-expansion-item default-opened expand-separator class="custom-expansion">
            <template v-slot:header>
              <q-item-section avatar>
                <div class="group-icon-wrap">
                  <q-icon name="tune" size="20px" color="primary" />
                </div>
              </q-item-section>

              <q-item-section>
                <div class="row items-center">
                  <span class="text-weight-bold text-subtitle1 group-name">{{ group.name }}</span>
                  <span
                    class="selection-type-badge q-ml-sm"
                    :class="group.selection_type === 'single' ? 'type-single' : 'type-multi'"
                  >
                    {{ group.selection_type === 'single' ? 'เลือก 1 อย่าง' : 'เลือกได้หลายอย่าง' }}
                  </span>
                  <span v-if="group.is_required" class="required-badge q-ml-xs"> ต้องเลือก </span>
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  เลือกขั้นต่ำ: {{ group.min_selections }} | สูงสุด:
                  {{ group.max_selections ?? 'ไม่จำกัด' }}
                </div>
              </q-item-section>

              <q-item-section side>
                <div class="row items-center q-gutter-xs" @click.stop>
                  <q-btn
                    flat
                    dense
                    round
                    icon="edit"
                    size="sm"
                    color="grey-7"
                    @click="openGroupDialog(group)"
                    aria-label="แก้ไขกลุ่ม"
                  />
                  <q-btn
                    unelevated
                    dense
                    no-caps
                    rounded
                    size="sm"
                    color="primary"
                    icon="add"
                    label="เพิ่มตัวเลือก"
                    class="q-px-sm"
                    @click="openOptionDialog(group.id)"
                  />
                </div>
              </q-item-section>
            </template>

            <!-- Nested Options List -->
            <div class="options-sublist q-pa-md">
              <div
                v-if="groupOptions(group.id).length === 0"
                class="text-center q-pa-md text-grey-5"
              >
                ยังไม่มีตัวเลือกในกลุ่มนี้ กดปุ่ม "+ เพิ่มตัวเลือก" เพื่อสร้าง
              </div>

              <div v-else class="q-gutter-y-xs">
                <div v-for="opt in groupOptions(group.id)" :key="opt.id" class="option-item-row">
                  <div class="row items-center">
                    <q-icon
                      name="radio_button_unchecked"
                      size="16px"
                      color="grey-4"
                      class="q-mr-sm"
                    />
                    <span class="text-weight-medium opt-name">{{ opt.name }}</span>
                  </div>

                  <div class="row items-center q-gutter-md">
                    <span
                      class="price-adj-label"
                      :class="{ 'text-primary': opt.price_adjustment > 0 }"
                    >
                      {{ opt.price_adjustment > 0 ? '+' : ''
                      }}{{ formatPrice(opt.price_adjustment) }}
                    </span>

                    <StatusBadge
                      :status="opt.is_available ? 'ACTIVE' : 'SOLDOUT'"
                      mode="raw"
                      :custom-label="opt.is_available ? 'พร้อมขาย' : 'หมด'"
                    />

                    <q-btn
                      flat
                      dense
                      round
                      icon="edit"
                      size="sm"
                      color="grey-6"
                      @click="openOptionDialog(group.id, opt)"
                      aria-label="แก้ไขตัวเลือก"
                    />
                  </div>
                </div>
              </div>
            </div>
          </q-expansion-item>
        </div>

        <div v-if="optionGroups.length === 0" class="text-center q-pa-xl text-grey-6">
          <q-icon name="tune" size="48px" color="grey-4" class="q-mb-xs" />
          <div>ยังไม่มีกลุ่มตัวเลือกเสริม</div>
        </div>
      </div>

      <!-- Option Group Dialog -->
      <q-dialog v-model="showGroupDialog">
        <q-card style="min-width: 360px; max-width: 460px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">
              {{ editingGroup ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือกใหม่' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-y-md">
            <div>
              <div class="field-label q-mb-xs">ชื่อกลุ่มตัวเลือก</div>
              <q-input
                v-model="groupForm.name"
                outlined
                placeholder="เช่น ระดับความเผ็ด, เพิ่มไข่ดาว"
                autofocus
              />
            </div>

            <div>
              <div class="field-label q-mb-xs">รูปแบบการเลือก</div>
              <q-select
                v-model="groupForm.selection_type"
                :options="selectionTypeOptions"
                outlined
                emit-value
                map-options
              />
            </div>

            <q-toggle
              v-model="groupForm.is_required"
              label="จำเป็นต้องเลือก (Required)"
              color="primary"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="field-label q-mb-xs">เลือกขั้นต่ำ</div>
                <q-input v-model.number="groupForm.min_selections" outlined type="number" min="0" />
              </div>
              <div class="col-6">
                <div class="field-label q-mb-xs">เลือกสูงสุด (0=ไม่จำกัด)</div>
                <q-input v-model.number="groupForm.max_selections" outlined type="number" min="0" />
              </div>
            </div>

            <q-toggle v-model="groupForm.is_active" label="เปิดใช้งานกลุ่มนี้" color="primary" />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              label="บันทึก"
              no-caps
              rounded
              @click="saveGroup"
              :loading="isSaving"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Option Dialog -->
      <q-dialog v-model="showOptionDialog">
        <q-card style="min-width: 340px; max-width: 440px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">
              {{ editingOption ? 'แก้ไขตัวเลือก' : 'เพิ่มตัวเลือกใหม่' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-y-md">
            <div>
              <div class="field-label q-mb-xs">ชื่อตัวเลือก</div>
              <q-input
                v-model="optionForm.name"
                outlined
                placeholder="เช่น เผ็ดมาก, เพิ่มไข่ดาวสุก"
                autofocus
              />
            </div>

            <div>
              <div class="field-label q-mb-xs">ราคาที่ปรับเปลี่ยน (บาท)</div>
              <q-input
                v-model.number="optionForm.price_adjustment"
                outlined
                type="number"
                placeholder="0 หรือ 10"
              />
              <div class="text-caption text-grey-6 q-mt-xs">ใส่ 0 หากไม่มีค่าใช้จ่ายเพิ่มเติม</div>
            </div>

            <div class="row items-center justify-between">
              <q-toggle v-model="optionForm.is_available" label="พร้อมขาย" color="primary" />
              <q-toggle v-model="optionForm.is_active" label="เปิดใช้งาน" color="primary" />
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              label="บันทึกตัวเลือก"
              no-caps
              rounded
              @click="saveOption"
              :loading="isSaving"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { formatPrice } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
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

const selectionTypeOptions = [
  { label: 'เลือกได้ 1 รายการ (Single)', value: 'single' },
  { label: 'เลือกได้หลายรายการ (Multi)', value: 'multi' },
];

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
  if (!groupForm.name.trim()) return;
  isSaving.value = true;
  try {
    const payload = {
      name: groupForm.name.trim(),
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
    notifySuccess('บันทึกกลุ่มตัวเลือกแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้');
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
  if (!optionForm.name.trim()) return;
  isSaving.value = true;
  try {
    const payload = {
      name: optionForm.name.trim(),
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
    notifySuccess('บันทึกตัวเลือกเรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกตัวเลือกได้');
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.options-page {
  background: var(--color-background);
}

.options-container {
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.add-group-btn {
  padding: 8px 18px;
  font-weight: 600;
}

.group-expansion-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: var(--shadow-subtle);
}

.group-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-name {
  color: var(--color-text-primary);
}

.selection-type-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.type-single {
  background: #e0f2fe;
  color: #0369a1;
}

.type-multi {
  background: #fef3c7;
  color: #b45309;
}

.required-badge {
  background: #fee2e2;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.options-sublist {
  background: var(--color-surface-subtle);
  border-top: 1px solid var(--color-border);
}

.option-item-row {
  background: #ffffff;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.opt-name {
  font-size: 0.92rem;
  color: var(--color-text-primary);
}

.price-adj-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.field-label {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
</style>
