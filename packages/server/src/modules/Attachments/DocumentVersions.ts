import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { ClsService } from 'nestjs-cls';
import { UnitOfWork } from '../Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { DocumentModel } from './models/Document.model';
import { DocumentVersionModel } from './models/DocumentVersion.model';

@Injectable()
export class DocumentVersions {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly cls: ClsService,

    @Inject(DocumentModel.name)
    private readonly documentModel: TenantModelProxy<typeof DocumentModel>,

    @Inject(DocumentVersionModel.name)
    private readonly documentVersionModel: TenantModelProxy<
      typeof DocumentVersionModel
    >,
  ) {}

  /**
   * Snapshots the document's current file into the versions history. The
   * current file remains in S3 (different key per upload) so it stays
   * retrievable from the version row.
   */
  private async snapshotCurrent(
    document: DocumentModel,
    trx?: Knex.Transaction,
  ) {
    await this.documentVersionModel().query(trx).insert({
      documentId: document.id,
      version: document.version ?? 1,
      key: document.key,
      mimeType: document.mimeType,
      size: document.size,
      originName: document.originName,
      uploadedByUserId: this.cls.get('userId') ?? null,
    });
  }

  /**
   * Uploads a new version of an existing document. The previously-current file
   * is snapshotted into the version history and the document is pointed at the
   * newly uploaded file with an incremented version number.
   * @param {string} documentKey - Current document key.
   * @param {any} file - The newly uploaded file (already stored in S3).
   * @returns {Promise<DocumentModel>}
   */
  async uploadVersion(documentKey: string, file: any) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const current = await this.documentModel()
        .query(trx)
        .findOne('key', documentKey);

      if (!current) {
        throw new NotFoundException('The given document was not found.');
      }
      await this.snapshotCurrent(current, trx);

      const nextVersion = (current.version ?? 1) + 1;
      await this.documentModel().query(trx).findById(current.id).patch({
        key: file.key,
        mimeType: file.mimetype,
        size: file.size,
        originName: file.originalname,
        version: nextVersion,
      });
      return this.documentModel().query(trx).findById(current.id);
    });
  }

  /**
   * Lists the version history of the given document, current version first.
   * @param {string} documentKey
   */
  async listVersions(documentKey: string) {
    const current = await this.documentModel()
      .query()
      .findOne('key', documentKey);

    if (!current) {
      throw new NotFoundException('The given document was not found.');
    }
    const history = await this.documentVersionModel()
      .query()
      .where('documentId', current.id)
      .orderBy('version', 'desc');

    return {
      current: {
        id: current.id,
        version: current.version ?? 1,
        key: current.key,
        mimeType: current.mimeType,
        size: current.size,
        originName: current.originName,
        isCurrent: true,
      },
      history,
    };
  }

  /**
   * Restores a previous version as the current file. The currently-current
   * file is snapshotted first, then the document is pointed at the chosen
   * version's file with a freshly incremented version number (non-destructive).
   * @param {string} documentKey - Current document key.
   * @param {number} versionId - The `document_versions` row id to restore.
   * @returns {Promise<DocumentModel>}
   */
  async restoreVersion(documentKey: string, versionId: number) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const current = await this.documentModel()
        .query(trx)
        .findOne('key', documentKey);

      if (!current) {
        throw new NotFoundException('The given document was not found.');
      }
      const target = await this.documentVersionModel()
        .query(trx)
        .findById(versionId);

      if (!target || target.documentId !== current.id) {
        throw new NotFoundException('The given document version was not found.');
      }
      await this.snapshotCurrent(current, trx);

      const nextVersion = (current.version ?? 1) + 1;
      await this.documentModel().query(trx).findById(current.id).patch({
        key: target.key,
        mimeType: target.mimeType,
        size: target.size,
        originName: target.originName,
        version: nextVersion,
      });
      return this.documentModel().query(trx).findById(current.id);
    });
  }
}
