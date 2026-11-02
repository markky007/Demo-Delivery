import { formatPrice } from 'src/utils/formatters';
import {
  AnalyticsExportCancelled,
  type MealPeriodSummary,
  type MenuItemPerformance,
  type MonthlyTrafficReport,
} from 'src/services/salesAnalyticsService';

export interface AnalyticsReportImage {
  monthKey: string;
  monthName: string;
  fileName: string;
  blob: Blob;
  previewUrl: string;
}

export interface AnalyticsReportRangeSummary {
  bestMeal: MealPeriodSummary | null;
  topItems: Pick<MenuItemPerformance, 'name' | 'quantitySold' | 'totalRevenue'>[];
}

export type ShareAnalyticsResult = 'shared' | 'downloaded' | 'cancelled';

interface ReportPalette {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  primarySoft: string;
  border: string;
  font: string;
}

const WIDTH = 1080;
const MAX_HEIGHT = 4096;
const MARGIN = 32;

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AnalyticsExportCancelled();
}

async function resolveReportFont(): Promise<string> {
  const preferred = '"LINE Seed Sans TH"';
  if (!document.fonts) return preferred;
  try {
    await document.fonts.load(`400 32px ${preferred}`);
    await document.fonts.load(`700 64px ${preferred}`);
    if (document.fonts.check(`400 32px ${preferred}`)) return preferred;
  } catch {
    // The system Thai font stack below still draws the report.
  }
  return '"Sukhumvit Set", "Thonburi", "Noto Sans Thai", sans-serif';
}

function readPalette(font: string): ReportPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    background: token('--color-background', '#fbf9f6'),
    surface: token('--color-surface', '#ffffff'),
    ink: token('--color-text-primary', '#2d231e'),
    muted: token('--color-text-secondary', '#7a6e65'),
    primary: token('--color-primary', '#e05836'),
    primarySoft: token('--color-primary-soft', '#fff3ed'),
    border: token('--color-border', '#ede5dc'),
    font,
  };
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, font: string): void {
  ctx.font = `${weight} ${size}px ${font}`;
}

function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color;
  traceRoundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function countText(value: number, unit: string): string {
  return `${value.toLocaleString('th-TH')} ${unit}`;
}

const HEADER_TOP = 36;
const EYEBROW_H = 28;
const META_H = 30;
const TITLE_H = 64;
const AFTER_TITLE = 20;
const ANSWER_H = 176;
const AFTER_ANSWER = 28;
const SECTION_H = 36;
const COLHEAD_H = 28;
const AFTER_ROWS = 20;
const BEFORE_OVERVIEW = 28;
const OVERVIEW_TITLE_H = 40;
const MEAL_H = 124;
const ITEM_H = 58;
const AFTER_OVERVIEW = 8;
const BEFORE_FOOTER = 20;
const FOOTER_H = 36;

function layoutFor(
  dayCount: number,
  includeOverview: boolean,
  hasMeal: boolean,
  topItemCount: number,
): { height: number; rowHeight: number } {
  const rowHeight = dayCount > 24 ? 78 : 92;
  let y = MARGIN + HEADER_TOP;
  y += EYEBROW_H + META_H + TITLE_H + AFTER_TITLE;
  y += ANSWER_H + AFTER_ANSWER;
  y += SECTION_H + COLHEAD_H + dayCount * rowHeight + AFTER_ROWS;
  if (includeOverview) {
    y += BEFORE_OVERVIEW + OVERVIEW_TITLE_H;
    if (hasMeal) y += MEAL_H;
    y += topItemCount * ITEM_H + AFTER_OVERVIEW;
  }
  y += BEFORE_FOOTER + FOOTER_H + MARGIN;
  return { height: Math.min(MAX_HEIGHT, y), rowHeight };
}

function formatWait(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return 'ไม่ถึง 1 นาที';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} นาที`;
  if (minutes === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${minutes} นาที`;
}

function fillTextRight(
  ctx: CanvasRenderingContext2D,
  text: string,
  right: number,
  y: number,
): void {
  ctx.fillText(text, right - ctx.measureText(text).width, y);
}

