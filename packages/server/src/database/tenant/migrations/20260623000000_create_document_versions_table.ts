exports.up = async function (knex) {
  // Track the current version number on the document itself.
  const hasVersion = await knex.schema.hasColumn('documents', 'version');
  if (!hasVersion) {
    await knex.schema.alterTable('documents', (table) => {
      table.integer('version').unsigned().notNullable().defaultTo(1);
    });
  }

  // Historical versions of a document. Each row snapshots a previous (or
  // restored-from) file so the current `documents` row always points at the
  // latest file while older S3 objects remain retrievable.
  const hasTable = await knex.schema.hasTable('document_versions');
  if (!hasTable) {
    await knex.schema.createTable('document_versions', (table) => {
      table.increments('id').primary();
      table.integer('document_id').unsigned().notNullable().index();
      table.integer('version').unsigned().notNullable();
      table.string('key').notNullable();
      table.string('mime_type').notNullable();
      table.integer('size').unsigned();
      table.string('origin_name');
      table.integer('uploaded_by_user_id').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('document_versions');

  const hasVersion = await knex.schema.hasColumn('documents', 'version');
  if (hasVersion) {
    await knex.schema.alterTable('documents', (table) => {
      table.dropColumn('version');
    });
  }
};
