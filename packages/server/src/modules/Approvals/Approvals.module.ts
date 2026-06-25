import { Module } from '@nestjs/common';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { TenancyDatabaseModule } from '../Tenancy/TenancyDB/TenancyDB.module';
import { FeaturesModule } from '../Features/Features.module';
import { ApprovalsController } from './Approvals.controller';
import { ApprovalsApplication } from './ApprovalsApplication.service';
import { RequestApprovalService } from './commands/RequestApproval.service';
import { ApproveApprovalService } from './commands/ApproveApproval.service';
import { RejectApprovalService } from './commands/RejectApproval.service';
import { ReturnApprovalService } from './commands/ReturnApproval.service';
import { CommentApprovalService } from './commands/CommentApproval.service';
import { ApprovalRulesService } from './commands/ApprovalRules.service';
import { GetApprovalsService } from './queries/GetApprovals.service';
import { GetApprovalService } from './queries/GetApproval.service';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { ApprovalRule } from './models/ApprovalRule.model';
import { ApprovalAction } from './models/ApprovalAction.model';

const models = [
  RegisterTenancyModel(ApprovalRule),
  RegisterTenancyModel(ApprovalAction),
];

@Module({
  imports: [TenancyModule, TenancyDatabaseModule, FeaturesModule, ...models],
  controllers: [ApprovalsController],
  providers: [
    ApprovalsApplication,
    RequestApprovalService,
    ApproveApprovalService,
    RejectApprovalService,
    ReturnApprovalService,
    CommentApprovalService,
    ApprovalRulesService,
    GetApprovalsService,
    GetApprovalService,
  ],
  exports: [ApprovalsApplication, GetApprovalService, ...models],
})
export class ApprovalsModule {}
