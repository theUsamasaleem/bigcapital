import { AuditLogService } from './AuditLog.service';

/**
 * Unit tests for the audit recording service, focused on the Phase 2
 * additions: module / old_values / new_values columns and the explicit
 * user/ip overrides used by the login flow.
 */
describe('AuditLogService.record', () => {
  let insertSpy: jest.Mock;
  let cls: { get: jest.Mock };
  let service: AuditLogService;

  const lastInsertArg = () => insertSpy.mock.calls[0][0];

  beforeEach(() => {
    insertSpy = jest.fn().mockResolvedValue(undefined);
    const modelProxy: any = () => ({
      query: () => ({ insert: insertSpy }),
    });
    cls = { get: jest.fn() };
    const tenantKnex: any = () => ({});
    service = new AuditLogService(cls as any, modelProxy, tenantKnex);
  });

  it('persists module, old_values and new_values', async () => {
    await service.record({
      action: 'approved',
      subject: 'Approval',
      subjectId: 7,
      module: 'Approvals',
      oldValues: { status: 'pending' },
      newValues: { status: 'approved' },
    });

    const row = lastInsertArg();
    expect(row.action).toBe('approved');
    expect(row.subject).toBe('Approval');
    expect(row.subjectId).toBe(7);
    expect(row.module).toBe('Approvals');
    expect(row.oldValues).toEqual({ status: 'pending' });
    expect(row.newValues).toEqual({ status: 'approved' });
  });

  it('falls back to CLS user id and ip when not overridden', async () => {
    cls.get.mockImplementation((key: string) =>
      key === 'userId' ? 42 : key === 'ip' ? '10.0.0.1' : undefined,
    );

    await service.record({ action: 'edited', subject: 'Bill' });

    const row = lastInsertArg();
    expect(row.userId).toBe(42);
    expect(row.ip).toBe('10.0.0.1');
  });

  it('uses the explicit user id override (login, pre-auth)', async () => {
    cls.get.mockReturnValue(undefined); // no CLS user yet at login

    await service.record({
      action: 'login',
      subject: 'Auth',
      module: 'Authentication',
      userId: 99,
    });

    const row = lastInsertArg();
    expect(row.userId).toBe(99);
  });

  it('defaults the new columns to null when omitted', async () => {
    await service.record({ action: 'created', subject: 'Customer' });

    const row = lastInsertArg();
    expect(row.module).toBeNull();
    expect(row.oldValues).toBeNull();
    expect(row.newValues).toBeNull();
  });
});
