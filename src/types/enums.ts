/**
 * Domain enums used throughout the application.
 * These must match the PostgreSQL enum values exactly.
 */

export enum OrderStatus {
  QUEUED = 'QUEUED',
  PREPARING = 'PREPARING',
  PREPARED = 'PREPARED',
  SERVED = 'SERVED',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum BillStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum SelectionType {
  SINGLE = 'single',
  MULTI = 'multi',
}

/**
 * Customer-facing status labels in Thai.
 * PREPARED maps to the same label as PREPARING (customers don't see PREPARED).
 */
export const CustomerStatusLabel: Record<OrderStatus, string> = {
  [OrderStatus.QUEUED]: 'รับออเดอร์แล้ว',
  [OrderStatus.PREPARING]: 'ร้านกำลังเตรียมอาหาร',
  [OrderStatus.PREPARED]: 'ร้านกำลังเตรียมอาหาร',
  [OrderStatus.SERVED]: 'เสิร์ฟแล้ว',
};

/** Valid state transitions for orders (Owner-side). */
export const OrderTransitions: Record<OrderStatus, OrderStatus | null> = {
  [OrderStatus.QUEUED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.PREPARED,
  [OrderStatus.PREPARED]: OrderStatus.SERVED,
  [OrderStatus.SERVED]: null,
};

/** Which order statuses allow customer editing (only before restaurant starts) */
export const EditableStatuses: OrderStatus[] = [OrderStatus.QUEUED];

