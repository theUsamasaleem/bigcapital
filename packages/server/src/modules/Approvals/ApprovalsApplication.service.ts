import { ForbiddenException, Injectable } from '@nestjs/common';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { RequestApprovalService } from './commands/RequestApproval.service';
import { ApproveApprovalService } from './commands/ApproveApproval.service';
import { RejectApprovalService } from './commands/RejectApproval.service';
import { ReturnApprovalService } from './commands/ReturnApproval.service';
import { CommentApprovalService } from './commands/CommentApproval.service';
import { ApprovalRulesService } from './commands/ApprovalRules.service';
import {
  GetApprovalsService,
  IGetApprovalsFilter,
} from './queries/GetApprovals.service';
import { GetApprovalService } from './queries/GetApproval.service';
import { ApprovalRequest } from './models/ApprovalRequest.model';
import { ApprovalRule } from './models/ApprovalRule.model';
import { ApprovalAction } from './models/ApprovalAction.model';
import {
  ApproveApprovalDto,
  CommentApprovalDto,
  RejectApprovalDto,
  RequestApprovalDto,
  ReturnApprovalDto,
} from './dtos/Approval.dto';

@Injectable()
export class ApprovalsApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly requestApprovalService: RequestApprovalService,
    private readonly approveApprovalService: ApproveApprovalService,
    private readonly rejectApprovalService: RejectApprovalService,
    private readonly returnApprovalService: ReturnApprovalService,
    private readonly commentApprovalService: CommentApprovalService,
    private readonly approvalRulesService: ApprovalRulesService,
    private readonly getApprovalsService: GetApprovalsService,
    private readonly getApprovalService: GetApprovalService,
  ) {}

  /**
   * Ensures the approvals feature is enabled for the current tenant.
   */
  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(Features.APPROVALS);

    if (!enabled) {
      throw new ForbiddenException('The approvals feature is not enabled.');
    }
  }

  /**
   * Creates a new pending approval request for the given document.
   */
  public async requestApproval(
    documentType: string,
    documentId: number,
    dto: RequestApprovalDto,
  ): Promise<ApprovalRequest> {
    await this.assertEnabled();
    return this.requestApprovalService.requestApproval(
      documentType,
      documentId,
      dto,
    );
  }

  /**
   * Approves the given approval request.
   */
  public async approve(
    approvalRequestId: number,
    dto: ApproveApprovalDto,
  ): Promise<ApprovalRequest> {
    await this.assertEnabled();
    return this.approveApprovalService.approve(approvalRequestId, dto);
  }

  /**
   * Rejects the given approval request.
   */
  public async reject(
    approvalRequestId: number,
    dto: RejectApprovalDto,
  ): Promise<ApprovalRequest> {
    await this.assertEnabled();
    return this.rejectApprovalService.reject(approvalRequestId, dto);
  }

  /**
   * Retrieves the approval requests, optionally filtered.
   */
  public async getApprovals(
    filter: IGetApprovalsFilter,
  ): Promise<ApprovalRequest[]> {
    await this.assertEnabled();
    return this.getApprovalsService.getApprovals(filter);
  }

  /**
   * Retrieves the given approval request by id.
   */
  public async getApproval(
    approvalRequestId: number,
  ): Promise<ApprovalRequest> {
    await this.assertEnabled();
    return this.getApprovalService.getApproval(approvalRequestId);
  }

  /**
   * Returns the given approval request to its requester.
   */
  public async returnRequest(
    approvalRequestId: number,
    dto: ReturnApprovalDto,
  ): Promise<ApprovalRequest> {
    await this.assertEnabled();
    return this.returnApprovalService.return(approvalRequestId, dto);
  }

  /**
   * Adds a comment to the given approval request.
   */
  public async comment(
    approvalRequestId: number,
    dto: CommentApprovalDto,
  ): Promise<ApprovalAction> {
    await this.assertEnabled();
    return this.commentApprovalService.comment(approvalRequestId, dto);
  }

  /**
   * Retrieves the action trail of the given approval request.
   */
  public async getActions(
    approvalRequestId: number,
  ): Promise<ApprovalAction[]> {
    await this.assertEnabled();
    return this.commentApprovalService.getActions(approvalRequestId);
  }

  /**
   * Lists the configured approval rules.
   */
  public async getRules(): Promise<ApprovalRule[]> {
    await this.assertEnabled();
    return this.approvalRulesService.getRules();
  }

  /**
   * Creates a new approval rule.
   */
  public async createRule(data: Partial<ApprovalRule>): Promise<ApprovalRule> {
    await this.assertEnabled();
    return this.approvalRulesService.createRule(data);
  }

  /**
   * Updates the given approval rule.
   */
  public async updateRule(
    id: number,
    data: Partial<ApprovalRule>,
  ): Promise<ApprovalRule> {
    await this.assertEnabled();
    return this.approvalRulesService.updateRule(id, data);
  }
}
