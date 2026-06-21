import { Module } from '@nestjs/common';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { TenancyDatabaseModule } from '../Tenancy/TenancyDB/TenancyDB.module';
import { FeaturesModule } from '../Features/Features.module';
import { ApprovalsController } from './Approvals.controller';
import { ApprovalsApplication } from './ApprovalsApplication.service';
import { RequestApprovalService } from './commands/RequestApproval.service';
import { ApproveApprovalService } from './commands/ApproveApproval.service';
import { RejectApprovalService } from './commands/RejectApproval.service';
import { GetApprovalsService } from './queries/GetApprovals.service';
import { GetApprovalService } from './queries/GetApproval.service';

@Module({
  imports: [TenancyModule, TenancyDatabaseModule, FeaturesModule],
  controllers: [ApprovalsController],
  providers: [
    ApprovalsApplication,
    RequestApprovalService,
    ApproveApprovalService,
    RejectApprovalService,
    GetApprovalsService,
    GetApprovalService,
  ],
  exports: [ApprovalsApplication, GetApprovalService],
})
export class ApprovalsModule {}
