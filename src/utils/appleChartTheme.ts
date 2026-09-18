/**
 * Apple Design System Theme & Helpers for Apache ECharts
 * Implements SVG vector rendering, frosted glass tooltips, and Apple typography scale.
 */

import { use } from 'echarts/core';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';

// Register core ECharts components
use([
  SVGRenderer,
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

export const APPLE_COLORS = {
  primary: '#0071E3',
  primaryLink: '#0066CC',
  primaryLight: '#2997FF',
  green: '#34C759',
  greenDark: '#137333',
  amber: '#FF9500',
  warmRust: '#B64400',
  purple: '#AF52DE',
  teal: '#009688',
  ink: '#1D1D1F',
  body: '#414143',
  muted: '#6E6E73',
  mutedLight: '#86868B',
  hairline: '#E8E8ED',
  surface: '#FFFFFF',
  surfaceSubtle: '#FAFAFC',
  surfaceFooter: '#F5F5F7',
};

export const APPLE_PALETTE = [
  APPLE_COLORS.primary,
  APPLE_COLORS.primaryLight,
  APPLE_COLORS.teal,
  APPLE_COLORS.warmRust,
  APPLE_COLORS.greenDark,
  APPLE_COLORS.purple,
  APPLE_COLORS.muted,
  APPLE_COLORS.mutedLight,
];

export const FONT_FAMILY =
  "'Inter', 'LINE Seed Sans TH', 'Prompt', -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * Premium Apple-grade Frosted Glass Tooltip config
 */
export const appleTooltipBase = {
  trigger: 'axis' as const,
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  borderColor: 'rgba(232, 232, 237, 0.85)',
  borderWidth: 1,
  padding: [10, 14],
  extraCssText:
    'backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); border-radius: 14px;',
  textStyle: {
    fontFamily: FONT_FAMILY,
    color: APPLE_COLORS.ink,
    fontSize: 12,
  },
  axisPointer: {
    type: 'line' as const,
    lineStyle: {
      color: 'rgba(0, 113, 227, 0.35)',
      width: 1.5,
      type: 'dashed' as const,
    },
  },
};
