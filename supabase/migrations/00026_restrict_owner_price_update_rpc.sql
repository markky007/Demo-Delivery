-- Only signed-in staff may adjust an order item's price.
-- Revoke PUBLIC as well as anon: PostgreSQL grants function EXECUTE to PUBLIC by default.
REVOKE EXECUTE ON FUNCTION public.owner_update_order_item_price(UUID, INTEGER, INTEGER, TEXT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.owner_update_order_item_price(UUID, INTEGER, INTEGER, TEXT)
  TO authenticated, service_role;
