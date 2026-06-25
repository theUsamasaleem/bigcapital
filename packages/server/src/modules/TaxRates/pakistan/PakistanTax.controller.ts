import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { TaxRateAction } from '../TaxRates.types';
import { WithholdingTaxService } from './WithholdingTax.service';
import { TaxReportsService } from './TaxReports.service';
import { WithholdingTaxCalculator } from './WithholdingTaxCalculator';
import { RecordWithholdingTaxDto } from '../dtos/WithholdingTax.dto';

@Controller('tax')
@ApiTags('Pakistan Tax')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class PakistanTaxController {
  constructor(
    private readonly withholdingTaxService: WithholdingTaxService,
    private readonly taxReportsService: TaxReportsService,
    private readonly calculator: WithholdingTaxCalculator,
  ) {}

  /**
   * Previews a withholding-tax calculation without persisting it.
   */
  @Get('withholding/calculate')
  @RequirePermission(TaxRateAction.VIEW, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Preview a withholding tax calculation.' })
  @ApiResponse({ status: 200, description: 'WHT calculation result.' })
  calculateWithholding(
    @Query('baseAmount') baseAmount: string,
    @Query('rate') rate: string,
  ) {
    return this.calculator.calculate({
      baseAmount: Number(baseAmount),
      rate: Number(rate),
    });
  }

  /**
   * Records a withholding-tax deduction.
   */
  @Post('withholding')
  @RequirePermission(TaxRateAction.CREATE, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Record a withholding tax deduction.' })
  @ApiResponse({ status: 201, description: 'WHT entry recorded.' })
  recordWithholding(@Body() dto: RecordWithholdingTaxDto) {
    return this.withholdingTaxService.record(dto);
  }

  /**
   * Lists withholding-tax entries.
   */
  @Get('withholding')
  @RequirePermission(TaxRateAction.VIEW, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'List withholding tax entries.' })
  @ApiResponse({ status: 200, description: 'WHT entries retrieved.' })
  getWithholding(
    @Query('referenceType') referenceType?: string,
    @Query('contactId') contactId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.withholdingTaxService.getEntries({
      referenceType,
      contactId: contactId ? Number(contactId) : undefined,
      fromDate,
      toDate,
    });
  }

  /**
   * GST/SST liability summary (output vs input tax).
   */
  @Get('reports/tax-liability')
  @RequirePermission(TaxRateAction.VIEW, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'GST/SST tax liability summary.' })
  @ApiResponse({ status: 200, description: 'Tax liability summary.' })
  getTaxLiability() {
    return this.taxReportsService.getTaxLiabilitySummary();
  }

  /**
   * Withholding tax report.
   */
  @Get('reports/withholding')
  @RequirePermission(TaxRateAction.VIEW, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Withholding tax report.' })
  @ApiResponse({ status: 200, description: 'WHT report.' })
  getWithholdingReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.taxReportsService.getWithholdingTaxReport({ fromDate, toDate });
  }
}
