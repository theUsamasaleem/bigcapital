import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class RecordWithholdingTaxDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Source document type, e.g. Bill, Expense.' })
  referenceType: string;

  @IsNumber()
  @IsNotEmpty()
  @ToNumber()
  @ApiProperty({ description: 'Source document id.' })
  referenceId: number;

  @IsNumber()
  @IsNotEmpty()
  @ToNumber()
  @ApiProperty({ description: 'Taxable base amount.' })
  baseAmount: number;

  @IsNumber()
  @IsNotEmpty()
  @ToNumber()
  @ApiProperty({ description: 'Withholding rate percentage.', example: 4.5 })
  rate: number;

  @IsNumber()
  @IsOptional()
  @ToNumber()
  @ApiPropertyOptional({ description: 'Withholding tax rate id.' })
  taxRateId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Income tax section, e.g. 153(1)(a).' })
  whtSection?: string;

  @IsNumber()
  @IsOptional()
  @ToNumber()
  @ApiPropertyOptional({ description: 'Contact (vendor) id.' })
  contactId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Withholding certificate number.' })
  certificateNo?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Deduction date (YYYY-MM-DD).' })
  date?: string;
}
