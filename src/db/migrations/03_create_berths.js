exports.up = function (knex) {
  return knex.schema.createTable('berths', (table) => {
    table.uuid('id').primary();
    table.string('berth_number').unique().notNullable(); // e.g. C1, R1-2, W10
    table.enu('berth_type', ['lower', 'middle', 'upper', 'side-lower', 'side-upper', 'rac', 'waiting']).notNullable();
    table.integer('position').nullable(); // For RAC only: 1 or 2
    table.boolean('is_occupied').notNullable().defaultTo(false);
    table.uuid('ticket_id').nullable().references('id').inTable('tickets').onDelete('SET NULL');
    table.uuid('passenger_id').nullable().references('id').inTable('passengers').onDelete('SET NULL');

    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('berths');
};
