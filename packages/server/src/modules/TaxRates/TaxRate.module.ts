import { Module } from '@nestjs/common';
import { TaxRatesController } from './TaxRate.controller';
import { CreateTaxRate } from './commands/CreateTaxRate.service';
import { InactivateTaxRateService } from './commands/InactivateTaxRate';
import { ActivateTaxRateService } from './commands/ActivateTaxRate.service';
import { GetTaxRateService } from './queries/GetTaxRate.service';
import { DeleteTaxRateService } from './commands/DeleteTaxRate.service';
import { EditTaxRateService } from './commands/EditTaxRate.service';
import { CommandTaxRatesValidators } from './commands/CommandTaxRatesValidator.service';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { TaxRatesApplication } from './TaxRate.application';
import { ItemEntriesTaxTransactions } from './ItemEntriesTaxTransactions.service';
import { GetTaxRatesService } from './queries/GetTaxRates.service';
import { WriteBillTaxTransactionsSubscriber } from './subscribers/WriteBillTaxTransactionsSubscriber';
import { WriteInvoiceTaxTransactionsSubscriber } from './subscribers/WriteInvoiceTaxTransactionsSubscriber';
import { BillTaxRateValidateSubscriber } from './subscribers/BillTaxRateValidateSubscriber';
import { SaleInvoiceTaxRateValidateSubscriber } from './subscribers/SaleInvoiceTaxRateValidateSubscriber';
import { SyncItemTaxRateOnEditTaxSubscriber } from './subscribers/SyncItemTaxRateOnEditTaxSubscriber';
import { WriteTaxTransactionsItemEntries } from './WriteTaxTransactionsItemEntries';
import { SyncItemTaxRateOnEditTaxRate } from './SyncItemTaxRateOnEditTaxRate';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { TaxRateTransaction } from './models/TaxRateTransaction.model';
import { WithholdingTaxEntry } from './models/WithholdingTaxEntry.model';
import { TaxRatesExportable } from './TaxRatesExportable';
import { TaxRatesImportable } from './TaxRatesImportable';
import { PakistanTaxController } from './pakistan/PakistanTax.controller';
import { WithholdingTaxCalculator } from './pakistan/WithholdingTaxCalculator';
import { WithholdingTaxService } from './pakistan/WithholdingTax.service';
import { TaxReportsService } from './pakistan/TaxReports.service';

const models = [
  RegisterTenancyModel(TaxRateTransaction),
  RegisterTenancyModel(WithholdingTaxEntry),
];

@Module({
  imports: [TenancyModule, ...models],
  controllers: [TaxRatesController, PakistanTaxController],
  providers: [
    WithholdingTaxCalculator,
    WithholdingTaxService,
    TaxReportsService,
    CreateTaxRate,
    EditTaxRateService,
    DeleteTaxRateService,
    GetTaxRateService,
    GetTaxRatesService,
    ActivateTaxRateService,
    InactivateTaxRateService,
    CommandTaxRatesValidators,
    TaxRatesApplication,
    ItemEntriesTaxTransactions,
    WriteBillTaxTransactionsSubscriber,
    WriteInvoiceTaxTransactionsSubscriber,
    BillTaxRateValidateSubscriber,
    SaleInvoiceTaxRateValidateSubscriber,
    SyncItemTaxRateOnEditTaxSubscriber,
    WriteTaxTransactionsItemEntries,
    SyncItemTaxRateOnEditTaxRate,
    TaxRatesExportable,
    TaxRatesImportable,
  ],
  exports: [
    ItemEntriesTaxTransactions,
    WithholdingTaxCalculator,
    WithholdingTaxService,
    ...models,
  ],
})
export class TaxRatesModule {}
