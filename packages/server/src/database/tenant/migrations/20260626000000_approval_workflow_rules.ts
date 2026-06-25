// Phase 3b — configurable, multi-level approval workflow. Adds:
//  - `approval_rules`: amount-threshold rules that decide how many approval
//    levels a document needs.
//  - `approval_actions`: the per-level action trail (approve/reject/return/
//    comment) with comments.
//  - extra columns on `approval_requests` for multi-level progress + returns.
// All additive / defaulted — backward compatible with the single-level flow.
exports.up = async function (knex) {
  const hasRules = await knex.schema.hasTable('approval_rules');
  if (!hasRules) {
    await knex.schema.createTable('approval_rules', (table) => {
      table.increments('id').primary();
      // null document_type = applies to any document type.
      table.string('document_type', 64).nullable().index();
      table.decimal('min_amount', 15, 5).notNullable().defaultTo(0);
      // null max_amount = no upper bound.
      table.decimal('max_amount', 15, 5).nullable();
      // How many distinct approvals are required when this rule matches.
      table.integer('required_levels').unsigned().notNullable().defaultTo(1);
      table.boolean('active').notNullable().defaultTo(true);
      // Lower priority number wins when multiple rules match.
      table.integer('priority').unsigned().notNullable().defaultTo(100);
      table.string('description', 255).nullable();
      table.timestamps();
    });
  }

  const hasActions = await knex.schema.hasTable('approval_actions');
  if (!hasActions) {
    await knex.schema.createTable('approval_actions', (table) => {
      table.increments('id').primary();
      table
        .integer('approval_request_id')
        .unsigned()
        .notNullable()
        .index();
      table.integer('level').unsigned().notNullable().defaultTo(1);
      table.integer('user_id').unsigned().nullable();
      // approve | reject | return | comment
      table.string('action', 16).notNullable();
      table.text('comment').nullable();
      table.dateTime('acted_at').nullable();
      table.timestamps();
    });
  }

  const hasCurrentLevel = await knex.schema.hasColumn(
    'approval_requests',
    'current_level',
  );
  if (!hasCurrentLevel) {
    await knex.schema.alterTable('approval_requests', (table) => {
      table.integer('current_level').unsigned().notNullable().defaultTo(0);
      table.integer('required_levels').unsigned().notNullable().defaultTo(1);
      table.integer('returned_by_user_id').unsigned().nullable();
      table.dateTime('returned_at').nullable();
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('approval_actions');
  await knex.schema.dropTableIfExists('approval_rules');

  const hasCurrentLevel = await knex.schema.hasColumn(
    'approval_requests',
    'current_level',
  );
  if (hasCurrentLevel) {
    await knex.schema.alterTable('approval_requests', (table) => {
      table.dropColumn('current_level');
      table.dropColumn('required_levels');
      table.dropColumn('returned_by_user_id');
      table.dropColumn('returned_at');
    });
  }
};
