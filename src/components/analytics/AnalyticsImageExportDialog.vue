<template>
  <q-dialog
    :model-value="modelValue"
    :persistent="phase === 'loading'"
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="onDialogToggle"
  >
    <q-card class="export-card">
      <q-card-section class="row items-start justify-between q-pb-sm">
        <div>
          <div class="export-title">ส่งออกรายงานเป็นรูป</div>
          <div class="export-subtitle">
            เลือกช่วงวันที่ก่อนสร้างรูป เพื่อดูแต่ละวันว่าเวลาไหนลูกค้าเยอะ และมีกี่คิว
          </div>
        </div>
        <q-btn
          v-if="phase !== 'loading'"
          icon="close"
          flat
          round
          dense
          aria-label="ปิด"
          @click="closeDialog"
        />
      </q-card-section>

      <q-card-section v-if="phase === 'pick'" class="q-pt-none">
        <div class="row items-center q-gutter-sm date-row">
          <q-input
            v-model="draftFrom"
            outlined
            dense
            type="date"
            label="ตั้งแต่วันที่"
            class="date-input"
          />
          <span class="text-muted">ถึง</span>
          <q-input
            v-model="draftTo"
            outlined
            dense
            type="date"
            label="ถึงวันที่"
            class="date-input"
          />
        </div>
        <div class="filter-note">ใช้ตัวกรองวันในสัปดาห์ที่เลือกไว้บนหน้า: {{ dayFilterLabel }}</div>
        <div v-if="dateError" class="date-error">{{ dateError }}</div>
        <div class="text-caption text-muted q-mt-sm">
          ช่วงหลายเดือนจะได้หนึ่งรูปต่อหนึ่งเดือน สามารถแชร์หรือบันทึกทั้งชุดได้
        </div>
      </q-card-section>

      <q-card-section v-else-if="phase === 'loading'" class="loader-stage">
        <div
          class="loader-orbit"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="pulse pulse-a"></span>
          <span class="pulse pulse-b"></span>
          <svg class="progress-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="ring-track" cx="60" cy="60" r="52" />
            <circle
              class="ring-value"
              cx="60"
              cy="60"
              r="52"
              :style="{ strokeDashoffset: dashOffset }"
            />
          </svg>
          <div class="inner-spin" aria-hidden="true"></div>
          <div class="loader-percent">{{ percent }}<span>%</span></div>
        </div>
        <div :key="statusLabel" class="loader-status">{{ statusLabel }}</div>
        <q-btn flat no-caps color="grey-8" label="ยกเลิก" class="q-mt-md" @click="cancelExport" />
      </q-card-section>

      <q-card-section v-else class="q-pt-none">
        <div class="preview-count">ได้ {{ images.length }} รูป</div>
        <div class="preview-scroller">
          <figure v-for="image in images" :key="image.monthKey" class="preview-figure">
            <figcaption>{{ image.monthName }}</figcaption>
            <img :src="image.previewUrl" :alt="`รายงานวิเคราะห์ ${image.monthName}`" />
          </figure>
        </div>
      </q-card-section>

      <q-card-actions v-if="phase === 'pick'" align="right" class="q-px-md q-pb-md">
        <q-btn flat no-caps color="grey-8" label="ปิด" @click="closeDialog" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="image"
          label="สร้างรายงาน"
          @click="startExport"
        />
      </q-card-actions>

      <q-card-actions v-else-if="phase === 'preview'" align="right" class="q-px-md q-pb-md">
        <q-btn flat no-caps color="grey-8" label="ปิด" @click="closeDialog" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="ios_share"
          label="แชร์หรือบันทึกรูป"
          :loading="isSharing"
          @click="shareImages"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { fetchRestaurant } from 'src/services/restaurantService';
import {
  AnalyticsExportCancelled,
  fetchDailyTrafficForExport,
  fetchFullSalesAnalytics,
  formatBangkokDateKey,
  type MealPeriodSummary,
} from 'src/services/salesAnalyticsService';
import {
  renderAnalyticsReport,
  revokeReportPreviews,
  shareAnalyticsImages,
  type AnalyticsReportImage,
} from 'src/utils/renderAnalyticsReport';
import { useNotify } from 'src/composables/useNotify';

