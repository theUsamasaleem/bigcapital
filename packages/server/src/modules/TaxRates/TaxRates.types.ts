import { Knex } from 'knex';
import { TaxRateModel } from './models/TaxRate.model';

export interface ITaxRate {
  id?: number;
  name: string;
  code: string;
  rate: number;
  description: string;
  IsNonRecoverable: boolean;
  IsCompound: boolean;
  active: boolean;
}

export interface ICommonTaxRateDTO {
  name: string;
  code: string;
  rate: number;
  description: string;
  IsNonRecoverable: boolean;
  IsCompound: boolean;
  active: boolean;
}
export interface ICreateTaxRateDTO extends ICommonTaxRateDTO {}
export interface IEditTaxRateDTO extends ICommonTaxRateDTO {}

export interface ITaxRateCreatingPayload {
  createTaxRateDTO: ICreateTaxRateDTO;
  // tenantId: number;
  trx: Knex.Transaction;
}
export interface ITaxRateCreatedPayload {
  createTaxRateDTO: ICreateTaxRateDTO;
  taxRate: TaxRateModel;
  // tenantId: number;
  trx: Knex.Transaction;
}

export interface ITaxRateEditingPayload {
  oldTaxRate: TaxRateModel;
  editTaxRateDTO: IEditTaxRateDTO;
  // tenantId: number;
  trx: Knex.Transaction;
}
export interface ITaxRateEditedPayload {
  editTaxRateDTO: IEditTaxRateDTO;
  oldTaxRate: TaxRateModel;
  taxRate: TaxRateModel;
  // tenantId: number;
  trx: Knex.Transaction;
}

export interface ITaxRateDeletingPayload {
  oldTaxRate: TaxRateModel;
  // tenantId: number;
  trx: Knex.Transaction;
}

export interface ITaxRateActivatingPayload {
  taxRateId: number;
  // tenantId: number;
  trx: Knex.Transaction;
}
export interface ITaxRateActivatedPayload {
  taxRateId: number;
  // tenantId: number;
  trx: Knex.Transaction;
}

export interface ITaxRateDeletedPayload {
  oldTaxRate: TaxRateModel;
  // tenantId: number;
  trx: Knex.Transaction;
}

export interface ITaxTransaction {
  id?: number;
  taxRateId: number;
  referenceType: string;
  referenceId: number;
  rate: number;
  taxAccountId: number;
}

export enum TaxRateAction {
  CREATE = 'Create',
  EDIT = 'Edit',
  DELETE = 'Delete',
  VIEW = 'View',
}

/**
 * Pakistan tax classification (Phase 3a).
 * - GST: federal General Sales Tax on goods.
 * - SST: provincial Sales Tax on Services (Sindh/Punjab/KPK/Balochistan).
 * - WHT: Withholding Tax (income tax deducted at source).
 * - OTHER: any other/legacy rate.
 */
export enum TaxType {
  GST = 'GST',
  SST = 'SST',
  WHT = 'WHT',
  OTHER = 'OTHER',
}

export interface IWithholdingTaxEntry {
  id?: number;
  referenceType: string;
  referenceId: number;
  taxRateId?: number | null;
  whtSection?: string | null;
  contactId?: number | null;
  baseAmount: number;
  rate: number;
  whtAmount: number;
  certificateNo?: string | null;
  date?: string | null;
}

/**
 * Input for the WHT calculation engine.
 */
export interface IWithholdingTaxInput {
  baseAmount: number;
  rate: number;
}
