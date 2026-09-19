<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    full-width
  >
    <q-card class="apple-menu-modal">
      <!-- Modal Header -->
      <div class="modal-header row items-center justify-between q-pa-md">
        <div class="row items-center">
          <div class="header-badge-icon q-mr-sm">
            <q-icon :name="isEditing ? 'edit_note' : 'add_circle'" size="20px" color="primary" />
          </div>
          <div>
            <div class="text-h6 text-weight-bold text-ink modal-title">
              {{ isEditing ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่' }}
            </div>
            <div class="text-caption text-muted">
              {{
                isEditing
                  ? 'ปรับปรุงรายละเอียด ราคา และตัวเลือกของเมนู'
                  : 'กรอกรายละเอียดเพื่อสร้างเมนูใหม่ลงในระบบ'
              }}
            </div>
          </div>
        </div>

        <q-btn flat dense round icon="close" color="grey-6" v-close-popup class="close-modal-btn" />
      </div>

      <q-separator class="separator-hairline" />

      <!-- Modal Body (Scrollable Form) -->
      <q-card-section class="modal-scroll-body q-pa-md q-gutter-y-lg">
        <!-- 1. Image Upload Section -->
        <div class="form-section">
          <div class="section-title text-weight-semibold q-mb-xs">รูปภาพอาหาร</div>
          <div class="image-uploader-box">
            <!-- Preview when image exists -->
            <div v-if="previewImageUrl" class="image-preview-wrapper">
              <img :src="previewImageUrl" alt="Preview" class="preview-img" />
              <div class="image-overlay-actions">
                <q-btn
                  unelevated
                  no-caps
                  rounded
                  size="sm"
                  color="white"
                  text-color="dark"
                  icon="photo_camera"
                  label="เปลี่ยนรูป"
                  class="q-mr-xs font-weight-semibold"
                  @click="triggerFileInput"
                />
                <q-btn
                  unelevated
                  no-caps
                  rounded
                  size="sm"
                  color="negative"
                  icon="delete"
                  label="ลบรูป"
                  @click="removeImage"
                />
              </div>
            </div>

            <!-- Empty dropzone when no image -->
            <div v-else class="upload-dropzone" @click="triggerFileInput">
              <div class="column items-center justify-center q-pa-lg text-center">
                <div class="upload-icon-circle q-mb-sm">
                  <q-icon name="cloud_upload" size="28px" color="primary" />
                </div>
                <div class="text-weight-bold text-subtitle2 text-ink">
                  คลิกเพื่ออัปโหลดรูปภาพอาหาร
                </div>
                <div class="text-caption text-muted q-mt-xs">
                  รองรับ JPG, PNG, WebP (ขนาดแนะนำสี่เหลี่ยมจัตุรัส ไม่เกิน 5MB)
                </div>
              </div>
            </div>

            <!-- Hidden File Input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden-file-input"
              @change="handleFileSelected"
            />
          </div>

          <!-- Direct URL accordion -->
          <q-expansion-item
            dense
            label="หรือใส่ลิงก์รูปภาพโดยตรง (Image URL)"
            header-class="text-caption text-muted q-px-none"
            class="q-mt-xs"
          >
            <q-input
              v-model="form.image_url"
              outlined
              dense
              placeholder="https://example.com/image.jpg"
              class="q-mt-xs apple-input"
              @update:model-value="handleUrlInput"
            />
          </q-expansion-item>
        </div>

        <!-- 2. Core Menu Information -->
        <div class="form-section q-gutter-y-md">
          <div class="section-title text-weight-semibold">ข้อมูลทั่วไป</div>

          <!-- Menu Name -->
          <div>
            <div class="field-label q-mb-xs">
              ชื่อเมนูอาหาร <span class="text-negative">*</span>
            </div>
            <q-input
              v-model="form.name"
              outlined
              dense
              placeholder="เช่น ข้าวกะเพราไก่ไข่ดาว"
              class="apple-input"
            />
          </div>

          <!-- Category & Main Ingredient -->
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <div class="field-label q-mb-xs">หมวดหมู่ <span class="text-negative">*</span></div>
              <q-select
                v-model="form.category_id"
                :options="categoryOptions"
                outlined
                dense
                emit-value
                map-options
                placeholder="เลือกหมวดหมู่"
                class="apple-input"
              />
            </div>
            <div class="col-12 col-sm-6">
              <div class="field-label q-mb-xs">วัตถุดิบหลัก (Main Ingredient)</div>
              <q-select
                v-model="form.main_ingredient"
                :options="ingredientSelectOptions"
                outlined
                dense
                use-input
                new-value-mode="add-unique"
                placeholder="เช่น ไก่ทอด, หมูกรอบ, กุ้ง"
                clearable
                class="apple-input"
              />
            </div>
          </div>

          <!-- Base Price -->
          <div>
            <div class="field-label q-mb-xs">
              ราคาฐาน (บาท) <span class="text-negative">*</span>
            </div>
            <q-input
              v-model.number="form.base_price"
              outlined
              dense
              type="number"
              min="0"
              placeholder="60"
              class="apple-input"
            >
              <template v-slot:prepend>
                <span class="text-muted font-mono">฿</span>
              </template>
            </q-input>
          </div>

          <!-- Description -->
          <div>
            <div class="field-label q-mb-xs">รายละเอียดเมนู</div>
            <q-input
              v-model="form.description"
              outlined
              dense
              type="textarea"
              autogrow
              placeholder="คำอธิบายรสชาติ ปริมาณ หรือรายละเอียดวัตถุดิบ..."
              class="apple-input"
            />
          </div>
        </div>

        <!-- 3. Fry Station Configuration -->
        <div class="fry-settings-box q-pa-md">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="fry-icon-circle q-mr-sm">
                <q-icon name="local_fire_department" size="20px" color="deep-orange-9" />
              </div>
              <div>
                <div class="text-weight-bold text-subtitle2 text-deep-orange-10">
                  การตั้งค่าของทอด (Fry Station)
                </div>
                <div class="text-caption text-grey-8">
                  เปิดเพื่อส่งรายการของทอดเข้าสู่ "คิวของทอด" ให้คนทอดเตรียมอัตโนมัติ
                </div>
              </div>
            </div>
            <q-toggle v-model="fryConfig.is_fried" color="deep-orange-8" />
          </div>

          <!-- Fry Config Details -->
          <div v-if="fryConfig.is_fried" class="q-mt-md q-pt-sm fry-details-content">
            <!-- Preset Templates -->
            <div class="row items-center q-gutter-xs q-mb-sm flex-wrap">
              <span class="text-caption text-grey-8">เทมเพลตด่วน:</span>
              <button
                v-for="preset in fryPresets"
                :key="preset.name"
                type="button"
                class="fry-preset-pill"
                @click="applyFryPreset(preset.name, preset.unit, preset.special)"
              >
                + {{ preset.name }}
              </button>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-8">
                <div class="field-label q-mb-xs">ชื่อของทอด (ธรรมดา)</div>
                <q-input
                  v-model="fryConfig.fry_name"
                  outlined
                  dense
                  placeholder="เช่น ไก่ทอด, เอ็นไก่ทอด"
                  class="apple-input"
                />
              </div>
              <div class="col-12 col-sm-4">
                <div class="field-label q-mb-xs">จำนวน (ธรรมดา)</div>
                <q-input
                  v-model.number="fryConfig.fry_qty"
                  type="number"
                  min="1"
                  outlined
                  dense
                  class="apple-input"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-xs">
              <div class="col-12 col-sm-8">
                <div class="field-label q-mb-xs">ชื่อของทอด (เมื่อสั่งพิเศษ)</div>
                <q-input
                  v-model="fryConfig.special_fry_name"
                  outlined
                  dense
                  placeholder="เช่น ไก่ทอดพิเศษ (เว้นว่างได้)"
                  class="apple-input"
                />
              </div>
              <div class="col-12 col-sm-4">
                <div class="field-label q-mb-xs">จำนวน (พิเศษ)</div>
                <q-input
                  v-model.number="fryConfig.special_fry_qty"
                  type="number"
                  min="1"
                  outlined
                  dense
                  class="apple-input"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Option Groups Multi-selection Section -->
        <div class="option-groups-section">
          <div class="row items-center justify-between q-mb-xs">
            <div class="section-title text-weight-semibold row items-center">
              <q-icon name="tune" size="18px" color="primary" class="q-mr-xs" />
              <span>กลุ่มตัวเลือกเสริม (Option Groups)</span>
            </div>
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="open_in_new"
              label="จัดการตัวเลือกเสริม"
              size="sm"
              to="/owner/options"
              class="manage-options-link"
            />
          </div>
          <p class="text-caption text-muted q-mb-sm">
            เลือกกลุ่มตัวเลือกที่เปิดให้ลูกค้าเลือกเพิ่มเติมสำหรับเมนูนี้
          </p>

          <!-- Loading -->
          <div v-if="isLoadingOptionGroups" class="q-py-md text-center">
            <q-spinner color="primary" size="24px" />
            <div class="text-caption text-muted q-mt-xs">กำลังโหลดกลุ่มตัวเลือก...</div>
          </div>

          <!-- Empty State -->
          <div v-else-if="allOptionGroups.length === 0" class="no-options-hint q-pa-md text-center">
            <q-icon name="tune" size="32px" color="grey-4" class="q-mb-xs" />
            <div class="text-weight-medium text-caption text-ink">ยังไม่มีกลุ่มตัวเลือกในระบบ</div>
            <div class="text-caption text-muted q-mt-xs">
              สร้างกลุ่มตัวเลือกก่อน เช่น ระดับความเผ็ด, เพิ่มไข่ดาว
            </div>
          </div>

          <!-- Option Groups Cards List -->
          <div v-else class="option-groups-grid q-gutter-y-xs">
            <div
              v-for="group in allOptionGroups"
              :key="group.id"
              class="option-group-card-choice"
              :class="{
                'option-group-card-choice--selected': selectedOptionGroupIds.includes(group.id),
              }"
              @click="toggleOptionGroup(group.id)"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center no-wrap col">
                  <q-checkbox
                    :model-value="selectedOptionGroupIds.includes(group.id)"
                    @update:model-value="toggleOptionGroup(group.id)"
                    color="primary"
                    dense
                    class="q-mr-sm"
                    @click.stop
                  />
                  <div class="col ellipsis">
                    <div class="row items-center q-gutter-xs flex-wrap">
                      <span class="text-weight-bold text-body2 text-ink">{{ group.name }}</span>
                      <span
                        class="opt-badge"
                        :class="
                          group.selection_type === 'single'
                            ? 'opt-badge--single'
                            : 'opt-badge--multi'
                        "
                      >
                        {{
                          group.selection_type === 'single' ? 'เลือก 1 อย่าง' : 'เลือกได้หลายอย่าง'
                        }}
                      </span>
                      <span v-if="group.is_required" class="opt-badge opt-badge--required">
                        จำเป็นต้องเลือก
                      </span>
                    </div>
                    <div
                      v-if="group.options.length > 0"
                      class="text-caption text-muted ellipsis q-mt-xs"
                    >
                      <span class="text-muted-light">ตัวเลือก: </span>
                      <span>{{ group.options.map((o) => o.name).join(', ') }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Status Toggles -->
        <div class="row items-center justify-between q-pa-sm bg-surface-subtle rounded-borders">
          <q-toggle v-model="form.is_available" label="พร้อมขาย (มีวัตถุดิบ)" color="primary" />
          <q-toggle v-model="form.is_active" label="เปิดแสดงในเมนู" color="primary" />
        </div>
      </q-card-section>

      <q-separator class="separator-hairline" />

      <!-- Modal Actions -->
      <div class="modal-footer row items-center justify-end q-pa-md q-gutter-sm">
        <q-btn
          flat
          label="ยกเลิก"
          no-caps
          v-close-popup
          class="apple-pill-btn apple-pill-btn--secondary"
        />
        <q-btn
          unelevated
          color="primary"
          :label="
            isUploading ? 'กำลังอัปโหลดรูป...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มเมนูอาหาร'
          "
          no-caps
          class="apple-pill-btn apple-pill-btn--primary"
          :loading="isSaving || isUploading"
          @click="handleSubmit"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import type { MenuCategory, MenuItem, FryConfig } from 'src/types/database';
import type { OptionGroupWithSubOptions } from 'src/pages/owner/MenuManagementPage.vue';
import { STANDARD_INGREDIENTS, inferMainIngredient } from 'src/utils/ingredientHelper';
import { inferFryConfigFromName } from 'src/utils/fryHelper';
import { createLocalPreviewUrl } from 'src/services/storageService';
import { useNotify } from 'src/composables/useNotify';

const props = defineProps<{
  modelValue: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isUploading: boolean;
  categories: MenuCategory[];
  allOptionGroups: OptionGroupWithSubOptions[];
  isLoadingOptionGroups: boolean;
  initialItem: MenuItem | null;
  initialOptionGroupIds: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (
    e: 'save',
    data: {
      itemForm: {
        name: string;
        description: string;
        base_price: number;
        image_url: string;
        category_id: string;
        main_ingredient: string;
        is_active: boolean;
        is_available: boolean;
      };
      fryConfig: FryConfig;
      optionGroupIds: string[];
      pendingFile: File | null;
    },
  ): void;
}>();

const { notifyError } = useNotify();

const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingImageFile = ref<File | null>(null);
const previewImageUrl = ref<string>('');
const selectedOptionGroupIds = ref<string[]>([]);

const ingredientSelectOptions = STANDARD_INGREDIENTS.map((i) => i.name);

const fryPresets = [
  { name: 'ไก่ทอด', unit: 'ออเดอร์', special: 'ไก่ทอดพิเศษ' },
  { name: 'เอ็นไก่ทอด', unit: 'ออเดอร์', special: 'เอ็นไก่ทอดพิเศษ' },
  { name: 'ปีกไก่ทอด', unit: 'ออเดอร์', special: 'ปีกไก่ทอดพิเศษ' },
  { name: 'สามชั้นทอด', unit: 'ออเดอร์', special: 'สามชั้นทอดพิเศษ' },
  { name: 'กุ้งทอด', unit: 'ออเดอร์', special: 'กุ้งทอดพิเศษ' },
  { name: 'หมึกทอด', unit: 'ออเดอร์', special: 'หมึกทอดพิเศษ' },
  { name: 'ทะเลทอด', unit: 'ออเดอร์', special: 'ทะเลทอดพิเศษ' },
];

const form = reactive({
  name: '',
  description: '',
  base_price: 0,
  image_url: '',
  category_id: '',
  main_ingredient: '',
  is_active: true,
  is_available: true,
});

const fryConfig = reactive<FryConfig>({
  is_fried: false,
  fry_name: '',
  fry_qty: 1,
  special_fry_name: '',
  special_fry_qty: 1,
  unit: 'ออเดอร์',
});

const categoryOptions = computed(() =>
  props.categories.map((c) => ({ label: c.name, value: c.id })),
);

function applyFryPreset(name: string, unit = 'ออเดอร์', specialName?: string) {
  fryConfig.is_fried = true;
  fryConfig.fry_name = name;
  fryConfig.unit = unit;
  fryConfig.fry_qty = 1;
  fryConfig.special_fry_name = specialName || `${name}พิเศษ`;
  fryConfig.special_fry_qty = 1;
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.initialItem) {
        // Edit mode: populate
        form.name = props.initialItem.name;
        form.description = props.initialItem.description || '';
        form.base_price = props.initialItem.base_price;
        form.image_url = props.initialItem.image_url || '';
        form.category_id = props.initialItem.category_id;
        form.main_ingredient =
          props.initialItem.main_ingredient || inferMainIngredient(props.initialItem.name);
        form.is_active = props.initialItem.is_active;
        form.is_available = props.initialItem.is_available;

        if (
          props.initialItem.fry_config &&
          typeof props.initialItem.fry_config.is_fried === 'boolean'
        ) {
          fryConfig.is_fried = props.initialItem.fry_config.is_fried;
          fryConfig.fry_name = props.initialItem.fry_config.fry_name || props.initialItem.name;
          fryConfig.fry_qty = props.initialItem.fry_config.fry_qty || 1;
          fryConfig.special_fry_name = props.initialItem.fry_config.special_fry_name || '';
          fryConfig.special_fry_qty = props.initialItem.fry_config.special_fry_qty || 1;
          fryConfig.unit = props.initialItem.fry_config.unit || 'ออเดอร์';
        } else {
          const inferred = inferFryConfigFromName(props.initialItem.name);
          if (inferred) {
            fryConfig.is_fried = inferred.is_fried;
            fryConfig.fry_name = inferred.fry_name || props.initialItem.name;
            fryConfig.fry_qty = inferred.fry_qty || 1;
            fryConfig.special_fry_name = inferred.special_fry_name || '';
            fryConfig.special_fry_qty = inferred.special_fry_qty || 1;
            fryConfig.unit = inferred.unit || 'ออเดอร์';
          } else {
            fryConfig.is_fried = false;
            fryConfig.fry_name = props.initialItem.name;
            fryConfig.fry_qty = 1;
            fryConfig.special_fry_name = '';
            fryConfig.special_fry_qty = 1;
            fryConfig.unit = 'ออเดอร์';
          }
        }

        previewImageUrl.value = props.initialItem.image_url || '';
        selectedOptionGroupIds.value = [...props.initialOptionGroupIds];
      } else {
        // Create mode: reset
        form.name = '';
        form.description = '';
        form.base_price = 0;
        form.image_url = '';
        form.category_id = props.categories[0]?.id || '';
        form.main_ingredient = '';
        form.is_active = true;
        form.is_available = true;

        fryConfig.is_fried = false;
        fryConfig.fry_name = '';
        fryConfig.fry_qty = 1;
        fryConfig.special_fry_name = '';
        fryConfig.special_fry_qty = 1;
        fryConfig.unit = 'ออเดอร์';

        previewImageUrl.value = '';
        const diningGroup = props.allOptionGroups.find(
          (g) => g.name === 'รูปแบบการทาน' || g.name === 'ทานที่ร้าน / กลับบ้าน',
        );
        selectedOptionGroupIds.value = diningGroup ? [diningGroup.id] : [];
      }
      pendingImageFile.value = null;
      if (fileInputRef.value) fileInputRef.value.value = '';
    }
  },
);

