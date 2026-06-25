// Seeds a starter set of Pakistan tax rates (GST / SST / WHT) into every
// tenant. Idempotent by `code` — only inserts rates that don't already exist,
// so it is safe to run on existing tenants and re-run.
const PAKISTAN_TAX_RATES = [
  // --- GST (Federal sales tax on goods) ---
  { name: 'GST 17%', code: 'GST17', rate: 17, tax_type: 'GST', jurisdiction: 'Federal', category: 'Goods' },
  { name: 'GST 0% (Zero-rated)', code: 'GST0', rate: 0, tax_type: 'GST', jurisdiction: 'Federal', category: 'Goods' },
  // --- SST (Provincial sales tax on services) ---
  { name: 'Sindh SST 13%', code: 'SST-SINDH-13', rate: 13, tax_type: 'SST', jurisdiction: 'Sindh', category: 'Services' },
  { name: 'Punjab SST 16%', code: 'SST-PUNJAB-16', rate: 16, tax_type: 'SST', jurisdiction: 'Punjab', category: 'Services' },
  { name: 'KPK SST 15%', code: 'SST-KPK-15', rate: 15, tax_type: 'SST', jurisdiction: 'KPK', category: 'Services' },
  // --- WHT (income tax withheld at source) ---
  { name: 'WHT 153(1)(a) Goods 4.5%', code: 'WHT-153-1A', rate: 4.5, tax_type: 'WHT', jurisdiction: 'Federal', is_withholding: true, wht_section: '153(1)(a)', category: 'Goods' },
  { name: 'WHT 153(1)(b) Services 10%', code: 'WHT-153-1B', rate: 10, tax_type: 'WHT', jurisdiction: 'Federal', is_withholding: true, wht_section: '153(1)(b)', category: 'Services' },
  { name: 'WHT 153(1)(c) Contracts 7.5%', code: 'WHT-153-1C', rate: 7.5, tax_type: 'WHT', jurisdiction: 'Federal', is_withholding: true, wht_section: '153(1)(c)', category: 'Contract' },
  { name: 'WHT 233 Commission 12%', code: 'WHT-233', rate: 12, tax_type: 'WHT', jurisdiction: 'Federal', is_withholding: true, wht_section: '233', category: 'Commission' },
];

exports.up = async function (knex) {
  for (const rate of PAKISTAN_TAX_RATES) {
    const existing = await knex('tax_rates').where('code', rate.code).first();
    if (existing) {
      continue;
    }
    await knex('tax_rates').insert({
      name: rate.name,
      code: rate.code,
      rate: rate.rate,
      tax_type: rate.tax_type,
      jurisdiction: rate.jurisdiction || null,
      is_withholding: rate.is_withholding || false,
      wht_section: rate.wht_section || null,
      category: rate.category || null,
      active: true,
    });
  }
};

exports.down = async function (knex) {
  const codes = PAKISTAN_TAX_RATES.map((r) => r.code);
  await knex('tax_rates').whereIn('code', codes).delete();
};
