exports.up = (knex) => {
  return knex.schema.createTable('approval_requests', (table) => {
    table.increments('id').primary();

    // The document this approval is attached to (e.g. 'Bill', 'Expense').
    table.string('document_type', 64).notNullable().index();
    table.integer('document_id').unsigned().notNullable();

    // pending | approved | rejected
    table.string('status', 16).notNullable().defaultTo('pending').index();

    // Optional monetary context (used by amount-threshold rules later).
    table.decimal('amount', 15, 5).nullable();

    // Who requested / actioned the approval (system user ids).
    table.integer('requested_by_user_id').unsigned().nullable().index();
    table.integer('approved_by_user_id').unsigned().nullable();
    table.integer('rejected_by_user_id').unsigned().nullable();

    table.text('notes').nullable();
    table.text('reason').nullable();

    table.dateTime('requested_at').nullable();
    table.dateTime('approved_at').nullable();
    table.dateTime('rejected_at').nullable();

    table.timestamps();

    table.index(['document_type', 'document_id']);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('approval_requests');
