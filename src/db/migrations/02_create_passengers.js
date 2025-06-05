exports.up = function(knex) {
  return knex.schema.createTable('passengers', table => {
    table.uuid('id').primary();
    table.string('name');
    table.integer('age');
    table.string('gender');
    table.boolean('is_child').defaultTo(false);
    table.uuid('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('passengers');
};
