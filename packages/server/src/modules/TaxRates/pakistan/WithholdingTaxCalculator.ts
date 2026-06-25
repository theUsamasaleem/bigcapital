import { Injectable } from '@nestjs/common';
import { IWithholdingTaxInput } from '../TaxRates.types';

export interface IWithholdingTaxResult {
  baseAmount: number;
  rate: number;
  /** The tax withheld (rounded to 2 decimals). */
  whtAmount: number;
  /** Amount payable to the vendor after deducting WHT. */
  netPayable: number;
}

/**
 * Pure withholding-tax calculation engine (Phase 3a).
 *
 * WHT in Pakistan is a deduction at source: the buyer withholds a percentage of
 * the base (taxable) amount and pays it to the FBR on the vendor's behalf, then
 * pays the vendor the net. This engine is intentionally side-effect free so it
 * can be unit tested in isolation and reused by the recording service.
 */
@Injectable()
export class WithholdingTaxCalculator {
  /**
   * Rounds to 2 decimal places using half-up rounding, guarding against binary
   * floating-point artefacts (e.g. 1.005 -> 1.01).
   */
  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Computes the withholding tax for a base amount and rate.
   * @param {IWithholdingTaxInput} input
   * @returns {IWithholdingTaxResult}
   */
  public calculate(input: IWithholdingTaxInput): IWithholdingTaxResult {
    const baseAmount = Number(input.baseAmount) || 0;
    const rate = Number(input.rate) || 0;

    if (baseAmount < 0) {
      throw new Error('Withholding tax base amount cannot be negative.');
    }
    if (rate < 0 || rate > 100) {
      throw new Error('Withholding tax rate must be between 0 and 100.');
    }

    const whtAmount = this.round2((baseAmount * rate) / 100);
    const netPayable = this.round2(baseAmount - whtAmount);

    return { baseAmount, rate, whtAmount, netPayable };
  }
}
