<template>
  <div class="random-menu-container">
    <!-- ─── Hero Section Banner (Compact Apple Luminous) ─── -->
    <div class="hero-banner" role="button" tabindex="0" @click="startRandomizer">
      <!-- Ambient Luminous Glow -->
      <div class="ambient-glow" aria-hidden="true"></div>

      <div class="hero-top-row">
        <!-- Content Column -->
        <div class="hero-text-col">
          <div class="hero-badge">
            <span class="badge-sparkle">✨</span>
            <span>คิดไม่ออก? ให้เราช่วยเลือก</span>
          </div>

          <h3 class="hero-title">สุ่มเมนูเด็ดวันนี้</h3>

          <p class="hero-desc">แตะเพื่อสุ่มจานโปรดพร้อมเสิร์ฟความอร่อยทันที!</p>
        </div>

        <!-- 3D Interactive Lucky Orb Visual (Compact) -->
        <div class="hero-visual" aria-hidden="true">
          <div class="visual-orb">
            <div class="orb-ring ring-1"></div>
            <div class="orb-ring ring-2"></div>
            <div class="orb-core">
              <span class="core-dice">🎲</span>
              <span class="micro-badge mb-1">🍜</span>
              <span class="micro-badge mb-2">✨</span>
            </div>
            <div class="visual-glow"></div>
          </div>
        </div>
      </div>

      <!-- Action Row: Side-by-side Button & Live Badge -->
      <div class="hero-actions-row" @click.stop>
        <button
          class="spin-trigger-btn"
          :disabled="availableItems.length === 0"
          @click="startRandomizer"
        >
          <span class="spin-btn-icon">🎲</span>
          <span class="spin-btn-text">สุ่มเมนูอาหารเลย!</span>
          <span class="spin-btn-shine"></span>
        </button>

        <div class="hero-live-badge">
          <span class="live-dot"></span>
          <span
            >มี <strong>{{ availableItems.length }}</strong> เมนูพร้อมสุ่ม</span
          >
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
            <q-icon v-else name="auto_awesome" color="primary" size="20px" class="bounce-anim" />
            <span class="q-ml-sm">
              {{ spinPhase === 'winner' ? 'ได้เมนูนี้แล้ว!' : 'กำลังสุ่มเมนูเด็ด...' }}
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
                <q-icon name="restaurant" size="52px" color="grey-4" />
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

        <div class="spin-footer-hint text-caption q-mt-md">
          <template v-if="spinPhase === 'spinning'"> กำลังค้นหาเมนูที่ใช่สำหรับคุณ... </template>
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
        <!-- Dialog Top Bar with Sheet Grabber -->
        <div class="dialog-header-sticky">
          <div class="sheet-grabber-bar" aria-hidden="true">
            <span class="grabber-pill"></span>
          </div>
          <div class="row items-center justify-between no-wrap">
            <div class="row items-center no-wrap ellipsis">
              <div class="congrats-icon-box q-mr-sm">
                <span>✨</span>
              </div>
              <div class="ellipsis">
                <div class="result-header-title">เมนูที่คุณสุ่มได้</div>
                <div class="result-header-subtitle">
                  เลือกตัวเลือกตามต้องการแล้วเพิ่มลงตะกร้าได้ทันที
                </div>
              </div>
            </div>
            <q-btn
              flat
              round
              dense
              icon="close"
              class="close-dialog-btn q-ml-sm"
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
                <q-icon name="auto_awesome" size="13px" class="q-mr-xs" />
                <span>เมนูนำโชคของคุณ</span>
              </div>
            </div>

            <div class="dish-details q-pa-md">
              <div class="row justify-between items-start no-wrap">
                <div class="dish-title">{{ selectedItemWithOptions.name }}</div>
                <div class="dish-price q-ml-sm">
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
              :class="{
                'option-group-card--error': missingGroupIds.has(group.id),
                'option-group-card--takeaway-locked':
                  isTakeawaySession && isDiningOptionGroup(group.name),
              }"
            >
              <div class="row items-center justify-between q-mb-xs">
                <div class="option-group-name row items-center no-wrap">
                  <q-icon
                    v-if="isTakeawaySession && isDiningOptionGroup(group.name)"
                    name="lock"
                    size="16px"
                    class="q-mr-xs text-orange-9"
                  />
                  <span>{{ group.name }}</span>
                </div>
                <span
                  v-if="isTakeawaySession && isDiningOptionGroup(group.name)"
                  class="group-tag group-tag--takeaway-locked"
                >
                  <q-icon name="lock" size="12px" class="q-mr-xs" />
                  สั่งกลับบ้าน (ล็อกอัตโนมัติ)
                </span>
                <span
                  v-else
                  class="group-tag"
                  :class="group.is_required ? 'group-tag--required' : 'group-tag--optional'"
                >
                  {{ group.is_required ? 'ต้องเลือก' : 'เลือกเพิ่มได้' }}
                </span>
              </div>

              <div class="option-group-hint q-mb-sm">
                <template v-if="isTakeawaySession && isDiningOptionGroup(group.name)">
                  <span class="text-orange-9 text-weight-medium">
                    สแกนจากจุดบริการสั่งกลับบ้าน ระบบล็อกตัวเลือกนี้เป็นสั่งกลับบ้านโดยอัตโนมัติ
                  </span>
                </template>
                <template v-else-if="group.selection_type === 'single'">เลือกได้ 1 รายการ</template>
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
                    'option-row--disabled':
                      !isOptionEffectivelyAvailable(opt) ||
                      (isTakeawaySession &&
                        isDiningOptionGroup(group.name) &&
                        !isTakeawayOption(opt.name)),
                    'option-row--locked':
                      isTakeawaySession &&
                      isDiningOptionGroup(group.name) &&
                      isTakeawayOption(opt.name),
                  }"
                  @click="toggleSingleOption(group, opt.id, isOptionEffectivelyAvailable(opt))"
                >
                  <div class="row items-center">
                    <q-radio
                      :model-value="selectedOptions[group.id]"
                      :val="opt.id"
                      :disable="
                        !isOptionEffectivelyAvailable(opt) ||
                        (isTakeawaySession && isDiningOptionGroup(group.name))
                      "
                      color="primary"
                      dense
                      class="q-mr-sm pointer-events-none"
                    />
                    <span
                      class="option-name"
                      :class="{
                        'text-grey-6':
                          !isOptionEffectivelyAvailable(opt) ||
                          (isTakeawaySession &&
                            isDiningOptionGroup(group.name) &&
                            !isTakeawayOption(opt.name)),
                      }"
                    >
                      {{ opt.name }}
                    </span>
                    <span
                      v-if="!isOptionEffectivelyAvailable(opt)"
                      class="opt-sold-out-chip q-ml-sm"
                    >
                      หมด
                    </span>
                    <span
                      v-else-if="
                        isTakeawaySession &&
                        isDiningOptionGroup(group.name) &&
                        isTakeawayOption(opt.name)
                      "
                      class="opt-locked-chip q-ml-sm"
                    >
                      <q-icon name="lock" size="10px" class="q-mr-xs" />ล็อกตาม QR
                    </span>
                  </div>
                  <div class="option-price-adjust">
                    <span v-if="!isOptionEffectivelyAvailable(opt)" class="text-caption text-grey-5"
                      >หมดชั่วคราว</span
                    >
                    <span
                      v-else-if="
                        isTakeawaySession &&
                        isDiningOptionGroup(group.name) &&
                        !isTakeawayOption(opt.name)
                      "
                      class="text-caption text-grey-5"
                    >
                      (สำหรับทานที่ร้าน)
                    </span>
                    <span v-else-if="opt.price_adjustment > 0"
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
                      !isOptionEffectivelyAvailable(opt) ||
                      (group.max_selections !== null &&
                        (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                        !multiSelectedOptions[group.id]?.includes(opt.id)),
                  }"
                  @click="
                    toggleMultiOption(
                      group.id,
                      opt.id,
                      group.max_selections,
                      isOptionEffectivelyAvailable(opt),
                    )
                  "
                >
                  <div class="row items-center">
                    <q-checkbox
                      :model-value="multiSelectedOptions[group.id]?.includes(opt.id)"
                      :disable="
                        !isOptionEffectivelyAvailable(opt) ||
                        (group.max_selections !== null &&
                          (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                          !multiSelectedOptions[group.id]?.includes(opt.id))
                      "
                      color="primary"
                      dense
                      class="q-mr-sm pointer-events-none"
                    />
                    <span
                      class="option-name"
                      :class="{ 'text-grey-6': !isOptionEffectivelyAvailable(opt) }"
                    >
                      {{ opt.name }}
                    </span>
                    <span
                      v-if="!isOptionEffectivelyAvailable(opt)"
                      class="opt-sold-out-chip q-ml-sm"
                    >
                      หมด
                    </span>
                  </div>
                  <div class="option-price-adjust">
                    <span v-if="!isOptionEffectivelyAvailable(opt)" class="text-caption text-grey-5"
                      >หมดชั่วคราว</span
                    >
                    <span v-else-if="opt.price_adjustment > 0"
                      >+{{ formatPrice(opt.price_adjustment) }}</span
                    >
                    <span v-else-if="opt.price_adjustment < 0">{{
                      formatPrice(opt.price_adjustment)
                    }}</span>
                    <span v-else class="text-grey-5">—</span>
                  </div>
                </div>
              </div>

              <!-- Alert if all options in a required group are unavailable -->
              <div
                v-if="
                  group.is_required && !group.options.some((o) => isOptionEffectivelyAvailable(o))
                "
                class="group-unavailable-alert q-mt-sm"
              >
                <q-icon name="error_outline" size="16px" class="q-mr-xs" />
                <span>ตัวเลือกที่จำเป็นในกลุ่มนี้หมดชั่วคราว ไม่สามารถสั่งเมนูนี้ได้</span>
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
              <q-btn unelevated no-caps class="full-width spin-again-btn" @click="reSpin">
                <q-icon name="refresh" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold">สุ่มใหม่</span>
              </q-btn>
            </div>

            <!-- Add to Cart Button -->
            <div class="col-8">
              <q-btn
                unelevated
                no-caps
                class="full-width add-cart-btn"
                :disable="isLoadingOptions"
                @click="addToCart"
              >
                <div class="row items-center justify-between full-width no-wrap q-px-xs">
                  <span class="text-weight-bold">เพิ่มลงตะกร้า</span>
                  <span class="add-cart-price">{{ formatPrice(itemTotal) }}</span>
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
import { useSessionStore } from 'src/stores/sessionStore';
import { isTakeawayName } from 'src/services/tableService';
import { useNotify } from 'src/composables/useNotify';
import { formatPrice, isDiningOptionGroup, isTakeawayOption } from 'src/utils/formatters';
import { isOptionAvailable } from 'src/utils/ingredientHelper';
import { MAX_SPECIAL_INSTRUCTION_LENGTH } from 'src/utils/constants';
import { SelectionType } from 'src/types/enums';
import QuantityStepper from 'src/components/QuantityStepper.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { MenuItem, MenuItemWithOptions, Option } from 'src/types/database';
import type { CartItemOption } from 'src/types/cart';

const menuStore = useMenuStore();
const cartStore = useCartStore();
const sessionStore = useSessionStore();
const { notifySuccess, notifyWarning } = useNotify();

const isTakeawaySession = computed(() => isTakeawayName(sessionStore.tableName));

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
    notifyWarning('ขออภัย ขณะนี้ยังไม่มีเมนูพร้อมให้บริการสำหรับสุ่ม', {
      title: 'ไม่มีเมนูพร้อมสุ่ม',
      caption: 'กรุณาตรวจสอบสถานะเปิดขายเมนูในร้านค้า',
    });
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

  const colors = ['#0071E3', '#34C759', '#FF9500', '#5856D6', '#AF52DE', '#FF2D55', '#5AC8FA'];

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
function isOptionEffectivelyAvailable(
  opt: Option | { name: string; is_available?: boolean },
): boolean {
  return isOptionAvailable(opt, menuStore.items);
}

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
      } else if (group.selection_type === SelectionType.SINGLE) {
        // If customer is in takeaway session, auto-select and lock the takeaway option in the dining group
        if (isDiningOptionGroup(group.name) && isTakeawaySession.value) {
          const takeawayOpt =
            group.options.find(
              (o) => isTakeawayOption(o.name) && isOptionEffectivelyAvailable(o),
            ) || group.options.find((o) => isTakeawayOption(o.name));
          if (takeawayOpt) {
            selectedOptions[group.id] = takeawayOpt.id;
            missingGroupIds.value.delete(group.id);
          }
        }
      }
    }
  }
}

