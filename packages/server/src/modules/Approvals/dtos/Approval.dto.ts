import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class RequestApprovalDto {
  @ApiPropertyOptional({
    description: 'Monetary amount of the document (for threshold rules).',
    example: 1500,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Optional note attached to the approval request.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveApprovalDto {
  @ApiPropertyOptional({
    description: 'Optional note from the approver.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectApprovalDto {
  @ApiPropertyOptional({
    description: 'Reason for rejecting the approval request.',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Optional note from the approver.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
