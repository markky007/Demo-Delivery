<template>
  <div class="analytics-card">
    <div class="card-header-box q-mb-md">
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <div class="header-icon-pill">
            <q-icon name="auto_awesome" size="18px" color="primary" />
          </div>
          <div>
            <div class="text-subtitle1 text-weight-bold text-ink">
              สรุปบทวิเคราะห์ & ข้อเสนอแนะทางธุรกิจ
            </div>
            <div class="text-caption text-muted">
              Smart Business Insights • คำแนะนำเชิงกลยุทธ์จากสถิติยอดขายเพื่อเพิ่มยอดและลดต้นทุน
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="insights.length === 0" class="empty-insights text-center q-pa-lg">
      <q-icon name="insights" size="36px" color="grey-4" />
      <div class="text-caption text-muted q-mt-sm">
        กำลังประมวลผลข้อมูลยอดขายเพื่อสร้างคำแนะนำเชิงธุรกิจ
      </div>
    </div>

    <div v-else class="insights-grid">
      <div
        v-for="(insight, idx) in insights"
        :key="idx"
        class="insight-item"
        :class="`insight-item--${insight.type}`"
      >
        <div class="insight-top-row">
          <div class="insight-icon-wrap" :class="`insight-icon-wrap--${insight.type}`">
            <q-icon :name="insight.icon" size="18px" />
          </div>
          <div class="insight-title-wrap">
            <div class="insight-title">{{ insight.title }}</div>
            <div class="insight-desc">{{ insight.description }}</div>
          </div>
        </div>

        <div class="insight-action-card">
          <div class="action-header">
            <q-icon name="lightbulb" size="14px" color="primary" class="q-mr-xs" />
            <span class="action-label">คำแนะนำ:</span>
          </div>
          <div class="action-text">{{ insight.actionRecommendation }}</div>
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
  border-radius: 20px;
  border: 1px solid #d2d2d7;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}

.header-icon-pill {
  width: 36px;
  height: 36px;
  border-radius: 980px;
  background: #f0f6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.insight-item {
  border-radius: 14px;
  border: 1px solid #e8e8ed;
  background: #fafafc;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.insight-item:hover {
  transform: translateY(-2px);
  border-color: #0071e3;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

.insight-top-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.insight-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 980px;
  background: #f5f5f7;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-icon-wrap--success {
  background: #f0fdf4;
  color: #16a34a;
}

.insight-icon-wrap--warning {
  background: #fffbeb;
  color: #d97706;
}

.insight-icon-wrap--info {
  background: #f0f6ff;
  color: #0071e3;
}

.insight-icon-wrap--primary {
  background: #f0f6ff;
  color: #0071e3;
}

.insight-title-wrap {
  flex: 1;
  min-width: 0;
}

.insight-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 3px;
  line-height: 1.35;
}

.insight-desc {
  font-size: 0.8125rem;
  color: #6e6e73;
  line-height: 1.45;
}

.insight-action-card {
  background: #ffffff;
  border: 1px solid #e8e8ed;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.8125rem;
}

.action-header {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

.action-label {
  font-weight: 600;
  color: #1d1d1f;
  font-size: 0.75rem;
}

.action-text {
  color: #414143;
  line-height: 1.4;
}
</style>
