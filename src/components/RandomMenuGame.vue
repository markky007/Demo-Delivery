<template>
  <div class="random-menu-container">
    <!-- ─── Hero Section Banner ─────────────────────────── -->
    <div class="hero-banner">
      <div class="hero-background-decorations" aria-hidden="true">
        <span class="floating-emoji e-1">🍜</span>
        <span class="floating-emoji e-2">🍱</span>
        <span class="floating-emoji e-3">🥟</span>
        <span class="floating-emoji e-4">✨</span>
        <span class="floating-emoji e-5">🎲</span>
        <span class="floating-emoji e-6">🔥</span>
      </div>

      <div class="hero-content">
        <div class="hero-badge">
          <q-icon name="auto_awesome" size="14px" class="q-mr-xs" />
          <span>คิดไม่ออกใช่ไหม? ให้เราช่วยเลือก</span>
        </div>

        <h2 class="hero-title">สุ่มเมนูเด็ดวันนี้ <span class="dice-bounce">🎲</span></h2>

        <p class="hero-desc">
          เลือกไม่ถูก ไม่รู้จะกินอะไรดี กดสุ่มเมนูจานโปรดพร้อมเสิร์ฟความอร่อยได้ทันที!
        </p>

        <div class="hero-actions">
          <button
            class="spin-trigger-btn"
            :disabled="availableItems.length === 0"
            @click="startRandomizer"
          >
            <span class="spin-btn-icon">🎲</span>
            <span class="spin-btn-text">สุ่มเมนูอาหารเลย!</span>
            <span class="spin-btn-shine"></span>
          </button>

          <div class="hero-meta-tag">
            <q-icon name="restaurant_menu" size="14px" class="q-mr-xs" />
            <span
              >มี <strong>{{ availableItems.length }}</strong> เมนูพร้อมสุ่ม</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Spin Animation Overlay Modal ─────────────────── -->
    <q-dialog
      v-model="isSpinning"
      persistent
      transition-show="scale"
      transition-hide="fade"
      class="spin-dialog"
    >
      <q-card class="spin-card text-center">
        <!-- Canvas for Confetti -->
        <canvas ref="confettiCanvas" class="confetti-canvas"></canvas>

        <div class="spin-header">
          <div class="spin-status-badge">
            <q-spinner-orbit v-if="spinPhase !== 'winner'" color="primary" size="20px" />
            <q-icon v-else name="celebration" color="amber-8" size="22px" class="bounce-anim" />
            <span class="q-ml-sm text-weight-bold">
              {{ spinPhase === 'winner' ? '🎉 ได้เมนูนี้แล้ว!' : '🎲 กำลังสุ่มเมนูเด็ด...' }}
            </span>
          </div>
        </div>

        <!-- Slot Machine Reel Box -->
        <div class="slot-reel-wrapper" :class="{ 'slot-reel--winner': spinPhase === 'winner' }">
          <div v-if="currentItemDisplay" class="slot-item-view">
            <div class="slot-image-box">
              <img
                v-if="currentItemDisplay.image_url"
                :src="currentItemDisplay.image_url"
                :alt="currentItemDisplay.name"
                class="slot-image"
              />
              <div v-else class="slot-image-placeholder">
                <q-icon name="restaurant" size="56px" color="orange-4" />
              </div>

              <div v-if="spinPhase === 'winner'" class="winner-glow-ring"></div>
            </div>

            <div class="slot-item-name" :class="{ 'name-reveal': spinPhase === 'winner' }">
              {{ currentItemDisplay.name }}
            </div>

            <div class="slot-item-price">
              {{ formatPrice(currentItemDisplay.base_price) }}
            </div>
          </div>
        </div>

        <div class="spin-footer-hint text-caption text-grey-7 q-mt-md">
          <template v-if="spinPhase === 'spinning'"> ค้นหาเมนูที่ใช่สำหรับคุณ... </template>
          <template v-else-if="spinPhase === 'slowing'">
            ใกล้จะหยุดแล้ว เตรียมอร่อยได้เลย!
          </template>
          <template v-else> กำลังเปิดหน้าต่างเลือกตัวเลือกเมนู... </template>
        </div>
      </q-card>
    </q-dialog>

    <!-- ─── Result & Option Selection Dialog ─────────────── -->
    <q-dialog
      v-model="isResultOpen"
      position="bottom"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
      class="result-dialog"
    >
      <q-card v-if="selectedItemWithOptions" class="result-card">
        <!-- Dialog Top Bar -->
        <div class="dialog-header-sticky">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="congrats-icon-box q-mr-sm">
                <span>🎉</span>
              </div>
              <div>
                <div class="text-weight-bold text-subtitle1 text-primary">เมนูที่คุณสุ่มได้!</div>
                <div class="text-caption text-grey-7">เลือกตัวเลือกและเพิ่มลงตะกร้าได้เลย</div>
              </div>
            </div>
            <q-btn
              flat
              round
              dense
              icon="close"
              color="grey-7"
              @click="closeResultDialog"
              aria-label="ปิด"
            />
          </div>
        </div>

        <div class="result-content-scroll q-px-md q-pt-sm q-pb-xl">
          <!-- Item Hero Preview -->
          <div class="result-dish-card q-mb-md">
            <div class="dish-img-wrapper">
              <img
                v-if="selectedItemWithOptions.image_url"
                :src="selectedItemWithOptions.image_url"
                :alt="selectedItemWithOptions.name"
                class="dish-img"
              />
              <div v-else class="dish-placeholder">
                <q-icon name="restaurant" size="48px" color="grey-4" />
              </div>
              <div class="lucky-tag">
                <q-icon name="stars" size="14px" class="q-mr-xs" />
                <span>เมนูนำโชคของคุณ</span>
              </div>
            </div>

            <div class="dish-details q-pa-md">
              <div class="row justify-between items-start no-wrap">
                <div class="dish-title text-weight-bolder">{{ selectedItemWithOptions.name }}</div>
                <div class="dish-price text-primary text-weight-bold q-ml-sm">
                  {{ formatPrice(selectedItemWithOptions.base_price) }}
                </div>
              </div>
              <p v-if="selectedItemWithOptions.description" class="dish-desc q-mt-xs q-mb-none">
                {{ selectedItemWithOptions.description }}
              </p>
            </div>
          </div>

          <!-- Loading Options Skeleton -->
          <div v-if="isLoadingOptions" class="q-py-md">
            <LoadingSkeleton type="product-detail" />
          </div>

          <template v-else>
            <!-- Option Groups -->
            <div
              v-for="group in selectedItemWithOptions.option_groups"
              :id="`random-group-${group.id}`"
              :key="group.id"
              class="option-group-card q-mt-md"
              :class="{ 'option-group-card--error': missingGroupIds.has(group.id) }"
            >
              <div class="row items-center justify-between q-mb-xs">
                <div class="option-group-name">{{ group.name }}</div>
                <span
                  class="group-tag"
                  :class="group.is_required ? 'group-tag--required' : 'group-tag--optional'"
                >
                  {{ group.is_required ? 'ต้องเลือก' : 'เลือกเพิ่มได้' }}
                </span>
              </div>

              <div class="option-group-hint q-mb-sm">
                <template v-if="group.selection_type === 'single'">เลือกได้ 1 รายการ</template>
                <template v-else>
                  เลือกได้
                  <template v-if="group.min_selections > 0"
                    >อย่างน้อย {{ group.min_selections }}</template
                  >
                  <template v-if="group.max_selections"
                    >, สูงสุด {{ group.max_selections }} รายการ</template
                  >
                </template>
              </div>

              <!-- Validation Error Alert -->
              <div v-if="missingGroupIds.has(group.id)" class="group-validation-error q-mb-sm">
                <q-icon name="error_outline" size="16px" class="q-mr-xs" />
                <span v-if="group.selection_type === 'single'">กรุณาเลือกตัวเลือกในกลุ่มนี้</span>
                <span v-else>กรุณาเลือกอย่างน้อย {{ group.min_selections || 1 }} รายการ</span>
              </div>

              <!-- Single Select (Radio) -->
              <div v-if="group.selection_type === 'single'" class="options-list">
                <div
                  v-for="opt in group.options"
                  :key="opt.id"
                  class="option-row"
                  :class="{
                    'option-row--selected': selectedOptions[group.id] === opt.id,
                    'option-row--disabled': !opt.is_available,
                  }"
                  @click="toggleSingleOption(group, opt.id, opt.is_available)"
                >
                  <div class="row items-center">
                    <q-radio
                      :model-value="selectedOptions[group.id]"
                      :val="opt.id"
                      :disable="!opt.is_available"
                      color="primary"
                      dense
                      class="q-mr-sm pointer-events-none"
                    />
                    <span class="option-name">{{ opt.name }}</span>
                  </div>
                  <div class="option-price-adjust">
                    <span v-if="opt.price_adjustment > 0"
                      >+{{ formatPrice(opt.price_adjustment) }}</span
                    >
                    <span v-else-if="opt.price_adjustment < 0">{{
                      formatPrice(opt.price_adjustment)
                    }}</span>
                    <span v-else class="text-grey-5">—</span>
                  </div>
                </div>
              </div>

              <!-- Multi Select (Checkbox) -->
              <div v-else class="options-list">
                <div
                  v-for="opt in group.options"
                  :key="opt.id"
                  class="option-row"
                  :class="{
                    'option-row--selected': multiSelectedOptions[group.id]?.includes(opt.id),
                    'option-row--disabled':
                      !opt.is_available ||
                      (group.max_selections !== null &&
                        (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                        !multiSelectedOptions[group.id]?.includes(opt.id)),
                  }"
                  @click="
                    toggleMultiOption(group.id, opt.id, group.max_selections, opt.is_available)
                  "
                >
                  <div class="row items-center">
                    <q-checkbox
                      :model-value="multiSelectedOptions[group.id]?.includes(opt.id)"
                      :disable="
                        !opt.is_available ||
                        (group.max_selections !== null &&
                          (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                          !multiSelectedOptions[group.id]?.includes(opt.id))
                      "
                      color="primary"
                      dense
                      class="q-mr-sm pointer-events-none"
                    />
                    <span class="option-name">{{ opt.name }}</span>
                  </div>
                  <div class="option-price-adjust">
                    <span v-if="opt.price_adjustment > 0"
                      >+{{ formatPrice(opt.price_adjustment) }}</span
                    >
                    <span v-else-if="opt.price_adjustment < 0">{{
                      formatPrice(opt.price_adjustment)
                    }}</span>
                    <span v-else class="text-grey-5">—</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Special Instruction -->
            <div class="option-group-card q-mt-md">
              <div class="option-group-name q-mb-xs">รายละเอียดเพิ่มเติม / หมายเหตุถึงร้าน</div>
              <p class="option-group-hint q-mb-sm">เช่น ไม่ใส่ผัก, เผ็ดน้อย, แยกน้ำซุป</p>
              <q-input
                v-model="specialInstruction"
                outlined
                autogrow
                placeholder="ระบุข้อความถึงทางร้าน..."
                :maxlength="MAX_SPECIAL_INSTRUCTION_LENGTH"
                counter
                class="special-input"
              />
            </div>

            <!-- Quantity Section -->
            <div class="row items-center justify-between quantity-section q-mt-md q-pa-md">
              <div>
                <div class="text-weight-bold text-subtitle2">จำนวนจาน</div>
                <div class="text-caption text-grey-6">เลือกจำนวนที่ต้องการสั่ง</div>
              </div>
              <QuantityStepper v-model="quantity" :min="1" />
            </div>
          </template>
        </div>

        <!-- Sticky Action Footer -->
        <div class="result-sticky-footer">
          <div class="row q-col-gutter-sm items-center">
            <!-- Spin Again Button -->
            <div class="col-4">
              <q-btn
                outline
                color="primary"
                no-caps
                class="full-width spin-again-btn"
                @click="reSpin"
              >
                <q-icon name="casino" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold">สุ่มใหม่</span>
              </q-btn>
            </div>

            <!-- Add to Cart Button -->
            <div class="col-8">
              <q-btn
                color="primary"
                unelevated
                no-caps
                class="full-width add-cart-btn"
                :disable="isLoadingOptions"
                @click="addToCart"
              >
                <div class="row items-center justify-between full-width no-wrap q-px-xs">
                  <span class="text-weight-bold">เพิ่มลงตะกร้า</span>
                  <span class="text-weight-bold">{{ formatPrice(itemTotal) }}</span>
                </div>
              </q-btn>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { useCartStore } from 'src/stores/cartStore';
import { useNotify } from 'src/composables/useNotify';
import { formatPrice } from 'src/utils/formatters';
import { MAX_SPECIAL_INSTRUCTION_LENGTH } from 'src/utils/constants';
import { SelectionType } from 'src/types/enums';
import QuantityStepper from 'src/components/QuantityStepper.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { MenuItem, MenuItemWithOptions } from 'src/types/database';
import type { CartItemOption } from 'src/types/cart';

const menuStore = useMenuStore();
const cartStore = useCartStore();
const { notifySuccess, notifyWarning } = useNotify();

// ─── Available Items for Randomizer ──────────────────
const availableItems = computed(() => {
  return menuStore.activeItems.filter((i) => i.is_available);
});

// ─── Spin State ──────────────────────────────────────
const isSpinning = ref(false);
const spinPhase = ref<'spinning' | 'slowing' | 'winner'>('spinning');
const currentItemDisplay = ref<MenuItem | null>(null);
const confettiCanvas = ref<HTMLCanvasElement | null>(null);
let spinTimeout: ReturnType<typeof setTimeout> | null = null;
let confettiAnimationId: number | null = null;

// ─── Result Dialog & Option Selection State ──────────
const isResultOpen = ref(false);
const isLoadingOptions = ref(false);
const selectedItemWithOptions = ref<MenuItemWithOptions | null>(null);
const quantity = ref(1);
const specialInstruction = ref('');
const selectedOptions = reactive<Record<string, string>>({});
const multiSelectedOptions = reactive<Record<string, string[]>>({});
const missingGroupIds = ref<Set<string>>(new Set());

// ─── Start Minigame ──────────────────────────────────
function startRandomizer() {
  const pool = availableItems.value;
  if (pool.length === 0) {
    notifyWarning('ขออภัย ขณะนี้ยังไม่มีเมนูพร้อมให้บริการสำหรับสุ่ม');
    return;
  }

  // Pick random winner beforehand
  const winnerIndex = Math.floor(Math.random() * pool.length);
  const winningItem = pool[winnerIndex]!;

  isSpinning.value = true;
  spinPhase.value = 'spinning';
  currentItemDisplay.value = pool[Math.floor(Math.random() * pool.length)] ?? null;

  let speed = 40; // initial rapid switch (ms)
  let elapsed = 0;
  const totalDuration = 2400; // total duration of spin before landing

  if (spinTimeout) clearTimeout(spinTimeout);

  let poolIndex = 0;
  const spinStep = () => {
    if (!isSpinning.value) return;

    poolIndex = (poolIndex + 1) % pool.length;
    currentItemDisplay.value = pool[poolIndex] ?? null;
    elapsed += speed;

    if (elapsed >= totalDuration) {
      // Land on winning item
      currentItemDisplay.value = winningItem;
      spinPhase.value = 'winner';

      // Trigger celebratory confetti
      triggerConfetti();

      // After small celebration delay, open Result Options Dialog
      setTimeout(() => {
        isSpinning.value = false;
        void openResultDialog(winningItem);
      }, 1100);
    } else {
      // Gradually slow down (easing out)
      if (elapsed > totalDuration * 0.6) {
        spinPhase.value = 'slowing';
        speed = Math.min(speed + 35, 300);
      } else if (elapsed > totalDuration * 0.3) {
        speed = Math.min(speed + 15, 120);
      }
      spinTimeout = setTimeout(spinStep, speed);
    }
  };

  spinTimeout = setTimeout(spinStep, speed);
}

// ─── Confetti Particle Effect ────────────────────────
function triggerConfetti() {
  const canvas = confettiCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvas.parentElement?.clientWidth || 320;
  canvas.height = canvas.parentElement?.clientHeight || 420;

  const particles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
  }> = [];

  const colors = ['#E05836', '#FF9F1C', '#2EC4B6', '#FFBF69', '#E71D36', '#F38151', '#FFD166'];

  for (let i = 0; i < 45; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      speedX: (Math.random() - 0.5) * 14,
      speedY: (Math.random() - 0.7) * 14,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frameCount = 0;
  const maxFrames = 60;

  function render() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.speedY += 0.4; // gravity
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - frameCount / maxFrames);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    frameCount++;
    if (frameCount < maxFrames) {
      confettiAnimationId = requestAnimationFrame(render);
    }
  }

  render();
}

