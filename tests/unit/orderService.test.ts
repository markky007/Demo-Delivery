import { describe, expect, it, vi } from 'vitest';
import { step } from 'allure-js-commons';
import { setCaseMeta } from './allureMeta';
import { OrderStatus } from '../../src/types/enums';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('src/services/supabase', () => ({ supabase: { rpc } }));
import { calculateQueuePosition, createOrder } from '../../src/services/orderService';

describe('order service', () => {
  it('TC-ORDER-006 propagates RPC failure without a database connection', async () => {
    await setCaseMeta('TC-ORDER-006', 'Orders', 'Supabase error', 'normal');
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'network unavailable' } });
    await step('Submit order through mocked RPC', async () => {
      await expect(
        createOrder({
          table_session_id: 's',
          guest_session_token: 'g',
          public_token: 'q',
          items: [],
        }),
      ).rejects.toThrow('network unavailable');
    });
    expect(rpc).toHaveBeenCalledWith(
      'create_order_verified',
      expect.objectContaining({ p_public_token: 'q' }),
    );
  });

  it('TC-STATION-001 maps active and served queue positions', async () => {
    await setCaseMeta('TC-STATION-001', 'Queue', 'Customer queue status', 'normal');
    await step('Calculate queue positions from a mocked snapshot', async () => {
      const snapshot = { totalActive: 3, positions: { order1: 2 } };
      expect(calculateQueuePosition('order1', OrderStatus.QUEUED, snapshot).queuePosition).toBe(3);
      expect(calculateQueuePosition('order1', OrderStatus.SERVED, snapshot).queuePosition).toBe(0);
    });
  });
});