function drawMonth(options: {
  palette: ReportPalette;
  restaurantName: string;
  rangeLabel: string;
  generatedAtLabel: string;
  month: MonthlyTrafficReport;
  rangeSummary: AnalyticsReportRangeSummary;
  includeOverview: boolean;
}): HTMLCanvasElement {
  const { palette, month, includeOverview } = options;
  const { height, rowHeight } = layoutFor(
    month.days.length,
    includeOverview,
    options.rangeSummary.bestMeal !== null,
    options.rangeSummary.topItems.length,
  );
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('สร้างรูปไม่สำเร็จ');

  const contentX = MARGIN + 40;
  const contentW = WIDTH - (MARGIN + 40) * 2;

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, WIDTH, height);
  fillRoundRect(ctx, MARGIN, MARGIN, WIDTH - MARGIN * 2, height - MARGIN * 2, 36, palette.surface);
  ctx.save();
  traceRoundRect(ctx, MARGIN, MARGIN, WIDTH - MARGIN * 2, height - MARGIN * 2, 36);
  ctx.clip();
  ctx.fillStyle = palette.primary;
  ctx.fillRect(MARGIN, MARGIN, WIDTH - MARGIN * 2, 14);
  ctx.restore();
  traceRoundRect(ctx, MARGIN, MARGIN, WIDTH - MARGIN * 2, height - MARGIN * 2, 36);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textBaseline = 'top';
  let y = MARGIN + HEADER_TOP;
  const textRight = contentX + contentW - 20;
  const colDay = contentX + 28;
  const colSales = contentX + 280;
  const colBill = contentX + 520;
  const colWait = contentX + 700;

  setFont(ctx, 700, 20, palette.font);
  ctx.fillStyle = palette.primary;
  ctx.fillText('รายงานวิเคราะห์ยอดขาย', contentX, y);
  y += EYEBROW_H;

  setFont(ctx, 400, 20, palette.font);
  ctx.fillStyle = palette.muted;
  const meta = `${options.restaurantName} · ${month.monthLabel} · สร้างเมื่อ ${options.generatedAtLabel}`;
  ctx.fillText(truncate(ctx, meta, contentW), contentX, y);
  y += META_H;

  setFont(ctx, 700, 46, palette.font);
  ctx.fillStyle = palette.ink;
  ctx.fillText(truncate(ctx, options.rangeLabel, contentW), contentX, y);
  y += TITLE_H + AFTER_TITLE;

  const highlights = [
    { label: 'ยอดขาย', value: formatPrice(month.totalSales), hint: 'รวมที่ชำระแล้ว' },
    { label: 'บิล', value: countText(month.billCount, 'บิล'), hint: 'ที่ปิดบิลแล้ว' },
    { label: 'เวลารอเฉลี่ย', value: formatWait(month.avgWaitMs), hint: 'รับคิวจนเสิร์ฟ' },
  ];
  const cardGap = 16;
  const cardW = (contentW - cardGap * 2) / highlights.length;
  highlights.forEach((item, index) => {
    const x = contentX + index * (cardW + cardGap);
    fillRoundRect(ctx, x, y, cardW, ANSWER_H, 24, palette.primarySoft);
    setFont(ctx, 700, 20, palette.font);
    ctx.fillStyle = palette.primary;
    ctx.fillText(item.label, x + 22, y + 22);
    setFont(ctx, 700, 36, palette.font);
    ctx.fillStyle = palette.ink;
    ctx.fillText(truncate(ctx, item.value, cardW - 40), x + 22, y + 64);
    setFont(ctx, 400, 18, palette.font);
    ctx.fillStyle = palette.muted;
    ctx.fillText(item.hint, x + 22, y + 122);
  });
  y += ANSWER_H + AFTER_ANSWER;

  setFont(ctx, 700, 26, palette.font);
  ctx.fillStyle = palette.ink;
  ctx.fillText('แต่ละวัน', contentX, y);
  y += SECTION_H;

  setFont(ctx, 600, 16, palette.font);
  ctx.fillStyle = palette.muted;
  ctx.fillText('วัน', colDay, y);
  ctx.fillText('ยอดขาย', colSales, y);
  ctx.fillText('บิล', colBill, y);
  ctx.fillText('เวลารอ', colWait, y);
  y += COLHEAD_H;

  month.days.forEach((day) => {
    const marked = day.isTopSales || day.isSlowestWait;
    fillRoundRect(
      ctx,
      contentX,
      y,
      contentW,
      rowHeight - 8,
      16,
      marked ? palette.primarySoft : palette.background,
    );
    if (marked) {
      ctx.fillStyle = palette.primary;
      ctx.fillRect(contentX + 12, y + 14, 5, rowHeight - 36);
    }

    const textY = y + 16;
    setFont(ctx, 700, 22, palette.font);
    ctx.fillStyle = palette.ink;
    ctx.fillText(truncate(ctx, `${day.dayName} ${day.shortLabel}`, 220), colDay, textY);

    setFont(ctx, 700, 22, palette.font);
    ctx.fillStyle = palette.ink;
    ctx.fillText(formatPrice(day.totalSales), colSales, textY);

    setFont(ctx, 700, 22, palette.font);
    ctx.fillStyle = palette.ink;
    ctx.fillText(countText(day.billCount, 'บิล'), colBill, textY);

    setFont(ctx, 700, 22, palette.font);
    ctx.fillStyle = day.avgWaitMs == null ? palette.muted : palette.primary;
    ctx.fillText(truncate(ctx, formatWait(day.avgWaitMs), textRight - colWait), colWait, textY);

    if (marked) {
      const badge = [day.isTopSales ? 'ยอดสูงสุด' : '', day.isSlowestWait ? 'รอนานสุด' : '']
        .filter(Boolean)
        .join(' · ');
      setFont(ctx, 700, 15, palette.font);
      const badgeW = ctx.measureText(badge).width + 16;
      fillRoundRect(ctx, colDay, y + 44, badgeW, 24, 12, palette.primary);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badge, colDay + 8, y + 48);
    }
    y += rowHeight;
  });
  y += AFTER_ROWS;

  if (includeOverview) {
    y += BEFORE_OVERVIEW;
    setFont(ctx, 700, 24, palette.font);
    ctx.fillStyle = palette.ink;
    ctx.fillText('ของทั้งช่วงที่เลือก', contentX, y);
    y += OVERVIEW_TITLE_H;

    const meal = options.rangeSummary.bestMeal;
    if (meal) {
      fillRoundRect(ctx, contentX, y, contentW, MEAL_H - 12, 18, palette.background);
      setFont(ctx, 600, 16, palette.font);
      ctx.fillStyle = palette.muted;
      ctx.fillText('มื้อขายดี', contentX + 24, y + 16);
      setFont(ctx, 700, 28, palette.font);
      ctx.fillStyle = palette.ink;
      ctx.fillText(truncate(ctx, meal.title, contentW - 280), contentX + 24, y + 42);
      setFont(ctx, 700, 32, palette.font);
      ctx.fillStyle = palette.primary;
      fillTextRight(ctx, `${meal.salesPercentage}%`, textRight, y + 40);
      setFont(ctx, 400, 20, palette.font);
      ctx.fillStyle = palette.muted;
      ctx.fillText(meal.timeRange, contentX + 24, y + 80);
      y += MEAL_H;
    }

    options.rangeSummary.topItems.forEach((item, index) => {
      const rowY = y + 8;
      fillRoundRect(ctx, contentX, rowY, 36, 36, 18, palette.primarySoft);
      setFont(ctx, 700, 18, palette.font);
      ctx.fillStyle = palette.primary;
      const rank = String(index + 1);
      const rankW = ctx.measureText(rank).width;
      ctx.fillText(rank, contentX + (36 - rankW) / 2, rowY + 8);

      setFont(ctx, 600, 18, palette.font);
      ctx.fillStyle = palette.muted;
      const stats = `${countText(item.quantitySold, 'จาน')}  ${formatPrice(item.totalRevenue)}`;
      const statsW = ctx.measureText(stats).width;
      fillTextRight(ctx, stats, textRight, rowY + 8);

      setFont(ctx, 700, 22, palette.font);
      ctx.fillStyle = palette.ink;
      const nameX = contentX + 48;
      const nameMax = textRight - statsW - nameX - 16;
      ctx.fillText(truncate(ctx, item.name, Math.max(80, nameMax)), nameX, rowY + 6);
      y += ITEM_H;
    });
    y += AFTER_OVERVIEW;
  }

  y += BEFORE_FOOTER;
  setFont(ctx, 400, 18, palette.font);
  ctx.fillStyle = palette.muted;
  ctx.fillText('เวลารอเฉลี่ยนับจากรับคิวจนเสิร์ฟ · เวลาประเทศไทย', contentX, y);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('สร้างรูปไม่สำเร็จ'));
    }, 'image/png');
  });
}

