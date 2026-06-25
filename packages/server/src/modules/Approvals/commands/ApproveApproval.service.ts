import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { events } from '@/common/events/events';
import { ApprovalRequest } from '../models/ApprovalRequest.model';
import { ApprovalAction } from '../models/ApprovalAction.model';
import { ApproveApprovalDto } from '../dtos/Approval.dto';
import {
  ApprovalActionType,
  ApprovalStatus,
  IApprovalApprovedPayload,
  IApprovalApprovingPayload,
} from '../types/Approvals.types';

@Injectable()
export class ApproveApprovalService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
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
   * Approves the current level of a pending approval request. When the last
   * required level is approved the request becomes Approved; otherwise it stays
   * Pending and advances to the next level. A user cannot approve more than one
   * level of the same request.
   * @param {number} approvalRequestId
   * @param {ApproveApprovalDto} dto
   * @returns {Promise<ApprovalRequest>}
   */
  public async approve(
    approvalRequestId: number,
    dto: ApproveApprovalDto = {},
  ): Promise<ApprovalRequest> {
    const currentUser = await this.tenancyContext.getSystemUser();

    const oldApprovalRequest = await this.approvalRequestModel()
      .query()
      .findById(approvalRequestId)
      .throwIfNotFound();

    if (!oldApprovalRequest.isPending) {
      throw new BadRequestException(
        'Only a pending approval request can be approved.',
      );
    }

    // A single user cannot satisfy two approval levels of the same request.
    const priorApproval = await this.approvalActionModel()
      .query()
      .where('approvalRequestId', approvalRequestId)
      .where('action', ApprovalActionType.Approve)
      .where('userId', currentUser.id)
      .first();

    if (priorApproval) {
      throw new BadRequestException(
        'You have already approved this request at an earlier level.',
      );
    }

    const nextLevel = (oldApprovalRequest.currentLevel ?? 0) + 1;
    const requiredLevels = oldApprovalRequest.requiredLevels ?? 1;
    const isFinal = nextLevel >= requiredLevels;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onApprovalApproving` event.
      await this.eventPublisher.emitAsync(events.approval.onApproving, {
        oldApprovalRequest,
        trx,
      } as IApprovalApprovingPayload);

      // Record the per-level action (trail + comment).
      await this.approvalActionModel().query(trx).insert({
        approvalRequestId,
        level: nextLevel,
        userId: currentUser.id,
        action: ApprovalActionType.Approve,
        comment: dto.notes ?? null,
        actedAt: moment().toMySqlDateTime(),
      });

      const patch: Record<string, unknown> = {
        currentLevel: nextLevel,
        notes: dto.notes ?? oldApprovalRequest.notes,
      };
      if (isFinal) {
        patch.status = ApprovalStatus.Approved;
        patch.approvedByUserId = currentUser.id;
        patch.approvedAt = moment().toMySqlDateTime();
      }

      const approvalRequest = await this.approvalRequestModel()
        .query(trx)
        .patchAndFetchById(approvalRequestId, patch);

      // Only emit the (final) approved event when the workflow completes, so
      // downstream side-effects (audit, posting) run once.
      if (isFinal) {
        await this.eventPublisher.emitAsync(events.approval.onApproved, {
          oldApprovalRequest,
          approvalRequest,
          trx,
        } as IApprovalApprovedPayload);
      }

      return approvalRequest;
    });
  }
}
