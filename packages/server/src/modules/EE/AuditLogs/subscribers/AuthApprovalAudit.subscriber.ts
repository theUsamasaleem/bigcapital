import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { AuditLogService } from '../AuditLog.service';
import {
  IApprovalApprovedPayload,
  IApprovalRejectedPayload,
  IApprovalReturnedPayload,
} from '@/modules/Approvals/types/Approvals.types';

interface SignInAuditPayload {
  userId: number | null;
  email?: string;
  tenantId?: number;
  organizationId?: string;
}

interface SignOutAuditPayload {
  userId: number | null;
}

/**
 * Records authentication (login/logout) and approval-workflow events into the
 * audit trail. Every handler swallows its own errors so an audit failure can
 * never break a login, logout, or approval action.
 */
@Injectable()
export class AuthApprovalAuditSubscriber {
  private readonly logger = new Logger(AuthApprovalAuditSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(events.auth.signIn)
  async onSignIn(payload: SignInAuditPayload) {
    try {
      await this.auditLog.record({
        action: 'login',
        subject: 'Auth',
        module: 'Authentication',
        userId: payload?.userId ?? null,
        metadata: { email: payload?.email ?? null },
      });
    } catch (error) {
      this.logger.warn(`Failed to record login audit: ${error?.message}`);
    }
  }

  @OnEvent(events.auth.signOut)
  async onSignOut(payload: SignOutAuditPayload) {
    try {
      await this.auditLog.record({
        action: 'logout',
        subject: 'Auth',
        module: 'Authentication',
        userId: payload?.userId ?? null,
      });
    } catch (error) {
      this.logger.warn(`Failed to record logout audit: ${error?.message}`);
    }
  }

  @OnEvent(events.approval.onApproved)
  async onApprovalApproved(payload: IApprovalApprovedPayload) {
    try {
      const { oldApprovalRequest: prev, approvalRequest: next, trx } = payload;
      await this.auditLog.record({
        trx,
        action: 'approved',
        subject: 'Approval',
        subjectId: next?.id ?? null,
        module: 'Approvals',
        oldValues: { status: prev?.status ?? null },
        newValues: {
          status: next?.status ?? null,
          approvedByUserId: next?.approvedByUserId ?? null,
        },
        metadata: {
          documentType: next?.documentType ?? null,
          documentId: next?.documentId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record approval audit: ${error?.message}`);
    }
  }

  @OnEvent(events.approval.onRejected)
  async onApprovalRejected(payload: IApprovalRejectedPayload) {
    try {
      const { oldApprovalRequest: prev, approvalRequest: next, trx } = payload;
      await this.auditLog.record({
        trx,
        action: 'rejected',
        subject: 'Approval',
        subjectId: next?.id ?? null,
        module: 'Approvals',
        oldValues: { status: prev?.status ?? null },
        newValues: {
          status: next?.status ?? null,
          reason: next?.reason ?? null,
          rejectedByUserId: next?.rejectedByUserId ?? null,
        },
        metadata: {
          documentType: next?.documentType ?? null,
          documentId: next?.documentId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record rejection audit: ${error?.message}`);
    }
  }

  @OnEvent(events.approval.onReturned)
  async onApprovalReturned(payload: IApprovalReturnedPayload) {
    try {
      const { oldApprovalRequest: prev, approvalRequest: next, trx } = payload;
      await this.auditLog.record({
        trx,
        action: 'returned',
        subject: 'Approval',
        subjectId: next?.id ?? null,
        module: 'Approvals',
        oldValues: { status: prev?.status ?? null },
        newValues: {
          status: next?.status ?? null,
          returnedByUserId: next?.returnedByUserId ?? null,
        },
        metadata: {
          documentType: next?.documentType ?? null,
          documentId: next?.documentId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record return audit: ${error?.message}`);
    }
  }
}
