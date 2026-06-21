import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ApprovalRequest } from '../models/ApprovalRequest.model';

export interface IGetApprovalsFilter {
  status?: string;
  documentType?: string;
  documentId?: number;
}

@Injectable()
export class GetApprovalsService {
  constructor(
    @Inject(ApprovalRequest.name)
    private readonly approvalRequestModel: TenantModelProxy<
      typeof ApprovalRequest
    >,
  ) {}

  /**
   * Retrieves the approval requests, optionally filtered.
   * @param {IGetApprovalsFilter} filter
   * @returns {Promise<ApprovalRequest[]>}
   */
  public async getApprovals(
    filter: IGetApprovalsFilter = {},
  ): Promise<ApprovalRequest[]> {
    return this.approvalRequestModel()
      .query()
      .onBuild((query) => {
        if (filter.status) {
          query.where('status', filter.status);
        }
        if (filter.documentType) {
          query.where('document_type', filter.documentType);
        }
        if (filter.documentId) {
          query.where('document_id', filter.documentId);
        }
        query.orderBy('created_at', 'desc');
      });
  }
}
