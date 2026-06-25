import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ApprovalRequest } from '../models/ApprovalRequest.model';
import { ApprovalAction } from '../models/ApprovalAction.model';
import { CommentApprovalDto } from '../dtos/Approval.dto';
import { ApprovalActionType } from '../types/Approvals.types';

@Injectable()
export class CommentApprovalService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(ApprovalRequest.name)
    private readonly approvalRequestModel: TenantModelProxy<
      typeof ApprovalRequest
    >,

    @Inject(ApprovalAction.name)
    private readonly approvalActionModel: TenantModelProxy<
      typeof ApprovalAction
    >,
  ) {}

  /**
   * Adds a free-form comment to an approval request without changing its
   * status. Works on requests in any state.
   * @param {number} approvalRequestId
   * @param {CommentApprovalDto} dto
   * @returns {Promise<ApprovalAction>}
   */
  public async comment(
    approvalRequestId: number,
    dto: CommentApprovalDto,
  ): Promise<ApprovalAction> {
    const currentUser = await this.tenancyContext.getSystemUser();

    const request = await this.approvalRequestModel()
      .query()
      .findById(approvalRequestId)
      .throwIfNotFound();

    return this.approvalActionModel().query().insertAndFetch({
      approvalRequestId,
      level: request.currentLevel ?? 0,
      userId: currentUser.id,
      action: ApprovalActionType.Comment,
      comment: dto.comment,
      actedAt: moment().toMySqlDateTime(),
    });
  }

  /**
   * Lists the action trail (incl. comments) for an approval request.
   * @param {number} approvalRequestId
   * @returns {Promise<ApprovalAction[]>}
   */
  public async getActions(
    approvalRequestId: number,
  ): Promise<ApprovalAction[]> {
    return this.approvalActionModel()
      .query()
      .where('approvalRequestId', approvalRequestId)
      .orderBy('id', 'asc');
  }
}
