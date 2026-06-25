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
import { ReturnApprovalDto } from '../dtos/Approval.dto';
import {
  ApprovalActionType,
  ApprovalStatus,
  IApprovalReturnedPayload,
  IApprovalReturningPayload,
} from '../types/Approvals.types';

@Injectable()
export class ReturnApprovalService {
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
   * Returns a pending approval request to the requester for changes. The
   * progress is reset to level 0 so that, once corrected, it restarts the
   * approval chain.
   * @param {number} approvalRequestId
   * @param {ReturnApprovalDto} dto
   * @returns {Promise<ApprovalRequest>}
   */
  public async return(
    approvalRequestId: number,
    dto: ReturnApprovalDto,
  ): Promise<ApprovalRequest> {
    const currentUser = await this.tenancyContext.getSystemUser();

    const oldApprovalRequest = await this.approvalRequestModel()
      .query()
      .findById(approvalRequestId)
      .throwIfNotFound();

    if (!oldApprovalRequest.isPending) {
      throw new BadRequestException(
        'Only a pending approval request can be returned.',
      );
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onApprovalReturning` event.
      await this.eventPublisher.emitAsync(events.approval.onReturning, {
        oldApprovalRequest,
        trx,
      } as IApprovalReturningPayload);

      await this.approvalActionModel().query(trx).insert({
        approvalRequestId,
        level: (oldApprovalRequest.currentLevel ?? 0) + 1,
        userId: currentUser.id,
        action: ApprovalActionType.Return,
        comment: dto.comment,
        actedAt: moment().toMySqlDateTime(),
      });

      const approvalRequest = await this.approvalRequestModel()
        .query(trx)
        .patchAndFetchById(approvalRequestId, {
          status: ApprovalStatus.Returned,
          returnedByUserId: currentUser.id,
          returnedAt: moment().toMySqlDateTime(),
          currentLevel: 0,
        });

      // Triggers `onApprovalReturned` event.
      await this.eventPublisher.emitAsync(events.approval.onReturned, {
        oldApprovalRequest,
        approvalRequest,
        trx,
      } as IApprovalReturnedPayload);

      return approvalRequest;
    });
  }
}
