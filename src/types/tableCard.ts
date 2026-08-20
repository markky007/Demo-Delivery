import type { TableWithQR } from 'src/types/database';
import type { OrderStatus } from 'src/types/enums';

export type TableOperationalStatus =
  | 'AVAILABLE' // โต๊ะว่าง
  | 'SEATED_NO_ORDER' // เปิดโต๊ะแล้ว • รอลูกค้าสั่งอาหาร
  | 'COOKING' // กำลังทำอาหาร / รอเสิร์ฟ
  | 'READY_TO_PAY' // เสิร์ฟครบ 100% • รอเช็กบิล
  | 'PAID'; // ชำระเงินแล้ว • รอเคลียร์โต๊ะ

export interface RawSessionOrder {
  id: string;
  queue_number: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: {
    id: string;
    quantity: number;
    snapshot_name: string;
    subtotal: number;
    options?: { id: string; snapshot_option_name: string; snapshot_price_adjustment: number }[];
  }[];
}

export interface RawSessionBill {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export interface RawSession {
  id: string;
  table_id: string;
  customer_name?: string | null;
  status: string;
  created_at: string;
  table: { id: string; name: string } | null;
  orders: RawSessionOrder[];
  bill: RawSessionBill[] | null;
}

export interface StatusBadgeInfo {
  label: string;
  subLabel: string;
  icon: string;
  badgeClass: string;
  isPulse: boolean;
  dotColor: string;
}

export interface TableCardItem {
  table: TableWithQR;
  session: RawSession | null;
  tableStatus: TableOperationalStatus;
  statusBadge: StatusBadgeInfo;
  orderCount: number;
  totalItemCount: number;
  totalAmount: number;
  isPaid: boolean;
  isReadyToPay: boolean;
  servedOrdersCount: number;
  preparingOrdersCount: number;
  queuedOrdersCount: number;
  servingPercentage: number;
  kitchenText: string;
  kitchenTextColor: string;
  kitchenIcon: string;
  kitchenIconColor: string;
  progressBarColorClass: string;
  elapsedTime: string;
  startedAtTime: string;
  avatarClass: string;
  isTakeaway: boolean;
}