function toggleOptionGroup(groupId: string) {
  const idx = selectedOptionGroupIds.value.indexOf(groupId);
  if (idx > -1) {
    selectedOptionGroupIds.value.splice(idx, 1);
  } else {
    selectedOptionGroupIds.value.push(groupId);
  }
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    notifyError('กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน 5MB', {
      title: 'ไฟล์รูปภาพมีขนาดใหญ่เกินไป',
    });
    return;
  }

  pendingImageFile.value = file;
  previewImageUrl.value = createLocalPreviewUrl(file);
}

function removeImage() {
  pendingImageFile.value = null;
  previewImageUrl.value = '';
  form.image_url = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function handleUrlInput(val: string | number | null) {
  const str = String(val || '');
  if (!pendingImageFile.value) {
    previewImageUrl.value = str;
  }
}

function handleSubmit() {
  if (!form.name.trim()) {
    notifyError('กรุณากรอกชื่อเมนูอาหาร');
    return;
  }
  if (!form.category_id) {
    notifyError('กรุณาเลือกหมวดหมู่');
    return;
  }

  emit('save', {
    itemForm: { ...form, name: form.name.trim() },
    fryConfig: { ...fryConfig },
    optionGroupIds: [...selectedOptionGroupIds.value],
    pendingFile: pendingImageFile.value,
  });
}
</script>

<style scoped>
.apple-menu-modal {
  max-width: 620px;
  width: 100%;
  margin: 0 auto;
  border-radius: var(--radius-xl, 28px);
  background: var(--color-surface, #ffffff);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
}

.modal-header {
  background: var(--color-surface, #ffffff);
}

.header-badge-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(0, 113, 227, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 1.125rem;
  line-height: 1.3;
}

.modal-scroll-body {
  max-height: 75vh;
  overflow-y: auto;
}

.separator-hairline {
  background: var(--color-hairline, #d2d2d7);
  opacity: 0.6;
}

.section-title {
  font-size: 0.9375rem;
  color: var(--color-ink, #1d1d1f);
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-body, #414143);
}

/* Image Dropzone */
.image-uploader-box {
  width: 100%;
}

.hidden-file-input {
  display: none;
}

.upload-dropzone {
  border: 1.5px dashed var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-md, 11px);
  background: var(--color-surface-subtle, #fafafc);
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-dropzone:hover {
  border-color: var(--color-primary, #0071e3);
  background: rgba(0, 113, 227, 0.04);
}

.upload-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-surface, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  height: 190px;
  border-radius: var(--radius-md, 11px);
  overflow: hidden;
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay-actions {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 6px 10px;
  border-radius: var(--radius-pill, 980px);
}

/* Apple Input Control */
.apple-input :deep(.q-field__control) {
  border-radius: var(--radius-md, 11px);
  border-color: var(--color-hairline, #d2d2d7);
  background: var(--color-surface, #ffffff);
}

.apple-input :deep(.q-field__control):hover {
  border-color: var(--color-primary-tint, rgba(0, 113, 227, 0.3));
}

.apple-input :deep(.q-field__control--focused) {
  border-color: var(--color-primary, #0071e3) !important;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15) !important;
}

/* Fry Settings Box */
.fry-settings-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-md, 11px);
}

.fry-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ffedd5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fry-details-content {
  border-top: 1px dashed #fdba74;
}

.fry-preset-pill {
  border: 1px solid #fdba74;
  background: #ffffff;
  color: #c2410c;
  padding: 3px 9px;
  border-radius: var(--radius-pill, 980px);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.fry-preset-pill:hover {
  background: #ffedd5;
}

/* Option Groups Section */
.option-groups-section {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-md, 11px);
  padding: 14px;
}

.manage-options-link {
  font-size: 0.75rem;
  font-weight: 600;
}

.no-options-hint {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-sm, 8px);
  border: 1px dashed var(--color-hairline, #d2d2d7);
}

.option-group-card-choice {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-sm, 8px);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.option-group-card-choice:hover {
  border-color: var(--color-primary-tint, rgba(0, 113, 227, 0.3));
}

.option-group-card-choice--selected {
  border-color: var(--color-primary, #0071e3) !important;
  background: rgba(0, 113, 227, 0.04) !important;
}

.opt-badge {
  font-size: 0.6875rem;
  padding: 2px 7px;
  border-radius: var(--radius-pill, 980px);
  font-weight: 600;
}

.opt-badge--single {
  background: #eef2ff;
  color: #4f46e5;
}

.opt-badge--multi {
  background: #f0fdf4;
  color: #16a34a;
}

.opt-badge--required {
  background: #fee2e2;
  color: #dc2626;
}

/* Apple Buttons */
.apple-pill-btn {
  border-radius: var(--radius-pill, 980px) !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
  padding: 0 20px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.text-muted-light {
  color: var(--color-muted-light, #86868b);
}

.font-mono {
  font-family: var(--app-font-mono, sans-serif);
}

.bg-surface-subtle {
  background: var(--color-surface-subtle, #fafafc);
}
</style>
