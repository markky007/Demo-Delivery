<template>
  <div class="analytics-card">
    <div class="row items-center q-gutter-xs q-mb-md">
      <q-icon name="auto_awesome" color="amber-9" size="22px" />
      <div>
        <div class="text-subtitle1 text-weight-bold">
          สรุปบทวิเคราะห์ & ข้อเสนอแนะทางธุรกิจ (Smart Business Insights)
        </div>
        <div class="text-caption text-grey-7">
          กลยุทธ์แนะนำจากการวิเคราะห์ข้อมูลยอดขายเพื่อช่วยเพิ่มกำไรและลดต้นทุนร้านค้า
        </div>
      </div>
    </div>

    <div v-if="insights.length === 0" class="empty-insights text-center q-pa-md">
      <q-icon name="analytics" size="32px" color="grey-5" />
      <div class="text-caption text-grey-6 q-mt-xs">
        กำลังรวบรวมข้อมูลยอดขายเพื่อสร้างบทวิเคราะห์
      </div>
    </div>

    <div v-else class="insights-grid">
      <div
        v-for="(insight, idx) in insights"
        :key="idx"
        class="insight-item"
        :class="`insight-item--${insight.type}`"
      >
        <div class="row items-start q-gutter-sm no-wrap">
          <div class="insight-icon-box" :class="`insight-icon-box--${insight.type}`">
            <q-icon :name="insight.icon" size="20px" />
          </div>
          <div class="insight-content">
            <div class="text-weight-bold text-body2 text-dark q-mb-xs">
              {{ insight.title }}
            </div>
            <div class="text-caption text-grey-8 q-mb-xs">
              {{ insight.description }}
            </div>
            <div class="insight-action-box">
              <span class="action-label">🎯 ข้อแนะนำ:</span>
              <span class="action-text">{{ insight.actionRecommendation }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BusinessInsightItem } from 'src/services/salesAnalyticsService';

defineProps<{
  insights: BusinessInsightItem[];
}>();
</script>

<style scoped>
.analytics-card {
  background: #ffffff;
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  padding: 20px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.insight-item {
  border-radius: var(--radius-sm, 10px);
  border: 1px solid var(--color-border, #ede5dc);
  padding: 14px;
  background: #ffffff;
  transition: all 0.15s ease;
}

.insight-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.insight-item--success {
  border-left: 4px solid var(--color-status-prepared, #16a34a);
  background: #f0fdf4;
}

.insight-item--warning {
  border-left: 4px solid var(--color-status-preparing, #d97706);
  background: #fffbeb;
}

.insight-item--info {
  border-left: 4px solid var(--color-status-queued, #0284c7);
  background: #f0f9ff;
}

.insight-item--primary {
  border-left: 4px solid var(--color-primary, #e05836);
  background: #fff8f5;
}

.insight-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-icon-box--success {
  background: #dcfce7;
  color: #16a34a;
}

.insight-icon-box--warning {
  background: #fef3c7;
  color: #d97706;
}

.insight-icon-box--info {
  background: #e0f2fe;
  color: #0284c7;
}

.insight-icon-box--primary {
  background: #ffe6dc;
  color: #e05836;
}

.insight-content {
  flex: 1;
  min-width: 0;
}

.insight-action-box {
  background: rgba(255, 255, 255, 0.7);
  border: 1px dashed var(--color-border, #ede5dc);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.78rem;
  margin-top: 4px;
}

.action-label {
  font-weight: 700;
  color: var(--color-text-primary, #2d231e);
  margin-right: 4px;
}

.action-text {
  color: var(--color-text-secondary, #7a6e65);
}
</style>
