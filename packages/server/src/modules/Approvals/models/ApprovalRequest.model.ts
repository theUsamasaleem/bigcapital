import { Model } from 'objection';
import { BaseModel } from '@/models/Model';
import { InjectModelMeta } from '@/modules/Tenancy/TenancyModels/decorators/InjectModelMeta.decorator';
import { ApprovalRequestMeta } from './ApprovalRequest.meta';
import {
  ApprovalStatus,
} from '../types/Approvals.types';

@InjectModelMeta(ApprovalRequestMeta)
export class ApprovalRequest extends BaseModel {
  documentType!: string;
  documentId!: number;
  status!: string;
  amount!: number | null;
  requestedByUserId!: number | null;
  approvedByUserId!: number | null;
  rejectedByUserId!: number | null;
  returnedByUserId!: number | null;
  notes!: string | null;
  reason!: string | null;
  currentLevel!: number;
  requiredLevels!: number;
  requestedAt!: Date | string | null;
  approvedAt!: Date | string | null;
  rejectedAt!: Date | string | null;
  returnedAt!: Date | string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'approval_requests';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Virtual attributes.
   */
  static get virtualAttributes() {
    return ['isPending', 'isApproved', 'isRejected', 'isReturned'];
  }

  get isPending() {
    return this.status === ApprovalStatus.Pending;
  }

  get isApproved() {
    return this.status === ApprovalStatus.Approved;
  }

  get isRejected() {
    return this.status === ApprovalStatus.Rejected;
  }

  get isReturned() {
    return this.status === ApprovalStatus.Returned;
  }

  /**
   * Model modifiers.
   */
  static get modifiers() {
    return {
      /**
       * Filters the pending approval requests.
       */
      pending(query) {
        query.where('status', ApprovalStatus.Pending);
      },

      /**
       * Filters approval requests of the given document.
       * @param {Query} query
       * @param {string} documentType
       * @param {number} documentId
       */
      forDocument(query, documentType: string, documentId: number) {
        query
          .where('document_type', documentType)
          .where('document_id', documentId);
      },
    };
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const { ApprovalAction } = require('./ApprovalAction.model');

    return {
      /**
       * The action trail for this approval request.
       */
      actions: {
        relation: Model.HasManyRelation,
        modelClass: ApprovalAction,
        join: {
          from: 'approval_requests.id',
          to: 'approval_actions.approvalRequestId',
        },
      },
    };
  }
}
