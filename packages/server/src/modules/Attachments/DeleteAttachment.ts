import { Inject, Injectable } from '@nestjs/common';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Knex } from 'knex';
import { ConfigService } from '@nestjs/config';
import { UnitOfWork } from '../Tenancy/TenancyDB/UnitOfWork.service';
import { S3_CLIENT } from '../S3/S3.module';
import { DocumentModel } from './models/Document.model';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { DocumentLinkModel } from './models/DocumentLink.model';
import { DocumentVersionModel } from './models/DocumentVersion.model';

@Injectable()
export class DeleteAttachment {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly configService: ConfigService,

    @Inject(S3_CLIENT)
    private readonly s3Client: S3Client,

    @Inject(DocumentModel.name)
    private readonly documentModel: TenantModelProxy<typeof DocumentModel>,

    @Inject(DocumentLinkModel.name)
    private readonly documentLinkModel: TenantModelProxy<
      typeof DocumentLinkModel
    >,

    @Inject(DocumentVersionModel.name)
    private readonly documentVersionModel: TenantModelProxy<
      typeof DocumentVersionModel
    >,
  ) {}

  /**
   * Deletes the give file attachment file key.
   * @param {string} filekey
   */
  async delete(filekey: string): Promise<void> {
    const foundDocument = await this.documentModel()
      .query()
      .findOne('key', filekey)
      .throwIfNotFound();

    // Collect the previous-version file keys so their S3 objects can be
    // cleaned up alongside the current file.
    const versions = await this.documentVersionModel()
      .query()
      .where('documentId', foundDocument.id);

    const bucket = this.configService.get('s3.bucket');

    // Delete the current file from S3.
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: filekey }),
    );

    // Best-effort delete of every historical version file (never block the
    // record deletion on an S3 hiccup for an old object).
    for (const version of versions) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: version.key }),
        );
      } catch {
        // Ignore — the database rows are still removed below.
      }
    }

    await this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Delete all document version history.
      await this.documentVersionModel()
        .query(trx)
        .where('documentId', foundDocument.id)
        .delete();

      // Delete all document links
      await this.documentLinkModel()
        .query(trx)
        .where('documentId', foundDocument.id)
        .delete();

      // Delete thedocument.
      await this.documentModel().query(trx).findById(foundDocument.id).delete();
    });
  }
}
