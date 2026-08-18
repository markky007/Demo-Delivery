/**
 * Application constants.
 */

/** Maximum characters for special instructions per item */
export const MAX_SPECIAL_INSTRUCTION_LENGTH = 200;

/** Guest session token key in localStorage */
export const GUEST_TOKEN_KEY = 'qr_food_guest_token';

/** Current table session ID key in localStorage */
export const TABLE_SESSION_KEY = 'qr_food_table_session';

/** Current public token key in localStorage */
export const PUBLIC_TOKEN_KEY = 'qr_food_public_token';

/** Cart storage key prefix in localStorage */
export const CART_STORAGE_KEY = 'qr_food_cart';

/** App URL for QR code generation */
export const APP_URL =
  import.meta.env.VITE_APP_URL ||
  (typeof process !== 'undefined' ? process.env?.VITE_APP_URL : '') ||
  'http://localhost:9000';

/** Order status colors for Quasar UI (warm and soft) */
export const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'light-blue-8',
  PREPARING: 'amber-9',
  PREPARED: 'green-7',
  SERVED: 'blue-grey-6',
};

/** Order status background colors */
export const STATUS_BG_COLORS: Record<string, string> = {
  QUEUED: 'light-blue-1',
  PREPARING: 'amber-1',
  PREPARED: 'green-1',
  SERVED: 'grey-2',
};

/** Order status icons */
export const STATUS_ICONS: Record<string, string> = {
  QUEUED: 'schedule',
  PREPARING: 'soup_kitchen',
  PREPARED: 'check_circle',
  SERVED: 'done_all',
};

/** Thai Order Status Labels (Owner Side) */
export const OWNER_STATUS_LABELS: Record<string, string> = {
  QUEUED: 'รายการใหม่',
  PREPARING: 'กำลังเตรียม',
  PREPARED: 'เตรียมเสร็จแล้ว',
  SERVED: 'เสิร์ฟครบแล้ว',
};
