import { Knex } from 'knex';
import { ApprovalRequest } from '../models/ApprovalRequest.model';

/**
 * Approval request statuses.
 */
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Returned = 'returned',
}

/**
 * The kind of action recorded in the approval action trail.
 */
export enum ApprovalActionType {
  Approve = 'approve',
  Reject = 'reject',
  Return = 'return',
  Comment = 'comment',
}

/**
 * CASL abilities for the approvals subject.
 */
export enum ApprovalAction {
  View = 'View',
  Request = 'Request',
  Approve = 'Approve',
  Reject = 'Reject',
}

/**
 * Document types that support approvals.
 */
export enum ApprovalDocumentType {
  Bill = 'Bill',
  Expense = 'Expense',
  ManualJournal = 'ManualJournal',
}

// ---- Event payloads ----
export interface IApprovalRequestingPayload {
  documentType: string;
  documentId: number;
  trx?: Knex.Transaction;
}

export interface IApprovalRequestedPayload {
  approvalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}

export interface IApprovalApprovingPayload {
  oldApprovalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}

export interface IApprovalApprovedPayload {
  oldApprovalRequest: ApprovalRequest;
  approvalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}

export interface IApprovalRejectingPayload {
  oldApprovalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}

export interface IApprovalRejectedPayload {
  oldApprovalRequest: ApprovalRequest;
  approvalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}

export interface IApprovalReturningPayload {
  oldApprovalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}

export interface IApprovalReturnedPayload {
  oldApprovalRequest: ApprovalRequest;
  approvalRequest: ApprovalRequest;
  trx?: Knex.Transaction;
}
