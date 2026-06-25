import mime from 'mime-types';
import { Response, NextFunction, Request } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  LinkAttachmentDto,
  UnlinkAttachmentDto,
  UploadAttachmentDto,
} from './dtos/Attachment.dto';
import { AttachmentsApplication } from './AttachmentsApplication';
import { AttachmentUploadPipeline } from './S3UploadPipeline';
import { FileInterceptor } from '@/common/interceptors/file.interceptor';
import { ConfigService } from '@nestjs/config';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { AttachmentAction } from './Attachments.types';

@ApiTags('Attachments')
@Controller('/attachments')
@ApiCommonHeaders()
export class AttachmentsController {
  /**
   * @param {AttachmentsApplication} attachmentsApplication - Attachments application.
   * @param uploadPipelineService
   */
  constructor(
    private readonly attachmentsApplication: AttachmentsApplication,
    private readonly uploadPipelineService: AttachmentUploadPipeline,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Uploads the attachments to S3 and store the file metadata to DB.
   */
  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload attachment to S3' })
  @ApiBody({ description: 'Upload attachment', type: UploadAttachmentDto })
  @ApiResponse({
    status: 200,
    description: 'The document has been uploaded successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - File upload failed',
  })
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new UnauthorizedException({
        errorType: 'FILE_UPLOAD_FAILED',
        message: 'Now file uploaded.',
      });
    }
    const data = await this.attachmentsApplication.upload(file);

    return {
      status: 200,
      message: 'The document has uploaded successfully.',
      data,
    };
  }

  /**
   * Retrieves the given attachment key.
   */
  @Get('/:id')
  @ApiOperation({ summary: 'Get attachment by ID' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Returns the attachment file' })
  @RequirePermission(AttachmentAction.View, AbilitySubject.Attachment)
  async getAttachment(
    @Res() res: Response,
    @Param('id') documentId: string,
  ): Promise<Response | void> {
    const data = await this.attachmentsApplication.get(documentId);

    const byte = await data.Body.transformToByteArray();
    const contentType = data.ContentType || 'application/octet-stream';
    const extension = mime.extension(contentType) || 'bin';
    const buffer = Buffer.from(byte);

    res.set('Content-Disposition', `filename="${documentId}.${extension}"`);
    res.set('Content-Type', contentType);
    res.send(buffer);
  }

  /**
   * Deletes the given document key.
   */
  @Delete('/:id')
  @ApiOperation({ summary: 'Delete attachment by ID' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 200,
    description: 'The document has been deleted successfully',
  })
  @RequirePermission(AttachmentAction.Delete, AbilitySubject.Attachment)
  async deleteAttachment(@Param('id') documentId: string) {
    await this.attachmentsApplication.delete(documentId);

    return {
      status: 200,
      message: 'The document has been delete successfully.',
    };
  }

  /**
   * Links the given document key.
   */
  @Post('/:id/link')
  @ApiOperation({ summary: 'Link attachment to a model' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiBody({ type: LinkAttachmentDto })
  @ApiResponse({
    status: 200,
    description: 'The document has been linked successfully',
  })
  async linkDocument(
    @Body() linkDocumentDto: LinkAttachmentDto,
    @Param('id') documentId: string,
  ) {
    await this.attachmentsApplication.link(
      documentId,
      linkDocumentDto.modelRef,
      linkDocumentDto.modelId,
    );

    return {
      status: 200,
      message: 'The document has been linked successfully.',
    };
  }

  /**
   * Links the given document key.
   */
  @Post('/:id/unlink')
  @ApiOperation({ summary: 'Unlink attachment from a model' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiBody({ type: UnlinkAttachmentDto })
  @ApiResponse({
    status: 200,
    description: 'The document has been unlinked successfully',
  })
  async unlinkDocument(
    @Body() unlinkDto: UnlinkAttachmentDto,
    @Param('id') documentId: string,
  ) {
    await this.attachmentsApplication.link(
      documentId,
      unlinkDto.modelRef,
      unlinkDto.modelId,
    );

    return {
      status: 200,
      message: 'The document has been linked successfully.',
    };
  }

  /**
   * Retreives the presigned url of the given attachment key.
   */
  @Get('/:id/presigned-url')
  @ApiOperation({ summary: 'Get presigned URL for attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the presigned URL for the attachment',
  })
  @RequirePermission(AttachmentAction.View, AbilitySubject.Attachment)
  async getAttachmentPresignedUrl(@Param('id') documentKey: string) {
    const presignedUrl =
      await this.attachmentsApplication.getPresignedUrl(documentKey);

    return { presignedUrl };
  }

  /**
   * Uploads a new version of an existing document (versioning feature).
   */
  @Post('/:id/versions')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new version of an attachment' })
  @ApiParam({ name: 'id', description: 'Current attachment key' })
  @ApiBody({ description: 'Upload new version', type: UploadAttachmentDto })
  @ApiResponse({
    status: 200,
    description: 'A new document version has been uploaded successfully',
  })
  async uploadAttachmentVersion(
    @Param('id') documentKey: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new UnauthorizedException({
        errorType: 'FILE_UPLOAD_FAILED',
        message: 'No file uploaded.',
      });
    }
    const data = await this.attachmentsApplication.uploadVersion(
      documentKey,
      file,
    );
    return {
      status: 200,
      message: 'A new document version has been uploaded successfully.',
      data,
    };
  }

  /**
   * Lists the version history of an attachment (versioning feature).
   */
  @Get('/:id/versions')
  @ApiOperation({ summary: 'List version history of an attachment' })
  @ApiParam({ name: 'id', description: 'Current attachment key' })
  @ApiResponse({ status: 200, description: 'Returns the version history' })
  @RequirePermission(AttachmentAction.View, AbilitySubject.Attachment)
  async getAttachmentVersions(@Param('id') documentKey: string) {
    const data = await this.attachmentsApplication.listVersions(documentKey);
    return { data };
  }

  /**
   * Restores a previous version of an attachment (versioning feature).
   */
  @Post('/:id/versions/:versionId/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a previous version of an attachment' })
  @ApiParam({ name: 'id', description: 'Current attachment key' })
  @ApiParam({ name: 'versionId', description: 'Document version id to restore' })
  @ApiResponse({
    status: 200,
    description: 'The document version has been restored successfully',
  })
  async restoreAttachmentVersion(
    @Param('id') documentKey: string,
    @Param('versionId') versionId: string,
  ) {
    const data = await this.attachmentsApplication.restoreVersion(
      documentKey,
      Number(versionId),
    );
    return {
      status: 200,
      message: 'The document version has been restored successfully.',
      data,
    };
  }
}
