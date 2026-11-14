import { describe, expect, it } from 'vitest';
import { formatPrice } from '../../src/utils/formatters';
import { step } from 'allure-js-commons';
import { setCaseMeta } from './allureMeta';

describe('formatPrice', () => {
  it('TC-FORMAT-001 formats an integer price without a database connection', async () => {
    await setCaseMeta('TC-FORMAT-001', 'Formatting', 'Integer price', 'normal');
    await step('Format a whole Baht amount', async () => {
      expect(formatPrice(120)).toBe('฿120');
    });
  });
});
