import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { events } from '@/common/events/events';
import { ApprovalRequest } from '../models/ApprovalRequest.model';
import { RejectApprovalDto } from '../dtos/Approval.dto';
import {
  ApprovalStatus,
  IApprovalRejectedPayload,
  IApprovalRejectingPayload,
} from '../types/Approvals.types';

@Injectable()
export class RejectApprovalService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
    private readonly tenancyContext: TenancyContext,

    @Inject(ApprovalRequest.name)
    private readonly approvalRequestModel: TenantModelProxy<
      typeof ApprovalRequest
    >,
  ) {}

  /**
   * Rejects the given pending approval request.
   * @param {number} approvalRequestId
   * @param {RejectApprovalDto} dto
   * @returns {Promise<ApprovalRequest>}
   */
  public async reject(
    approvalRequestId: number,
    dto: RejectApprovalDto,
  ): Promise<ApprovalRequest> {
    const currentUser = await this.tenancyContext.getSystemUser();

    const oldApprovalRequest = await this.approvalRequestModel()
      .query()
      .findById(approvalRequestId)
      .throwIfNotFound();

    if (!oldApprovalRequest.isPending) {
      throw new BadRequestException(
        'Only a pending approval request can be rejected.',
      );
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onApprovalRejecting` event.
      await this.eventPublisher.emitAsync(events.approval.onRejecting, {
        oldApprovalRequest,
        trx,
      } as IApprovalRejectingPayload);

      const approvalRequest = await this.approvalRequestModel()
        .query(trx)
        .patchAndFetchById(approvalRequestId, {
          status: ApprovalStatus.Rejected,
          rejectedByUserId: currentUser.id,
          rejectedAt: moment().toMySqlDateTime(),
          reason: dto.reason,
          notes: dto.notes ?? oldApprovalRequest.notes,
        });

      // Triggers `onApprovalRejected` event.
      await this.eventPublisher.emitAsync(events.approval.onRejected, {
        oldApprovalRequest,
        approvalRequest,
        trx,
      } as IApprovalRejectedPayload);

      return approvalRequest;
    });
  }
}