function toggleSingleOption(
  group: { id: string; name?: string; is_required: boolean },
  optId: string,
  isAvailable: boolean,
) {
  if (!isAvailable) return;

  // Lock dining option group if customer is on a takeaway session
  if (isTakeawaySession.value && isDiningOptionGroup(group.name)) {
    return;
  }

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

function validateOptions(): {
  isValid: boolean;
  missingGroups: { id: string; name: string }[];
  unavailableOptionName?: string;
} {
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

    // Check if any selected option has become unavailable / sold out
    if (group.selection_type === SelectionType.SINGLE && selectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === selectedOptions[group.id]);
      if (opt && !isOptionEffectivelyAvailable(opt)) {
        return {
          isValid: false,
          missingGroups: missing,
          unavailableOptionName: opt.name,
        };
      }
    } else if (group.selection_type === SelectionType.MULTI) {
      const selected = multiSelectedOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt && !isOptionEffectivelyAvailable(opt)) {
          return {
            isValid: false,
            missingGroups: missing,
            unavailableOptionName: opt.name,
          };
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
    if (validation.unavailableOptionName) {
      notifyWarning(`ตัวเลือก "${validation.unavailableOptionName}" หมดชั่วคราว`, {
        title: 'ตัวเลือกหมดชั่วคราว',
        caption: 'กรุณาเลือกตัวเลือกอื่นที่พร้อมให้บริการ',
      });
      return;
    }

    const newMissingSet = new Set<string>();
    validation.missingGroups.forEach((g) => newMissingSet.add(g.id));
    missingGroupIds.value = newMissingSet;

    if (validation.missingGroups.length === 1) {
      notifyWarning(`กรุณาเลือก "${validation.missingGroups[0]?.name}" ก่อนเพิ่มลงในตะกร้า`, {
        title: 'กรุณาเลือกตัวเลือกที่จำเป็น',
      });
    } else {
      const names = validation.missingGroups.map((g) => g.name).join(', ');
      notifyWarning(`กรุณาเลือก: ${names}`, {
        title: 'กรุณาเลือกตัวเลือกที่จำเป็น',
        caption: 'เลือกตัวเลือกที่มีเครื่องหมายดอกจัน (*) ให้ครบถ้วน',
      });
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

  notifySuccess(`เพิ่ม "${selectedItemWithOptions.value.name}" x${quantity.value} ลงในตะกร้าแล้ว`, {
    title: 'เพิ่มลงตะกร้าแล้ว 🛒',
    caption: 'เมนูแนะนำจากการสุ่มอาหาร พร้อมสำหรับสั่งซื้อ',
    timeout: 3000,
  });
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

/* ─── Hero Banner (Compact Apple Luminous) ───────── */
.hero-banner {
  position: relative;
  background:
    radial-gradient(
      120% 120% at 100% 0%,
      rgba(0, 113, 227, 0.12) 0%,
      rgba(255, 149, 0, 0.08) 40%,
      rgba(255, 255, 255, 0) 75%
    ),
    #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(0, 113, 227, 0.16);
  color: var(--color-text-primary);
  padding: 14px 16px 13px;
  margin: 10px 16px 6px;
  overflow: hidden;
  box-shadow:
    0 6px 18px -3px rgba(0, 113, 227, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.hero-banner:hover {
  border-color: rgba(0, 113, 227, 0.28);
  box-shadow:
    0 8px 24px -4px rgba(0, 113, 227, 0.12),
    0 3px 10px rgba(0, 0, 0, 0.04);
}

.ambient-glow {
  position: absolute;
  top: -25px;
  right: -25px;
  width: 120px;
  height: 120px;
  background: radial-gradient(
    circle,
    rgba(0, 113, 227, 0.2) 0%,
    rgba(255, 149, 0, 0.15) 50%,
    transparent 75%
  );
  filter: blur(25px);
  pointer-events: none;
  z-index: 1;
}

.hero-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.hero-text-col {
  flex: 1;
  min-width: 0;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 113, 227, 0.08);
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0;
  margin-bottom: 3px;
  border: 1px solid rgba(0, 113, 227, 0.16);
  color: var(--color-primary);
}

.badge-sparkle {
  font-size: 0.78rem;
}

.hero-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 0;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-desc {
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Compact 3D Lucky Orb Visual ───────────────── */
.hero-visual {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.visual-orb {
  position: relative;
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.ring-1 {
  border: 1.5px solid transparent;
  border-top-color: rgba(0, 113, 227, 0.65);
  border-bottom-color: rgba(255, 149, 0, 0.65);
  animation: rotateRing 8s linear infinite;
}

.ring-2 {
  inset: 3px;
  border: 1px dashed rgba(0, 113, 227, 0.35);
  animation: rotateRingRev 12s linear infinite;
}

@keyframes rotateRing {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes rotateRingRev {
  0% {
    transform: rotate(360deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.orb-core {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff 0%, #f0f5ff 100%);
  border: 1px solid rgba(0, 113, 227, 0.2);
  box-shadow:
    0 4px 14px rgba(0, 113, 227, 0.16),
    inset 0 1px 4px rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: orbFloat 3.5s ease-in-out infinite alternate;
}

@keyframes orbFloat {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-2px);
  }
}

.core-dice {
  font-size: 1.45rem;
  line-height: 1;
  display: inline-block;
  animation: dicePlay 4s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
}

@keyframes dicePlay {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  15% {
    transform: rotate(-14deg) scale(1.1);
  }
  30% {
    transform: rotate(14deg) scale(1.1);
  }
  45% {
    transform: rotate(0deg) scale(1);
  }
}

.micro-badge {
  position: absolute;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid var(--color-hairline);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
}

.mb-1 {
  top: -4px;
  right: -3px;
}

.mb-2 {
  bottom: -2px;
  left: -4px;
}

.visual-glow {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0, 113, 227, 0.28) 0%,
    rgba(255, 149, 0, 0.15) 60%,
    transparent 80%
  );
  filter: blur(8px);
  z-index: -1;
  pointer-events: none;
}

/* ─── Inline Action Row (Side-by-side) ───────────── */
.hero-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  position: relative;
  z-index: 2;
}

.spin-trigger-btn {
  flex: 1;
  min-width: 0;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, #0077ed 0%, #0062cc 100%);
  color: #ffffff;
  border: none;
  outline: none;
  font-family: var(--app-font-family);
  font-size: 0.88rem;
  font-weight: 600;
  height: 38px;
  min-height: 38px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 113, 227, 0.28);
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
}

.spin-trigger-btn:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 6px 18px rgba(0, 113, 227, 0.38);
}

.spin-trigger-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.spin-trigger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-btn-icon {
  font-size: 1.05rem;
}

.spin-btn-text {
  letter-spacing: -0.01em;
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
    rgba(255, 255, 255, 0.4) 50%,
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

.hero-live-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(52, 199, 89, 0.08);
  border: 1px solid rgba(52, 199, 89, 0.22);
  color: #1e7e34;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 500;
  user-select: none;
  white-space: nowrap;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.7);
  animation: livePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes livePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(52, 199, 89, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(52, 199, 89, 0);
  }
}

/* ─── Spin Dialog (Apple Minimalist Overlay) ─────── */
.spin-dialog :deep(.q-dialog__inner) {
  padding: 16px;
}

.spin-card {
  position: relative;
  background: #ffffff;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-hairline);
  padding: 28px 20px 22px;
  width: 92vw;
  max-width: 380px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.16);
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
  padding: 6px 18px;
  border-radius: var(--radius-pill);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  border: 1px solid var(--color-hairline);
}

.bounce-anim {
  animation: bounceWinner 0.6s infinite alternate;
}

@keyframes bounceWinner {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.2);
  }
}

