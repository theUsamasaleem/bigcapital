import { Model } from 'objection';
import { BaseModel } from '@/models/Model';

/**
 * A single action taken on an approval request (approve / reject / return /
 * comment) at a given level — the full audit trail of who did what.
 */
export class ApprovalAction extends BaseModel {
  approvalRequestId!: number;
  level!: number;
  userId!: number | null;
  action!: string;
  comment!: string | null;
  actedAt!: Date | string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'approval_actions';
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
    const {
      ApprovalRequest,
    } = require('./ApprovalRequest.model');

    return {
      request: {
        relation: Model.BelongsToOneRelation,
        modelClass: ApprovalRequest,
        join: {
          from: 'approval_actions.approvalRequestId',
          to: 'approval_requests.id',
        },
      },
    };
  }
}
