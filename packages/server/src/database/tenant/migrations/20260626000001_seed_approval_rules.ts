// Seeds the default Finqora approval thresholds:
//   - amount <= 100,000 PKR  -> 1 level  (Finance Manager)
//   - amount  > 100,000 PKR  -> 2 levels (Finance Manager + Director)
// Idempotent: only seeds when no rules exist yet, so admin-customised rules are
// never overwritten and re-running is a no-op.
exports.up = async function (knex) {
  const existing = await knex('approval_rules').first();
  if (existing) {
    return;
  }
  await knex('approval_rules').insert([
    {
      document_type: null,
      min_amount: 0,
      max_amount: 100000,
      required_levels: 1,
      active: true,
      priority: 10,
      description: 'Up to 100,000 PKR — single approval (Finance Manager).',
    },
    {
      document_type: null,
      min_amount: 100000.01,
      max_amount: null,
      required_levels: 2,
      active: true,
      priority: 20,
      description:
        'Above 100,000 PKR — two approvals (Finance Manager + Director).',
    },
  ]);
};

exports.down = async function (knex) {
  await knex('approval_rules')
    .whereIn('priority', [10, 20])
    .where('document_type', null)
    .delete();
};