// ─── Open Result & Option Selection Dialog ───────────
async function openResultDialog(baseItem: MenuItem) {
  // Reset form
  quantity.value = 1;
  specialInstruction.value = '';
  Object.keys(selectedOptions).forEach((k) => delete selectedOptions[k]);
  Object.keys(multiSelectedOptions).forEach((k) => delete multiSelectedOptions[k]);
  missingGroupIds.value = new Set();

  isResultOpen.value = true;
  isLoadingOptions.value = true;

  const fullItem = await menuStore.fetchItemWithOptions(baseItem.id);
  selectedItemWithOptions.value = fullItem;
  isLoadingOptions.value = false;

  if (fullItem) {
    for (const group of fullItem.option_groups) {
      if (group.selection_type === SelectionType.MULTI) {
        multiSelectedOptions[group.id] = [];
      }
    }
  }
}

function toggleSingleOption(
  group: { id: string; is_required: boolean },
  optId: string,
  isAvailable: boolean,
) {
  if (!isAvailable) return;

  if (selectedOptions[group.id] === optId) {
    if (!group.is_required) {
      delete selectedOptions[group.id];
    }
  } else {
    selectedOptions[group.id] = optId;
  }

  if (selectedOptions[group.id]) {
    missingGroupIds.value.delete(group.id);
  }
}

