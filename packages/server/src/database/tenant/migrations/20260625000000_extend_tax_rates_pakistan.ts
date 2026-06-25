// Phase 3a — Pakistan tax. Extends `tax_rates` with the classification needed
// for GST / SST / WHT (tax type, jurisdiction, withholding flag + section,
// category) and adds a `withholding_tax_entries` ledger for WHT deducted on
// bills / expenses. All additive and nullable / defaulted — backward compatible.
exports.up = async function (knex) {
  const hasTaxType = await knex.schema.hasColumn('tax_rates', 'tax_type');
  if (!hasTaxType) {
    await knex.schema.alterTable('tax_rates', (table) => {
      // GST | SST | WHT | OTHER
      table.string('tax_type', 16).notNullable().defaultTo('OTHER').index();
      // Federal | Sindh | Punjab | KPK | Balochistan | Islamabad | null
      table.string('jurisdiction', 64).nullable();
      // Marks a withholding tax (deducted at source).
      table.boolean('is_withholding').notNullable().defaultTo(false);
      // Income Tax Ordinance section, e.g. '153(1)(a)', '233'.
      table.string('wht_section', 32).nullable();
      // Free-form grouping, e.g. 'Goods', 'Services', 'Contract'.
      table.string('category', 64).nullable();
    });
  }

  const hasTable = await knex.schema.hasTable('withholding_tax_entries');
  if (!hasTable) {
    await knex.schema.createTable('withholding_tax_entries', (table) => {
      table.increments('id').primary();
      // Source document the WHT was deducted on (e.g. 'Bill', 'Expense').
      table.string('reference_type', 64).notNullable().index();
      table.integer('reference_id').unsigned().notNullable();
      // The withholding tax rate applied.
      table.integer('tax_rate_id').unsigned().nullable();
      table.string('wht_section', 32).nullable();
      // The party the tax was withheld from (vendor) — optional context.
      table.integer('contact_id').unsigned().nullable();
      table.decimal('base_amount', 15, 5).notNullable().defaultTo(0);
      table.decimal('rate', 9, 4).notNullable().defaultTo(0);
      table.decimal('wht_amount', 15, 5).notNullable().defaultTo(0);
      table.string('certificate_no', 64).nullable();
      table.date('date').nullable();
      table.timestamps();

      table.index(['reference_type', 'reference_id']);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('withholding_tax_entries');

  const hasTaxType = await knex.schema.hasColumn('tax_rates', 'tax_type');
  if (hasTaxType) {
    await knex.schema.alterTable('tax_rates', (table) => {
      table.dropColumn('tax_type');
      table.dropColumn('jurisdiction');
      table.dropColumn('is_withholding');
      table.dropColumn('wht_section');
      table.dropColumn('category');
    });
  }
};
