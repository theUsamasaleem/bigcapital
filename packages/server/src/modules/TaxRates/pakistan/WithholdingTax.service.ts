import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { WithholdingTaxEntry } from '../models/WithholdingTaxEntry.model';
import { WithholdingTaxCalculator } from './WithholdingTaxCalculator';

export interface IRecordWithholdingTaxParams {
  referenceType: string;
  referenceId: number;
  baseAmount: number;
  rate: number;
  taxRateId?: number | null;
  whtSection?: string | null;
  contactId?: number | null;
  certificateNo?: string | null;
  date?: string | null;
}

export interface IGetWithholdingTaxFilter {
  referenceType?: string;
  referenceId?: number;
  contactId?: number;
  fromDate?: string;
  toDate?: string;
}

/**
 * Records and retrieves withholding-tax entries (the WHT ledger).
 */
@Injectable()
export class WithholdingTaxService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly calculator: WithholdingTaxCalculator,

    @Inject(WithholdingTaxEntry.name)
    private readonly withholdingTaxEntryModel: TenantModelProxy<
      typeof WithholdingTaxEntry
    >,
  ) {}

  /**
   * Records a withholding-tax deduction for a source document. The WHT amount
   * is computed by the calculation engine from the base amount and rate.
   * @param {IRecordWithholdingTaxParams} params
   * @param {Knex.Transaction} [trx]
   * @returns {Promise<WithholdingTaxEntry>}
   */
  public async record(
    params: IRecordWithholdingTaxParams,
    trx?: Knex.Transaction,
  ): Promise<WithholdingTaxEntry> {
    const { whtAmount } = this.calculator.calculate({
      baseAmount: params.baseAmount,
      rate: params.rate,
    });

    const insert = async (boundTrx: Knex.Transaction) =>
      this.withholdingTaxEntryModel().query(boundTrx).insertAndFetch({
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        taxRateId: params.taxRateId ?? null,
        whtSection: params.whtSection ?? null,
        contactId: params.contactId ?? null,
        baseAmount: params.baseAmount,
        rate: params.rate,
        whtAmount,
        certificateNo: params.certificateNo ?? null,
        date: params.date ?? null,
      });

    if (trx) {
      return insert(trx);
    }
    return this.uow.withTransaction((boundTrx: Knex.Transaction) =>
      insert(boundTrx),
    );
  }

  /**
   * Retrieves withholding-tax entries, optionally filtered.
   * @param {IGetWithholdingTaxFilter} filter
   * @returns {Promise<WithholdingTaxEntry[]>}
   */
  public async getEntries(
    filter: IGetWithholdingTaxFilter = {},
  ): Promise<WithholdingTaxEntry[]> {
    const query = this.withholdingTaxEntryModel().query().orderBy('id', 'desc');

    if (filter.referenceType) {
      query.where('referenceType', filter.referenceType);
    }
    if (filter.referenceId) {
      query.where('referenceId', filter.referenceId);
    }
    if (filter.contactId) {
      query.where('contactId', filter.contactId);
    }
    if (filter.fromDate) {
      query.where('date', '>=', filter.fromDate);
    }
    if (filter.toDate) {
      query.where('date', '<=', filter.toDate);
    }
    return query;
  }
}