const props = defineProps<{
  modelValue: boolean;
  dateFrom: string;
  dateTo: string;
  dayFilter: string;
  dayFilterLabel: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { notifyError, notifySuccess } = useNotify();

const RING_LENGTH = 2 * Math.PI * 52;

type ExportPhase = 'pick' | 'loading' | 'preview';

const phase = ref<ExportPhase>('pick');
const draftFrom = ref(props.dateFrom);
const draftTo = ref(props.dateTo);
const dateError = ref('');
const percent = ref(0);
const statusLabel = ref('กำลังเตรียมรายงาน');
const images = ref<AnalyticsReportImage[]>([]);
const isSharing = ref(false);

let abortController: AbortController | null = null;
let runToken = 0;

const dashOffset = computed(
  () => RING_LENGTH * (1 - Math.min(100, Math.max(0, percent.value)) / 100),
);

function parseLocalDate(dateStr: string, isEndOfDay = false): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  const day = parts[2] || new Date().getDate();
  if (isEndOfDay) return new Date(year, month - 1, day, 23, 59, 59, 999);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function clearPreviews(): void {
  revokeReportPreviews(images.value);
  images.value = [];
}

function stopExport(): void {
  runToken += 1;
  abortController?.abort();
  abortController = null;
}

function closeDialog(): void {
  stopExport();
  clearPreviews();
  phase.value = 'pick';
  emit('update:modelValue', false);
}

function onDialogToggle(open: boolean): void {
  if (!open) closeDialog();
}

function cancelExport(): void {
  stopExport();
  phase.value = 'pick';
  percent.value = 0;
  statusLabel.value = 'กำลังเตรียมรายงาน';
}

function validateDates(): string {
  if (!draftFrom.value || !draftTo.value) return 'เลือกวันเริ่มต้นและวันสิ้นสุดก่อนสร้างรายงาน';
  if (draftFrom.value > draftTo.value) return 'วันเริ่มต้นต้องไม่เกินวันสิ้นสุด';
  return '';
}

function bestMeal(periods: MealPeriodSummary[]): MealPeriodSummary | null {
  const ranked = [...periods].sort((a, b) => {
    if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
    return b.orderCount - a.orderCount;
  });
  return ranked.find((period) => period.totalSales > 0 || period.orderCount > 0) ?? null;
}

function rangeLabel(): string {
  const start = formatBangkokDateKey(draftFrom.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (draftFrom.value === draftTo.value) return start;
  const end = formatBangkokDateKey(draftTo.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

async function startExport(): Promise<void> {
  const validation = validateDates();
  dateError.value = validation;
  if (validation) return;

  stopExport();
  clearPreviews();
  const token = runToken;
  const controller = new AbortController();
  abortController = controller;
  phase.value = 'loading';
  percent.value = 4;
  statusLabel.value = 'กำลังสรุปยอดขาย';

  try {
    const fromDate = parseLocalDate(draftFrom.value, false);
    const toDate = parseLocalDate(draftTo.value, true);
    const [analytics, restaurant] = await Promise.all([
      fetchFullSalesAnalytics(fromDate, toDate, props.dayFilter, controller.signal),
      fetchRestaurant().catch(() => null),
    ]);
    if (token !== runToken) return;

    percent.value = 20;
    statusLabel.value = 'กำลังนับรายการในช่วงที่เลือก';
    const months = await fetchDailyTrafficForExport({
      startDate: fromDate,
      endDate: toDate,
      dayFilter: props.dayFilter,
      signal: controller.signal,
      onProgress: (progress) => {
        if (token !== runToken) return;
        statusLabel.value = progress.label;
        if (progress.total <= 0) {
          percent.value = Math.max(percent.value, 22);
          return;
        }
        const ratio = Math.min(progress.loaded, progress.total) / progress.total;
        percent.value = 20 + Math.round(ratio * 55);
      },
    });
    if (token !== runToken) return;

    if (months.length === 0) {
      phase.value = 'pick';
      notifyError({
        title: 'ไม่มีข้อมูลสำหรับส่งออก',
        message: 'ไม่มีออเดอร์หรือบิลในช่วงวันที่และตัวกรองที่เลือก',
      });
      return;
    }

    percent.value = 75;
    const rendered = await renderAnalyticsReport({
      restaurantName: restaurant?.name || 'DEMO Bang saen',
      rangeLabel: rangeLabel(),
      generatedAtLabel: new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      months,
      rangeSummary: {
        bestMeal: bestMeal(analytics.mealPeriods),
        topItems: analytics.topSellingItems.slice(0, 3),
      },
      signal: controller.signal,
      onProgress: ({ index, total, monthName }) => {
        if (token !== runToken) return;
        percent.value = 75 + Math.round((index / Math.max(total, 1)) * 25);
        statusLabel.value = `กำลังวาดรายงานเดือน${monthName}`;
      },
    });
    if (token !== runToken) {
      revokeReportPreviews(rendered);
      return;
    }

    percent.value = 100;
    statusLabel.value = 'รายงานพร้อมแล้ว';
    images.value = rendered;
    phase.value = 'preview';
  } catch (error) {
    if (token !== runToken) return;
    if (error instanceof AnalyticsExportCancelled) {
      phase.value = 'pick';
      return;
    }
    console.error('Analytics image export failed:', error);
    phase.value = 'pick';
    notifyError({
      title: 'สร้างรายงานไม่สำเร็จ',
      message: error instanceof Error ? error.message : 'ไม่สามารถสร้างรูปบทวิเคราะห์ได้',
    });
  } finally {
    if (abortController === controller) abortController = null;
  }
}

async function shareImages(): Promise<void> {
  if (isSharing.value || images.value.length === 0) return;
  isSharing.value = true;
  try {
    const result = await shareAnalyticsImages(images.value);
    if (result === 'cancelled') return;
    notifySuccess({
      title: result === 'shared' ? 'แชร์รายงานแล้ว' : 'บันทึกรูปแล้ว',
      message:
        result === 'shared'
          ? `ส่งรูป ${images.value.length} ไฟล์ออกจากเครื่องนี้ได้แล้ว`
          : `ดาวน์โหลดรูป ${images.value.length} ไฟล์แล้ว`,
    });
  } catch (error) {
    notifyError({
      title: 'แชร์รูปไม่สำเร็จ',
      message: error instanceof Error ? error.message : 'ไม่สามารถแชร์หรือบันทึกรูปได้',
    });
  } finally {
    isSharing.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    draftFrom.value = props.dateFrom;
    draftTo.value = props.dateTo;
    dateError.value = '';
    percent.value = 0;
    statusLabel.value = 'กำลังเตรียมรายงาน';
    phase.value = 'pick';
    clearPreviews();
  },
);

onBeforeUnmount(() => {
  stopExport();
  clearPreviews();
});
</script>

<style scoped>
.export-card {
  width: 440px;
  max-width: 94vw;
  border-radius: 24px;
  background: #ffffff;
}

.export-title {
  color: var(--color-text-primary, #2d231e);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
}

.export-subtitle,
.text-muted,
.filter-note {
  color: var(--color-text-secondary, #7a6e65);
}

.export-subtitle {
  margin-top: 4px;
  font-size: 0.82rem;
  line-height: 1.45;
}

.date-row {
  flex-wrap: wrap;
}

.date-input {
  width: 168px;
  background: #ffffff;
}

.filter-note {
  margin-top: 12px;
  font-size: 0.82rem;
  line-height: 1.45;
}

.date-error {
  margin-top: 8px;
  color: #b42318;
  font-size: 0.82rem;
  font-weight: 600;
}

.loader-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px 28px;
}

.loader-orbit {
  position: relative;
  width: 176px;
  height: 176px;
  display: grid;
  place-items: center;
}

.pulse,
.progress-ring,
.inner-spin,
.loader-percent {
  position: absolute;
}

.pulse {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 1px solid var(--color-primary, #e05836);
  opacity: 0;
  animation: export-pulse 2.4s ease-out infinite;
}

.pulse-b {
  animation-delay: 1.2s;
}

.progress-ring {
  width: 132px;
  height: 132px;
}

.ring-track,
.ring-value {
  fill: none;
  stroke-width: 8;
}

.ring-track {
  stroke: var(--color-primary-tint, #ffe6dc);
}

.ring-value {
  stroke: var(--color-primary, #e05836);
  stroke-linecap: round;
  stroke-dasharray: 326.726;
  transform: rotate(-90deg);
  transform-origin: 60px 60px;
  transition: stroke-dashoffset 0.35s ease;
}

.inner-spin {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--color-primary, #e05836);
  border-right-color: rgba(224, 88, 54, 0.2);
  opacity: 0.7;
  animation: export-spin 1.8s linear infinite;
}

.loader-percent {
  color: var(--color-text-primary, #2d231e);
  font-size: 1.65rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.loader-percent span {
  margin-left: 1px;
  font-size: 0.9rem;
}

.loader-status {
  margin-top: 18px;
  max-width: 320px;
  color: var(--color-text-primary, #2d231e);
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.45;
  animation: status-in 0.35s ease;
}

.preview-count {
  margin-bottom: 10px;
  color: var(--color-text-secondary, #7a6e65);
  font-size: 0.82rem;
  font-weight: 600;
}

.preview-scroller {
  max-height: min(62vh, 640px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-figure {
  margin: 0;
}

.preview-figure figcaption {
  margin-bottom: 6px;
  color: var(--color-text-primary, #2d231e);
  font-weight: 700;
}

.preview-figure img {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--color-border, #ede5dc);
  background: var(--color-background, #fbf9f6);
}

@keyframes export-pulse {
  0% {
    transform: scale(0.86);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.38);
    opacity: 0;
  }
}

@keyframes export-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes status-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
