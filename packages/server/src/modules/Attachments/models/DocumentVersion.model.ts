import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * A historical (or restored-from) version of a document. The current file is
 * always held on the `documents` row; every superseded file is snapshotted
 * here so it remains downloadable and a previous version can be restored.
 */
export class DocumentVersionModel extends TenantBaseModel {
  documentId!: number;
  version!: number;
  key!: string;
  mimeType!: string;
  size!: number;
  originName!: string;
  uploadedByUserId!: number | null;

  /**
   * Table name
   */
  static get tableName() {
    return 'document_versions';
  }

  /**
   * Model timestamps.
   */
  get timestamps() {
    return ['createdAt'];
  }
}
