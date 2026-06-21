import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ApprovalRequest } from '../models/ApprovalRequest.model';

@Injectable()
export class GetApprovalService {
  constructor(
    @Inject(ApprovalRequest.name)
    private readonly approvalRequestModel: TenantModelProxy<
      typeof ApprovalRequest
    >,
  ) {}

  /**
   * Retrieves the given approval request by id.
   * @param {number} approvalRequestId
   * @returns {Promise<ApprovalRequest>}
   */
  public async getApproval(
    approvalRequestId: number,
  ): Promise<ApprovalRequest> {
    return this.approvalRequestModel()
      .query()
      .findById(approvalRequestId)
      .throwIfNotFound();
  }

  /**
   * Retrieves the latest approval request attached to the given document.
   * Used by document publish/open gates.
   * @param {string} documentType
   * @param {number} documentId
   * @returns {Promise<ApprovalRequest | undefined>}
   */
  public async getLatestForDocument(
    documentType: string,
    documentId: number,
  ): Promise<ApprovalRequest | undefined> {
    return this.approvalRequestModel()
      .query()
      .modify('forDocument', documentType, documentId)
      .orderBy('created_at', 'desc')
      .first();
  }
}
