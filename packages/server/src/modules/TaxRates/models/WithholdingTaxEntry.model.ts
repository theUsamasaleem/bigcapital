import { Model } from 'objection';
import { BaseModel } from '@/models/Model';

/**
 * A withholding-tax (WHT) deduction recorded against a source document
 * (e.g. a Bill or Expense). Forms the WHT ledger used by the WHT report and
 * for issuing withholding certificates.
 */
export class WithholdingTaxEntry extends BaseModel {
  public id!: number;
  public referenceType!: string;
  public referenceId!: number;
  public taxRateId!: number | null;
  public whtSection!: string | null;
  public contactId!: number | null;
  public baseAmount!: number;
  public rate!: number;
  public whtAmount!: number;
  public certificateNo!: string | null;
  public date!: string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'withholding_tax_entries';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const { TaxRateModel } = require('./TaxRate.model');

    return {
      /**
       * Belongs to the withholding tax rate.
       */
      taxRate: {
        relation: Model.BelongsToOneRelation,
        modelClass: TaxRateModel,
        join: {
          from: 'withholding_tax_entries.taxRateId',
          to: 'tax_rates.id',
        },
      },
    };
  }
}
