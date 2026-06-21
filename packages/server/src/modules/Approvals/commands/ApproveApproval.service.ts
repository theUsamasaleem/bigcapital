import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { events } from '@/common/events/events';
import { ApprovalRequest } from '../models/ApprovalRequest.model';
import { ApproveApprovalDto } from '../dtos/Approval.dto';
import {
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
  ) {}

  /**
   * Approves the given pending approval request.
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

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onApprovalApproving` event.
      await this.eventPublisher.emitAsync(events.approval.onApproving, {
        oldApprovalRequest,
        trx,
      } as IApprovalApprovingPayload);

      const approvalRequest = await this.approvalRequestModel()
        .query(trx)
        .patchAndFetchById(approvalRequestId, {
          status: ApprovalStatus.Approved,
          approvedByUserId: currentUser.id,
          approvedAt: moment().toMySqlDateTime(),
          notes: dto.notes ?? oldApprovalRequest.notes,
        });

      // Triggers `onApprovalApproved` event.
      await this.eventPublisher.emitAsync(events.approval.onApproved, {
        oldApprovalRequest,
        approvalRequest,
        trx,
      } as IApprovalApprovedPayload);

      return approvalRequest;
    });
  }
}
