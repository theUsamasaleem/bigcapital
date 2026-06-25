import { BaseModel } from '@/models/Model';

/**
 * An amount-threshold rule that decides how many approval levels a document
 * needs. The matching rule with the lowest `priority` wins.
 */
export class ApprovalRule extends BaseModel {
  documentType!: string | null;
  minAmount!: number;
  maxAmount!: number | null;
  requiredLevels!: number;
  active!: boolean;
  priority!: number;
  description!: string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'approval_rules';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
