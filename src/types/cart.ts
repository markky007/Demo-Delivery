/**
 * Cart-specific types.
 * These are client-side only and represent the customer's in-progress cart
 * before order submission.
 */

export interface CartItemOption {
  option_id: string;
  option_group_id: string;
  name: string;
  group_name: string;
  price_adjustment: number;
}

export interface CartItem {
  /** Client-generated unique ID for this cart line (UUID) */
  cart_item_id: string;
  menu_item_id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  quantity: number;
  special_instruction: string;
  selected_options: CartItemOption[];
  /** Computed: base_price + sum(option adjustments) * quantity */
  subtotal: number;
}

/** Payload sent to the create_order RPC */
export interface CreateOrderPayload {
  table_session_id: string;
  guest_session_token: string;
  items: CreateOrderItemPayload[];
}

export interface CreateOrderItemPayload {
  menu_item_id: string;
  quantity: number;
  special_instruction: string;
  selected_option_ids: string[];
  option_ids?: string[];
}

/** Payload sent to the update_order RPC */
export interface UpdateOrderPayload {
  order_id: string;
  guest_session_token: string;
  items: CreateOrderItemPayload[];
}
