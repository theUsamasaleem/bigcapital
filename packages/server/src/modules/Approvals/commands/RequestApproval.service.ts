import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { events } from '@/common/events/events';
import { ApprovalRequest } from '../models/ApprovalRequest.model';
import { ApprovalRulesService } from './ApprovalRules.service';
import { RequestApprovalDto } from '../dtos/Approval.dto';
import {
  ApprovalStatus,
  IApprovalRequestedPayload,
  IApprovalRequestingPayload,
} from '../types/Approvals.types';

@Injectable()
export class RequestApprovalService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
    private readonly tenancyContext: TenancyContext,
    private readonly approvalRulesService: ApprovalRulesService,

    @Inject(ApprovalRequest.name)
    private readonly approvalRequestModel: TenantModelProxy<
      typeof ApprovalRequest
    >,
  ) {}

  /**
   * Creates a new pending approval request for the given document.
   * @param {string} documentType
   * @param {number} documentId
   * @param {RequestApprovalDto} dto
   * @returns {Promise<ApprovalRequest>}
   */
  public async requestApproval(
    documentType: string,
    documentId: number,
    dto: RequestApprovalDto = {},
  ): Promise<ApprovalRequest> {
    const currentUser = await this.tenancyContext.getSystemUser();

    // Resolve how many approval levels this document needs from the configured
    // amount-threshold rules (e.g. <=100k = 1 level, >100k = 2 levels).
    const requiredLevels = await this.approvalRulesService.resolveRequiredLevels(
      documentType,
      dto.amount ?? 0,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onApprovalRequesting` event.
      await this.eventPublisher.emitAsync(events.approval.onRequesting, {
        documentType,
        documentId,
        trx,
      } as IApprovalRequestingPayload);

      const approvalRequest = await this.approvalRequestModel()
        .query(trx)
        .insertAndFetch({
          documentType,
          documentId,
          status: ApprovalStatus.Pending,
          amount: dto.amount ?? null,
          notes: dto.notes ?? null,
          requestedByUserId: currentUser.id,
          requestedAt: moment().toMySqlDateTime(),
          currentLevel: 0,
          requiredLevels,
        });

      // Triggers `onApprovalRequested` event.
      await this.eventPublisher.emitAsync(events.approval.onRequested, {
        approvalRequest,
        trx,
      } as IApprovalRequestedPayload);

      return approvalRequest;
    });
  }
}