function toggleMultiOption(
  groupId: string,
  optId: string,
  maxSelections: number | null,
  isAvailable: boolean,
) {
  if (!isAvailable) return;
  const current = multiSelectedOptions[groupId] || [];
  const idx = current.indexOf(optId);

  if (idx > -1) {
    current.splice(idx, 1);
  } else {
    if (maxSelections === null || current.length < maxSelections) {
      current.push(optId);
    }
  }
  multiSelectedOptions[groupId] = [...current];

  const group = selectedItemWithOptions.value?.option_groups.find((g) => g.id === groupId);
  if (group) {
    const min = group.min_selections || 1;
    if (multiSelectedOptions[groupId].length >= min) {
      missingGroupIds.value.delete(groupId);
    }
  }
}

const optionsTotal = computed(() => {
  if (!selectedItemWithOptions.value) return 0;
  let total = 0;

  for (const group of selectedItemWithOptions.value.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && selectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === selectedOptions[group.id]);
      if (opt) total += opt.price_adjustment;
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = multiSelectedOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) total += opt.price_adjustment;
      }
    }
  }

  return total;
});

const itemTotal = computed(() => {
  if (!selectedItemWithOptions.value) return 0;
  return (selectedItemWithOptions.value.base_price + optionsTotal.value) * quantity.value;
});

