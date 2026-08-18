-- Migration to update existing restaurant name to Demo Delivery
UPDATE restaurants
SET name = 'Demo Delivery',
    description = 'Demo Delivery'
WHERE id = '00000000-0000-0000-0000-000000000001'
   OR name = 'Demo Restaurant';
