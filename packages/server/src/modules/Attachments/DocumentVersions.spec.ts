import { NotFoundException } from '@nestjs/common';
import { DocumentVersions } from './DocumentVersions';

/**
 * Unit tests for the Phase 2 document-versioning service: uploading a new
 * version snapshots the current file, restore is non-destructive, and missing
 * documents / versions are rejected.
 */
describe('DocumentVersions', () => {
  let insertSpy: jest.Mock;
  let patchSpy: jest.Mock;
  let cls: { get: jest.Mock };
  let uow: { withTransaction: jest.Mock };

  const current = {
    id: 5,
    version: 2,
    key: 'org/old-key',
    mimeType: 'application/pdf',
    size: 100,
    originName: 'old.pdf',
  };
  const updated = { ...current, version: 3, key: 'org/new-key' };

  const build = (opts: { doc?: any; versionRow?: any } = {}) => {
    insertSpy = jest.fn().mockResolvedValue(undefined);
    patchSpy = jest.fn().mockResolvedValue(1);
    cls = { get: jest.fn().mockReturnValue(77) };
    uow = {
      withTransaction: jest.fn((cb: any) => cb(undefined)),
    };

    const doc = 'doc' in opts ? opts.doc : current;

    const findByIdResult: any = {
      patch: patchSpy,
      then: (resolve: any) => resolve(updated),
    };
    const docQuery = {
      findOne: jest.fn().mockResolvedValue(doc),
      findById: jest.fn().mockReturnValue(findByIdResult),
    };
    const versionQuery = {
      insert: insertSpy,
      findById: jest.fn().mockResolvedValue(opts.versionRow),
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([{ id: 1, version: 1 }]),
      }),
    };
    const documentModel: any = () => ({ query: () => docQuery });
    const documentVersionModel: any = () => ({ query: () => versionQuery });

    const service = new DocumentVersions(
      uow as any,
      cls as any,
      documentModel,
      documentVersionModel,
    );
    return { service };
  };

  it('uploadVersion snapshots the current file and patches the new one', async () => {
    const { service } = build();

    const result = await service.uploadVersion('org/old-key', {
      key: 'org/new-key',
      mimetype: 'application/pdf',
      size: 200,
      originalname: 'new.pdf',
    });

    // Snapshot of the previously-current file.
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 5,
        version: 2,
        key: 'org/old-key',
        uploadedByUserId: 77,
      }),
    );
    // The document now points at the new file with an incremented version.
    expect(patchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'org/new-key',
        version: 3,
        originName: 'new.pdf',
      }),
    );
    expect(result).toEqual(updated);
  });

  it('uploadVersion throws when the document is not found', async () => {
    const { service } = build({ doc: undefined });

    await expect(
      service.uploadVersion('missing', { key: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('restoreVersion rejects a version belonging to another document', async () => {
    const { service } = build({ versionRow: { id: 9, documentId: 999 } });

    await expect(
      service.restoreVersion('org/old-key', 9),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('restoreVersion snapshots current then points at the restored file', async () => {
    const { service } = build({
      versionRow: {
        id: 9,
        documentId: 5,
        version: 1,
        key: 'org/v1-key',
        mimeType: 'application/pdf',
        size: 50,
        originName: 'v1.pdf',
      },
    });

    await service.restoreVersion('org/old-key', 9);

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'org/old-key', version: 2 }),
    );
    expect(patchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'org/v1-key', version: 3 }),
    );
  });
});
