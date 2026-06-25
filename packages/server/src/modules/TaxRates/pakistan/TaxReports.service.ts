import { Inject, Injectable } from '@nestjs/common';
import { raw } from 'objection';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ItemEntry } from '@/modules/TransactionItemEntry/models/ItemEntry';
import { WithholdingTaxEntry } from '../models/WithholdingTaxEntry.model';

// Reference types whose tax is collected from customers (output / payable tax).
const OUTPUT_REFERENCE_TYPES = ['SaleInvoice', 'SaleReceipt', 'CreditNote'];
// Reference types whose tax is paid to vendors (input / recoverable tax).
const INPUT_REFERENCE_TYPES = ['Bill', 'VendorCredit'];

export interface ITaxLiabilityRow {
  taxType: string;
  taxRateId: number | null;
  taxName: string | null;
  outputTax: number;
  inputTax: number;
  netTax: number;
}

export interface IWithholdingTaxReport {
  totals: { totalBase: number; totalWht: number; count: number };
  bySection: Array<{ whtSection: string | null; totalWht: number; count: number }>;
  entries: WithholdingTaxEntry[];
}

/**
 * Pakistan tax reports (Phase 3a): GST/SST liability summary and the WHT
 * report. Amounts are computed on the tax-exclusive line base
 * (quantity * rate * tax_rate%) which matches Finqora's exclusive-tax entries.
 */
@Injectable()
export class TaxReportsService {
  constructor(
    @Inject(ItemEntry.name)
    private readonly itemEntryModel: TenantModelProxy<typeof ItemEntry>,

    @Inject(WithholdingTaxEntry.name)
    private readonly withholdingTaxEntryModel: TenantModelProxy<
      typeof WithholdingTaxEntry
    >,
  ) {}

  private round2(value: number): number {
    return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Aggregates output (sales) and input (purchase) sales tax per tax rate /
   * type from item entries. Net = output - input is the amount payable to FBR.
   */
  public async getTaxLiabilitySummary(): Promise<{
    rows: ITaxLiabilityRow[];
    totals: { outputTax: number; inputTax: number; netTax: number };
  }> {
    const rows = (await this.itemEntryModel()
      .query()
      .join('tax_rates', 'items_entries.tax_rate_id', 'tax_rates.id')
      .whereNotNull('items_entries.tax_rate_id')
      .select('tax_rates.id as taxRateId')
      .select('tax_rates.name as taxName')
      .select('tax_rates.tax_type as taxType')
      .select('items_entries.reference_type as referenceType')
      .select(
        raw(
          'SUM(items_entries.quantity * items_entries.rate * items_entries.tax_rate / 100) as taxAmount',
        ),
      )
      .groupBy(
        'tax_rates.id',
        'tax_rates.name',
        'tax_rates.tax_type',
        'items_entries.reference_type',
      )) as any[];

    const byRate = new Map<number, ITaxLiabilityRow>();

    for (const row of rows) {
      const taxRateId = row.taxRateId ?? null;
      const key = Number(taxRateId);
      const amount = this.round2(row.taxAmount);

      if (!byRate.has(key)) {
        byRate.set(key, {
          taxType: row.taxType ?? 'OTHER',
          taxRateId,
          taxName: row.taxName ?? null,
          outputTax: 0,
          inputTax: 0,
          netTax: 0,
        });
      }
      const entry = byRate.get(key)!;
      if (OUTPUT_REFERENCE_TYPES.includes(row.referenceType)) {
        entry.outputTax = this.round2(entry.outputTax + amount);
      } else if (INPUT_REFERENCE_TYPES.includes(row.referenceType)) {
        entry.inputTax = this.round2(entry.inputTax + amount);
      }
      entry.netTax = this.round2(entry.outputTax - entry.inputTax);
    }

    const resultRows = Array.from(byRate.values());
    const totals = resultRows.reduce(
      (acc, r) => ({
        outputTax: this.round2(acc.outputTax + r.outputTax),
        inputTax: this.round2(acc.inputTax + r.inputTax),
        netTax: this.round2(acc.netTax + r.netTax),
      }),
      { outputTax: 0, inputTax: 0, netTax: 0 },
    );

    return { rows: resultRows, totals };
  }

  /**
   * Builds the withholding-tax report: all entries plus totals and a breakdown
   * by income-tax section.
   */
  public async getWithholdingTaxReport(filter: {
    fromDate?: string;
    toDate?: string;
  } = {}): Promise<IWithholdingTaxReport> {
    const query = this.withholdingTaxEntryModel()
      .query()
      .orderBy('date', 'desc')
      .orderBy('id', 'desc');

    if (filter.fromDate) {
      query.where('date', '>=', filter.fromDate);
    }
    if (filter.toDate) {
      query.where('date', '<=', filter.toDate);
    }
    const entries = await query;

    const totals = entries.reduce(
      (acc, e) => ({
        totalBase: this.round2(acc.totalBase + Number(e.baseAmount || 0)),
        totalWht: this.round2(acc.totalWht + Number(e.whtAmount || 0)),
        count: acc.count + 1,
      }),
      { totalBase: 0, totalWht: 0, count: 0 },
    );

    const sectionMap = new Map<
      string,
      { whtSection: string | null; totalWht: number; count: number }
    >();
    for (const e of entries) {
      const key = e.whtSection ?? '—';
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          whtSection: e.whtSection ?? null,
          totalWht: 0,
          count: 0,
        });
      }
      const s = sectionMap.get(key)!;
      s.totalWht = this.round2(s.totalWht + Number(e.whtAmount || 0));
      s.count += 1;
    }

    return { totals, bySection: Array.from(sectionMap.values()), entries };
  }
}
