import { beforeEach, describe, expect, it, vi } from 'vitest';
import { step } from 'allure-js-commons';
import { setCaseMeta } from './allureMeta';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('src/services/supabase', () => ({ supabase: db }));
import { recalculateBillTotal } from '../../src/services/billService';

describe('bill totals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-BILL-002 sums orders and updates the bill', async () => {
    await setCaseMeta('TC-BILL-002', 'Bills', 'Recalculate total', 'critical');
    const update = vi.fn();
    db.from.mockImplementation((table: string) =>
      table === 'orders'
        ? {
            select: () => ({
              eq: async () => ({ data: [{ total_amount: 120 }, { total_amount: 80 }] }),
            }),
          }
        : {
            update: (payload: unknown) => {
              update(payload);
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({ data: { total_amount: 200 }, error: null }),
                  }),
                }),
              };
            },
          },
    );
    await step('Recalculate a bill from two order totals', async () => {
      const bill = await recalculateBillTotal('bill-1', 'session-1');
      expect(bill.total_amount).toBe(200);
    });
    expect(update).toHaveBeenCalledWith({ total_amount: 200 });
  });
});