.slot-reel-wrapper {
  margin-top: 18px;
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: 20px 16px 16px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.slot-reel--winner {
  border-color: var(--color-primary);
  box-shadow: 0 8px 28px rgba(0, 113, 227, 0.22);
  transform: scale(1.02);
}

.slot-image-box {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 14px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--color-hairline);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
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
  background: var(--color-surface-subtle);
}

.winner-glow-ring {
  position: absolute;
  inset: 0;
  border: 3px solid var(--color-primary);
  border-radius: var(--radius-lg);
  animation: pulseGlow 1.2s infinite;
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.5);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(0, 113, 227, 0);
  }
}

.slot-item-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  min-height: 28px;
  line-height: 1.35;
}

.name-reveal {
  color: var(--color-primary);
  transform: scale(1.04);
  transition: transform 0.25s ease;
}

.slot-item-price {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.spin-footer-hint {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

/* ─── Result Options Dialog (Apple Sheet) ────────── */
.result-dialog :deep(.q-dialog__inner) {
  padding-bottom: 0 !important;
}

.result-card {
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  background: var(--color-background);
  border-top: 1px solid var(--color-hairline);
  border-left: 1px solid var(--color-hairline);
  border-right: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  height: 88vh;
  max-height: 88vh;
  box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.sheet-grabber-bar {
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
}

.grabber-pill {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-pill);
  background: #d2d2d7;
}

.dialog-header-sticky {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  padding: 10px 18px 12px;
  border-bottom: 1px solid var(--color-hairline);
}

.congrats-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-pill);
  background: #f5f5f7;
  border: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.result-header-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.25;
}

