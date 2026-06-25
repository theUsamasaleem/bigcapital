import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaxType } from '../TaxRates.types';

export class CommandTaxRateDto {
  /**
   * Tax rate name.
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The name of the tax rate.', example: 'VAT' })
  name: string;

  /**
   * Tax rate code.
   */
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The code of the tax rate.', example: 'VAT' })
  code: string;

  /**
   * Tax rate percentage.
   */
  @IsNumber()
  @IsNotEmpty()
  @ToNumber()
  @ApiProperty({
    description: 'The rate of the tax rate.',
    example: 10,
  })
  rate: number;

  /**
   * Tax rate description.
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The description of the tax rate.',
    example: 'VAT',
  })
  description?: string;

  /**
   * Whether the tax is non-recoverable.
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  @ApiProperty({
    description: 'Whether the tax is non-recoverable.',
    example: false,
  })
  isNonRecoverable?: boolean;

  /**
   * Whether the tax is compound.
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  @ApiProperty({
    description: 'Whether the tax is compound.',
    example: false,
  })
  isCompound?: boolean;

  /**
   * Whether the tax rate is active.
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  @ApiProperty({
    description: 'Whether the tax rate is active.',
    example: false,
  })
  active?: boolean;

  /**
   * Pakistan tax type classification.
   */
  @IsEnum(TaxType)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Pakistan tax type: GST, SST, WHT or OTHER.',
    enum: TaxType,
    example: TaxType.GST,
  })
  taxType?: TaxType;

  /**
   * Tax jurisdiction (Federal or a province).
   */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Tax jurisdiction, e.g. Federal, Sindh, Punjab.',
    example: 'Federal',
  })
  jurisdiction?: string;

  /**
   * Whether this rate is a withholding tax (deducted at source).
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  @ApiPropertyOptional({
    description: 'Whether the rate is a withholding tax.',
    example: false,
  })
  isWithholding?: boolean;

  /**
   * Income Tax Ordinance section for withholding taxes.
   */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Withholding tax section, e.g. 153(1)(a).',
    example: '153(1)(a)',
  })
  whtSection?: string;

  /**
   * Free-form tax category, e.g. Goods, Services, Contract.
   */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Tax category, e.g. Goods, Services, Contract.',
    example: 'Services',
  })
  category?: string;
}

export class CreateTaxRateDto extends CommandTaxRateDto {}
export class EditTaxRateDto extends CommandTaxRateDto {}
