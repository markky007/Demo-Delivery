<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="military_tech" color="amber-9" size="22px" />
        <span class="card-title">5 อันดับเมนูขายดีประจำวัน</span>
      </div>
      <div class="card-subtitle">เรียงตามจำนวนจาน</div>
    </div>

    <!-- Empty State -->
    <div v-if="items.length === 0" class="empty-box">
      <q-icon name="lunch_dining" size="36px" color="grey-4" />
      <div class="text-caption text-muted q-mt-xs">ยังไม่มีข้อมูลยอดขายเมนู</div>
    </div>

    <!-- Chart & List Container -->
    <div v-else class="content-body">
      <div class="chart-wrapper">
        <VChart class="echarts-view" :option="chartOption" autoresize />
      </div>

      <!-- Quick Ranking Badges List -->
      <div class="ranking-list q-mt-md">
        <div
          v-for="(item, index) in items"
          :key="item.name"
          class="ranking-item row items-center justify-between"
        >
          <div class="row items-center q-gutter-sm ellipsis col">
            <span class="rank-badge" :class="'rank-badge--' + (index + 1)">#{{ index + 1 }}</span>
            <span class="item-name text-ink ellipsis">{{ item.name }}</span>
          </div>
          <div class="row items-center q-gutter-sm text-right flex-shrink-0 font-mono">
            <span class="text-weight-bold text-ink">{{ item.quantity }} จาน</span>
            <span class="text-caption text-muted">({{ formatPrice(item.subtotal) }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { formatPrice } from 'src/utils/formatters';
import {
  APPLE_PALETTE,
  APPLE_COLORS,
  FONT_FAMILY,
  appleTooltipBase,
} from 'src/utils/appleChartTheme';

export interface TopMenuItem {
  name: string;
  quantity: number;
  subtotal: number;
}

const props = defineProps<{
  items: TopMenuItem[];
}>();

const chartOption = computed<EChartsOption>(() => {
  const sorted = [...props.items].slice(0, 5).reverse(); // Reverse for horizontal bar from top to bottom
  const labels = sorted.map((it) => (it.name.length > 18 ? it.name.slice(0, 16) + '...' : it.name));
  const quantities = sorted.map((it) => it.quantity);
  const subtotals = sorted.map((it) => it.subtotal);

  return {
    renderer: 'svg',
    animationDuration: 750,
    animationEasing: 'cubicOut',
    grid: {
      top: 10,
      left: 8,
      right: 24,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      ...appleTooltipBase,
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { dataIndex: number; name: string; value: number };
        const idx = p.dataIndex;
        const rawName = sorted[idx]?.name || p.name;
        const qty = sorted[idx]?.quantity || p.value;
        const total = formatPrice(subtotals[idx] ?? 0);
        return `<div style="font-family:${FONT_FAMILY}">
          <div style="font-weight:600;color:#1D1D1F;margin-bottom:4px;">${rawName}</div>
          <div style="display:flex;justify-content:space-between;gap:14px;color:#6E6E73;font-size:12px;">
            <span>ปริมาณที่ขาย:</span>
            <strong style="color:#0071E3;font-variant-numeric:tabular-nums;">${qty} จาน</strong>
          </div>
          <div style="display:flex;justify-content:space-between;gap:14px;color:#6E6E73;font-size:12px;margin-top:2px;">
            <span>ยอดขายรวม:</span>
            <strong style="color:#1D1D1F;font-variant-numeric:tabular-nums;">${total}</strong>
          </div>
        </div>`;
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: '#F5F5F7',
        },
      },
      axisLabel: {
        color: APPLE_COLORS.mutedLight,
        fontFamily: FONT_FAMILY,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: APPLE_COLORS.hairline } },
      axisTick: { show: false },
      axisLabel: {
        color: APPLE_COLORS.ink,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'จำนวนจาน',
        type: 'bar',
        data: quantities.map((qty, i) => ({
          value: qty,
          itemStyle: {
            color: APPLE_PALETTE[i % APPLE_PALETTE.length] ?? APPLE_COLORS.primary,
            borderRadius: [0, 980, 980, 0], // Pill shaped right ends
          },
        })),
        barWidth: 14,
      },
    ],
  };
});
</script>

<style scoped>
.apple-card {
  background: var(--colors-surface, #ffffff);
  border-radius: 28px;
  border: 1px solid var(--colors-hairline, #e8e8ed);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--colors-ink, #1d1d1f);
  line-height: 1.3;
}

.card-subtitle {
  font-size: 0.8125rem;
  color: var(--colors-muted, #6e6e73);
}

.chart-wrapper {
  position: relative;
  height: 180px;
  width: 100%;
}

.echarts-view {
  width: 100%;
  height: 100%;
}

.empty-box {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #f0f0f4;
  padding-top: 14px;
}

.ranking-item {
  padding: 8px 12px;
  border-radius: 12px;
  background: #fafafc;
  font-size: 0.84rem;
  border: 1px solid #f0f0f4;
}

.item-name {
  font-weight: 500;
}

.rank-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 980px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #86868b;
}

.rank-badge--1 {
  background: #b64400;
}

.rank-badge--2 {
  background: #0071e3;
}

.rank-badge--3 {
  background: #6e6e73;
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}
</style>
