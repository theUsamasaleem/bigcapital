import { WithholdingTaxCalculator } from './WithholdingTaxCalculator';

describe('WithholdingTaxCalculator', () => {
  const calc = new WithholdingTaxCalculator();

  it('computes WHT and net payable for a standard rate', () => {
    const result = calc.calculate({ baseAmount: 100000, rate: 4.5 });
    expect(result.whtAmount).toBe(4500);
    expect(result.netPayable).toBe(95500);
  });

  it('rounds to 2 decimals (half-up, no float drift)', () => {
    const result = calc.calculate({ baseAmount: 1000.5, rate: 10 });
    expect(result.whtAmount).toBe(100.05);
    expect(result.netPayable).toBe(900.45);
  });

  it('handles a zero rate', () => {
    const result = calc.calculate({ baseAmount: 5000, rate: 0 });
    expect(result.whtAmount).toBe(0);
    expect(result.netPayable).toBe(5000);
  });

  it('coerces nullish inputs to zero', () => {
    const result = calc.calculate({ baseAmount: undefined as any, rate: 10 });
    expect(result.whtAmount).toBe(0);
    expect(result.netPayable).toBe(0);
  });

  it('rejects a negative base amount', () => {
    expect(() => calc.calculate({ baseAmount: -1, rate: 10 })).toThrow();
  });

  it('rejects an out-of-range rate', () => {
    expect(() => calc.calculate({ baseAmount: 100, rate: 150 })).toThrow();
  });
});
