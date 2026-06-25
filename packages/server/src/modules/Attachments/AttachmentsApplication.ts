import { ForbiddenException, Injectable } from '@nestjs/common';
import { UploadDocument } from './UploadDocument';
import { DeleteAttachment } from './DeleteAttachment';
import { GetAttachment } from './GetAttachment';
import { LinkAttachment } from './LinkAttachment';
import { UnlinkAttachment } from './UnlinkAttachment';
import { GetAttachmentPresignedUrl } from './GetAttachmentPresignedUrl';
import { DocumentVersions } from './DocumentVersions';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

@Injectable()
export class AttachmentsApplication {
  constructor(
    private readonly uploadDocumentService: UploadDocument,
    private readonly deleteDocumentService: DeleteAttachment,
    private readonly getDocumentService: GetAttachment,
    private readonly linkDocumentService: LinkAttachment,
    private readonly unlinkDocumentService: UnlinkAttachment,
    private readonly getPresignedUrlService: GetAttachmentPresignedUrl,
    private readonly documentVersionsService: DocumentVersions,
    private readonly featuresManager: FeaturesManager,
  ) {}

  /**
   * Ensures the document versioning feature is enabled for the current tenant.
   */
  private async assertVersioningEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(
      Features.DOCUMENT_VERSIONING,
    );
    if (!enabled) {
      throw new ForbiddenException(
        'The document versioning feature is not enabled.',
      );
    }
  }

  /**
   * Saves the metadata of uploaded document to S3 on database.
   * @param {} file
   * @returns {Promise<Document>}
   */
  public upload(file: any) {
    return this.uploadDocumentService.upload(file);
  }

  /**
   * Deletes the give file attachment file key.
   * @param {string} documentKey
   * @returns {Promise<void>}
   */
  public delete(documentKey: string) {
    return this.deleteDocumentService.delete(documentKey);
  }

  /**
   * Retrieves the document data.
   * @param {string} documentKey
   */
  public get(documentKey: string) {
    return this.getDocumentService.getAttachment(documentKey);
  }

  /**
   * Links the given document to resource model.
   * @param {string} filekey
   * @param {string} modelRef
   * @param {number} modelId
   * @returns
   */
  public link(filekey: string, modelRef: string, modelId: number) {
    return this.linkDocumentService.link(filekey, modelRef, modelId);
  }

  /**
   * Unlinks the given document from resource model.
   * @param {string} filekey
   * @param {string} modelRef
   * @param {number} modelId
   * @returns
   */
  public unlink(filekey: string, modelRef: string, modelId: number) {
    return this.unlinkDocumentService.unlink(filekey, modelRef, modelId);
  }

  /**
   * Retrieves the presigned url of the given attachment key.
   * @param {string} key
   * @returns {Promise<string>}
   */
  public getPresignedUrl(key: string): Promise<string> {
    return this.getPresignedUrlService.getPresignedUrl(key);
  }

  /**
   * Uploads a new version of an existing document (versioning feature).
   * @param {string} documentKey
   * @param {any} file
   */
  public async uploadVersion(documentKey: string, file: any) {
    await this.assertVersioningEnabled();
    return this.documentVersionsService.uploadVersion(documentKey, file);
  }

  /**
   * Lists the version history of the given document (versioning feature).
   * @param {string} documentKey
   */
  public async listVersions(documentKey: string) {
    await this.assertVersioningEnabled();
    return this.documentVersionsService.listVersions(documentKey);
  }

  /**
   * Restores a previous version of a document (versioning feature).
   * @param {string} documentKey
   * @param {number} versionId
   */
  public async restoreVersion(documentKey: string, versionId: number) {
    await this.assertVersioningEnabled();
    return this.documentVersionsService.restoreVersion(documentKey, versionId);
  }
}