export async function renderAnalyticsReport(options: {
  restaurantName: string;
  rangeLabel: string;
  generatedAtLabel: string;
  months: MonthlyTrafficReport[];
  rangeSummary: AnalyticsReportRangeSummary;
  signal?: AbortSignal;
  onProgress?: (info: { index: number; total: number; monthName: string }) => void;
}): Promise<AnalyticsReportImage[]> {
  throwIfCancelled(options.signal);
  const font = await resolveReportFont();
  throwIfCancelled(options.signal);
  const palette = readPalette(font);
  const images: AnalyticsReportImage[] = [];
  const total = options.months.length;

  try {
    for (let index = 0; index < total; index += 1) {
      throwIfCancelled(options.signal);
      const month = options.months[index];
      if (!month) continue;
      options.onProgress?.({ index, total, monthName: month.monthName });
      await new Promise((resolve) => window.setTimeout(resolve, 16));
      throwIfCancelled(options.signal);

      const includeOverview =
        index === 0 &&
        (options.rangeSummary.bestMeal !== null || options.rangeSummary.topItems.length > 0);
      const canvas = drawMonth({
        palette,
        restaurantName: options.restaurantName,
        rangeLabel: options.rangeLabel,
        generatedAtLabel: options.generatedAtLabel,
        month,
        rangeSummary: options.rangeSummary,
        includeOverview,
      });
      const blob = await canvasToBlob(canvas);
      throwIfCancelled(options.signal);
      images.push({
        monthKey: month.monthKey,
        monthName: month.monthName,
        fileName: `sales-insight_${month.monthKey}.png`,
        blob,
        previewUrl: URL.createObjectURL(blob),
      });
    }
  } catch (error) {
    revokeReportPreviews(images);
    throw error;
  }

  return images;
}

export function revokeReportPreviews(images: AnalyticsReportImage[]): void {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
}

export async function shareAnalyticsImages(
  images: AnalyticsReportImage[],
): Promise<ShareAnalyticsResult> {
  const files = images.map(
    (image) => new File([image.blob], image.fileName, { type: 'image/png' }),
  );
  const canShareFiles =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files });

  if (canShareFiles) {
    try {
      await navigator.share({ files, title: 'รายงานวิเคราะห์ยอดขาย' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  images.forEach((image) => {
    const link = document.createElement('a');
    link.href = image.previewUrl;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  return 'downloaded';
}
