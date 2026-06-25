import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';
import { TenantUser } from '@/modules/Tenancy/TenancyModels/models/TenantUser.model';

export class AuditLog extends TenantBaseModel {
  public tenantUser?: TenantUser;

  public id!: number;
  /** System user id (matches CLS `userId` / `users.system_user_id` in tenant DB). */
  public userId!: number | null;
  public action!: string;
  public subject!: string;
  public subjectId!: number | null;
  public module!: string | null;
  public oldValues!: Record<string, unknown> | null;
  public newValues!: Record<string, unknown> | null;
  public metadata!: Record<string, unknown> | null;
  public ip!: string | null;
  public createdAt!: Date | string;

  static get tableName() {
    return 'audit_logs';
  }

  static get jsonAttributes() {
    return ['metadata', 'oldValues', 'newValues'];
  }

  /**
   * No `updated_at`; `created_at` is set in AuditLogService.
   */
  get timestamps() {
    return [];
  }

  static get relationMappings() {
    return {
      tenantUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: TenantUser,
        join: {
          from: 'audit_logs.userId',
          to: 'users.systemUserId',
        },
      },
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['action', 'subject'],
      properties: {
        id: { type: 'integer' },
        userId: { type: ['integer', 'null'] },
        action: { type: 'string', maxLength: 64 },
        subject: { type: 'string', maxLength: 64 },
        subjectId: { type: ['integer', 'null'] },
        module: { type: ['string', 'null'], maxLength: 64 },
        oldValues: { type: ['object', 'null'] },
        newValues: { type: ['object', 'null'] },
        metadata: { type: ['object', 'null'] },
        ip: { type: ['string', 'null'], maxLength: 64 },
        // Stored as MySQL `YYYY-MM-DD HH:mm:ss` (see AuditLogService), not strict ISO-8601.
        createdAt: { type: 'string' },
      },
    };
  }
}