function collectSelectedOptions(): CartItemOption[] {
  if (!selectedItemWithOptions.value) return [];
  const result: CartItemOption[] = [];

  for (const group of selectedItemWithOptions.value.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && selectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === selectedOptions[group.id]);
      if (opt) {
        result.push({
          option_id: opt.id,
          option_group_id: group.id,
          name: opt.name,
          group_name: group.name,
          price_adjustment: opt.price_adjustment,
        });
      }
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = multiSelectedOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          result.push({
            option_id: opt.id,
            option_group_id: group.id,
            name: opt.name,
            group_name: group.name,
            price_adjustment: opt.price_adjustment,
          });
        }
      }
    }
  }

  return result;
}

function validateOptions(): { isValid: boolean; missingGroups: { id: string; name: string }[] } {
  if (!selectedItemWithOptions.value) return { isValid: false, missingGroups: [] };

  const missing: { id: string; name: string }[] = [];

  for (const group of selectedItemWithOptions.value.option_groups) {
    if (group.is_required) {
      if (group.selection_type === SelectionType.SINGLE) {
        if (!selectedOptions[group.id]) {
          missing.push({ id: group.id, name: group.name });
        }
      } else if (group.selection_type === SelectionType.MULTI) {
        const selected = multiSelectedOptions[group.id] ?? [];
        const min = group.min_selections || 1;
        if (selected.length < min) {
          missing.push({ id: group.id, name: group.name });
        }
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missingGroups: missing,
  };
}

function addToCart() {
  if (!selectedItemWithOptions.value) return;

  const validation = validateOptions();
  if (!validation.isValid) {
    const newMissingSet = new Set<string>();
    validation.missingGroups.forEach((g) => newMissingSet.add(g.id));
    missingGroupIds.value = newMissingSet;

    if (validation.missingGroups.length === 1) {
      notifyWarning(`กรุณาเลือก "${validation.missingGroups[0]?.name}" ก่อนเพิ่มลงในตะกร้า`);
    } else {
      const names = validation.missingGroups.map((g) => g.name).join(', ');
      notifyWarning(`กรุณาเลือกตัวเลือกที่จำเป็น: ${names}`);
    }

    const firstMissing = validation.missingGroups[0];
    if (firstMissing) {
      const el = document.getElementById(`random-group-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  cartStore.addItem(
    selectedItemWithOptions.value.id,
    selectedItemWithOptions.value.name,
    selectedItemWithOptions.value.base_price,
    selectedItemWithOptions.value.image_url,
    quantity.value,
    specialInstruction.value,
    collectSelectedOptions(),
  );

  notifySuccess(`เพิ่ม "${selectedItemWithOptions.value.name}" ลงในตะกร้าแล้ว`);
  closeResultDialog();
}

function reSpin() {
  closeResultDialog();
  setTimeout(() => {
    startRandomizer();
  }, 200);
}

function closeResultDialog() {
  isResultOpen.value = false;
}

onUnmounted(() => {
  if (spinTimeout) clearTimeout(spinTimeout);
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
});
</script>

<style scoped>
.random-menu-container {
  width: 100%;
}

/* ─── Hero Banner ────────────────────────────────── */
.hero-banner {
  position: relative;
  background: linear-gradient(135deg, #ff6b4a 0%, #e05836 45%, #b93717 100%);
  border-radius: var(--radius-lg);
  color: #ffffff;
  padding: 24px 20px 20px;
  margin: 14px 16px 8px;
  overflow: hidden;
  box-shadow:
    0 10px 30px -6px rgba(224, 88, 54, 0.35),
    0 4px 12px -2px rgba(45, 35, 30, 0.1);
}

/* Floating emojis background decoration */
.hero-background-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.floating-emoji {
  position: absolute;
  font-size: 24px;
  opacity: 0.18;
  filter: blur(0.3px);
  user-select: none;
  animation: floatEmoji 6s ease-in-out infinite alternate;
}

.e-1 {
  top: 10%;
  left: 8%;
  animation-duration: 5s;
}
.e-2 {
  bottom: 15%;
  left: 20%;
  animation-duration: 7s;
}
.e-3 {
  top: 18%;
  right: 12%;
  animation-duration: 6.5s;
}
.e-4 {
  bottom: 20%;
  right: 22%;
  animation-duration: 4.5s;
}
.e-5 {
  top: 48%;
  right: 6%;
  font-size: 28px;
  opacity: 0.22;
  animation-duration: 5.5s;
}
.e-6 {
  bottom: 8%;
  right: 42%;
  animation-duration: 8s;
}

@keyframes floatEmoji {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  100% {
    transform: translateY(-12px) rotate(14deg);
  }
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.hero-title {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.dice-bounce {
  display: inline-block;
  animation: diceWiggle 3s ease-in-out infinite;
}

@keyframes diceWiggle {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  10%,
  20% {
    transform: rotate(-15deg) scale(1.15);
  }
  30%,
  40% {
    transform: rotate(15deg) scale(1.15);
  }
  50% {
    transform: rotate(0deg) scale(1);
  }
}

.hero-desc {
  font-size: 0.88rem;
  line-height: 1.4;
  opacity: 0.92;
  margin: 0 0 16px;
  max-width: 90%;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.spin-trigger-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  color: var(--color-primary);
  border: none;
  outline: none;
  font-family: var(--app-font-family);
  font-size: 1rem;
  font-weight: 700;
  padding: 10px 22px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.spin-trigger-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.spin-trigger-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

.spin-trigger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-btn-icon {
  font-size: 1.25rem;
}

.spin-btn-shine {
  position: absolute;
  top: -50%;
  left: -60%;
  width: 40%;
  height: 200%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: rotate(25deg);
  animation: shineSweep 4s infinite ease-in-out;
}

@keyframes shineSweep {
  0%,
  60% {
    left: -60%;
  }
  100% {
    left: 140%;
  }
}

.hero-meta-tag {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.15);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

/* ─── Spin Dialog ────────────────────────────────── */
.spin-card {
  position: relative;
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: 24px 20px 20px;
  width: 90vw;
  max-width: 380px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(45, 35, 30, 0.25);
}

.confetti-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.spin-status-badge {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-subtle);
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  font-size: 0.95rem;
  border: 1px solid var(--color-border);
}

.bounce-anim {
  animation: bounceWinner 0.6s infinite alternate;
}

@keyframes bounceWinner {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.25);
  }
}

.slot-reel-wrapper {
  margin-top: 18px;
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.slot-reel--winner {
  border-color: #f59e0b;
  box-shadow: 0 0 24px rgba(245, 158, 11, 0.35);
  transform: scale(1.02);
}

.slot-image-box {
  position: relative;
  width: 130px;
  height: 130px;
  margin: 0 auto 12px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.slot-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slot-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff8f5;
}

.winner-glow-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #f59e0b;
  border-radius: var(--radius-md);
  animation: pulseGlow 1.2s infinite;
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
}

.slot-item-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-primary);
  min-height: 28px;
  line-height: 1.3;
}

.name-reveal {
  color: var(--color-primary);
  transform: scale(1.06);
  transition: transform 0.25s ease;
}

.slot-item-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 4px;
}

/* ─── Result Options Dialog ──────────────────────── */
.result-card {
  max-width: 600px;
  margin: 0 auto;
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  height: 90vh;
  max-height: 90vh;
}

.dialog-header-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.congrats-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff3ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.result-content-scroll {
  flex: 1;
  overflow-y: auto;
}

.result-dish-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-subtle);
}

.dish-img-wrapper {
  position: relative;
  width: 100%;
  height: 180px;
  background: var(--color-surface-subtle);
  overflow: hidden;
}

.dish-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lucky-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  background: rgba(224, 88, 54, 0.92);
  backdrop-filter: blur(4px);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.76rem;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.dish-title {
  font-size: 1.2rem;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.dish-price {
  font-size: 1.25rem;
  white-space: nowrap;
}

.dish-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* Option Groups */
.option-group-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.option-group-card--error {
  border: 1.5px solid #ef4444 !important;
  background-color: #fffaf9 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
  animation: shake-error 0.35s ease-in-out;
}

@keyframes shake-error {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}

.group-validation-error {
  display: flex;
  align-items: center;
  color: #dc2626;
  font-size: 0.82rem;
  font-weight: 600;
  background: #fee2e2;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
}

.option-group-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.group-tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-weight: 600;
}

.group-tag--required {
  background: #fee2e2;
  color: #dc2626;
}

.group-tag--optional {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}

.option-group-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-row:hover:not(.option-row--disabled) {
  border-color: var(--color-primary-tint);
  background: #ffffff;
}

.option-row--selected {
  border-color: var(--color-primary);
  background: #fff8f5;
}

.option-row--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.option-name {
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.option-price-adjust {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.quantity-section {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

/* Sticky Footer */
.result-sticky-footer {
  position: sticky;
  bottom: 0;
  background: #ffffff;
  border-top: 1px solid var(--color-border);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.spin-again-btn {
  height: 44px;
  border-radius: var(--radius-pill);
}

.add-cart-btn {
  height: 44px;
  border-radius: var(--radius-pill);
}

.pointer-events-none {
  pointer-events: none;
}
</style>
