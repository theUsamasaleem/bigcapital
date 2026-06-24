exports.up = (knex) => {
  return knex.schema.alterTable('audit_logs', (table) => {
    // Higher-level grouping (e.g. 'Authentication', 'Approvals', 'Sales').
    table.string('module', 64).nullable().index();
    // Snapshots for create/update/delete and approval transitions.
    table.json('old_values').nullable();
    table.json('new_values').nullable();
  });
};

exports.down = (knex) => {
  return knex.schema.alterTable('audit_logs', (table) => {
    table.dropColumn('module');
    table.dropColumn('old_values');
    table.dropColumn('new_values');
  });
};
