import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DocumentModel extends TenantBaseModel {
  originName!: string;
  size!: number;
  mimeType!: string;
  key!: string;
  version!: number;

  /**
   * Table name
   */
  static get tableName() {
    return 'documents';
  }

  /**
   * Model timestamps.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const { DocumentVersionModel } = require('./DocumentVersion.model');

    return {
      /**
       * Document historical versions.
       */
      versions: {
        relation: Model.HasManyRelation,
        modelClass: DocumentVersionModel,
        join: {
          from: 'documents.id',
          to: 'document_versions.documentId',
        },
      },
    };
  }
}
