import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ApprovalsApplication } from './ApprovalsApplication.service';
import { ApprovalAction } from './types/Approvals.types';
import {
  ApproveApprovalDto,
  RejectApprovalDto,
  RequestApprovalDto,
} from './dtos/Approval.dto';

@Controller('approvals')
@ApiTags('Approvals')
@ApiCommonHeaders()
export class ApprovalsController {
  constructor(private readonly approvalsApplication: ApprovalsApplication) {}

  @Get()
  @RequirePermission(ApprovalAction.View, AbilitySubject.Approval)
  @ApiOperation({ summary: 'Retrieves the approval requests.' })
  @ApiResponse({ status: 200, description: 'Approval requests retrieved.' })
  getApprovals(
    @Query('status') status?: string,
    @Query('documentType') documentType?: string,
    @Query('documentId') documentId?: string,
    @Query('document_type') documentTypeSnake?: string,
    @Query('document_id') documentIdSnake?: string,
  ) {
    const docType = documentType ?? documentTypeSnake;
    const docId = documentId ?? documentIdSnake;

    return this.approvalsApplication.getApprovals({
      status,
      documentType: docType,
      documentId: docId ? Number(docId) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(ApprovalAction.View, AbilitySubject.Approval)
  @ApiOperation({ summary: 'Retrieves the given approval request.' })
  @ApiResponse({ status: 200, description: 'Approval request retrieved.' })
  @ApiResponse({ status: 404, description: 'Approval request not found.' })
  getApproval(@Param('id') id: string) {
    return this.approvalsApplication.getApproval(Number(id));
  }

  @Post(':documentType/:documentId/request')
  @RequirePermission(ApprovalAction.Request, AbilitySubject.Approval)
  @ApiOperation({ summary: 'Requests approval for the given document.' })
  @ApiResponse({ status: 201, description: 'Approval request created.' })
  requestApproval(
    @Param('documentType') documentType: string,
    @Param('documentId') documentId: string,
    @Body() dto: RequestApprovalDto,
  ) {
    return this.approvalsApplication.requestApproval(
      documentType,
      Number(documentId),
      dto,
    );
  }

  @Put(':id/approve')
  @RequirePermission(ApprovalAction.Approve, AbilitySubject.Approval)
  @ApiOperation({ summary: 'Approves the given approval request.' })
  @ApiResponse({ status: 200, description: 'Approval request approved.' })
  @ApiResponse({ status: 404, description: 'Approval request not found.' })
  approve(@Param('id') id: string, @Body() dto: ApproveApprovalDto) {
    return this.approvalsApplication.approve(Number(id), dto);
  }

  @Put(':id/reject')
  @RequirePermission(ApprovalAction.Reject, AbilitySubject.Approval)
  @ApiOperation({ summary: 'Rejects the given approval request.' })
  @ApiResponse({ status: 200, description: 'Approval request rejected.' })
  @ApiResponse({ status: 404, description: 'Approval request not found.' })
  reject(@Param('id') id: string, @Body() dto: RejectApprovalDto) {
    return this.approvalsApplication.reject(Number(id), dto);
  }
}