.result-header-subtitle {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.2;
  margin-top: 2px;
}

.close-dialog-btn {
  background: #f5f5f7;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-hairline);
  width: 32px;
  height: 32px;
  transition: all 0.15s ease;
}

.close-dialog-btn:hover {
  background: #e8e8ed;
}

.result-content-scroll {
  flex: 1;
  overflow-y: auto;
}

.result-dish-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-subtle);
  margin-top: 6px;
}

.dish-img-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
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
  background: var(--color-surface-subtle);
}

.lucky-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  background: rgba(0, 113, 227, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

.dish-details {
  padding: 16px 18px;
}

.dish-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.dish-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.dish-desc {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-top: 4px;
}

/* Option Groups */
.option-group-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  box-shadow: var(--shadow-subtle);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.option-group-card--error {
  border: 1.5px solid #dc2626 !important;
  background-color: #fffaf9 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12) !important;
  animation: shake-error 0.35s ease-in-out;
}

@keyframes shake-error {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-3px);
  }
  40%,
  80% {
    transform: translateX(3px);
  }
}

.group-validation-error {
  display: flex;
  align-items: center;
  color: #dc2626;
  font-size: 0.82rem;
  font-weight: 600;
  background: #fee2e2;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
}

.option-group-name {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.group-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.group-tag--required {
  background: #fff7ed;
  color: #b64400;
  border: 1px solid #fed7aa;
}

.group-tag--optional {
  background: var(--color-surface-footer);
  color: var(--color-text-muted);
}

.group-tag--takeaway-locked {
  background: #fff7ed;
  color: #b64400;
  border: 1px solid #fed7aa;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.opt-locked-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #b64400;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  padding: 1px 6px;
  border-radius: 4px;
}

.option-group-card--takeaway-locked {
  border-left: 3.5px solid #b64400 !important;
  background: #fffdfa;
}

.option-row--locked {
  background: #fff7ed !important;
  border-color: #fed7aa !important;
  cursor: default !important;
}

.option-group-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-row:hover:not(.option-row--disabled) {
  background: #ffffff;
  border-color: var(--color-hairline);
}

.option-row--selected {
  background: var(--color-primary-soft) !important;
  border-color: var(--color-primary) !important;
}

.option-row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-row :deep(.q-radio),
.option-row :deep(.q-checkbox) {
  pointer-events: none;
}

.option-name {
  font-size: 0.92rem;
  color: var(--color-text-primary);
}

.opt-sold-out-chip {
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
}

.group-unavailable-alert {
  display: flex;
  align-items: center;
  background: #fef2f2;
  color: #b91c1c;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.option-price-adjust {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.special-input :deep(.q-field__control) {
  border-radius: var(--radius-md);
}

.quantity-section {
  background: #ffffff;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  box-shadow: var(--shadow-subtle);
}

/* Sticky Footer */
.result-sticky-footer {
  position: sticky;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 1px solid var(--color-hairline);
  padding: 12px 18px calc(14px + env(safe-area-inset-bottom));
  z-index: 20;
}

.spin-again-btn {
  height: 48px;
  border-radius: var(--radius-pill);
  background: #f5f5f7 !important;
  color: var(--color-text-primary) !important;
  border: 1px solid var(--color-hairline) !important;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.spin-again-btn:hover {
  background: #e8e8ed !important;
}

.spin-again-btn:active {
  transform: scale(0.98);
}

.add-cart-btn {
  height: 48px;
  border-radius: var(--radius-pill);
  background: var(--color-primary) !important;
  color: #ffffff !important;
  font-size: 0.98rem;
  box-shadow: 0 6px 20px rgba(0, 113, 227, 0.32);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.add-cart-btn:hover:not(:disabled) {
  background: var(--color-primary-hover) !important;
  box-shadow: 0 8px 24px rgba(0, 113, 227, 0.4);
}

.add-cart-btn:active {
  transform: scale(0.98);
}

.add-cart-price {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pointer-events-none {
  pointer-events: none;
}
</style>
