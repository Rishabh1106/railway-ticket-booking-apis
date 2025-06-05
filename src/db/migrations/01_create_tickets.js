exports.up = function(knex) {
  return knex.schema.createTable('tickets', table => {
    table.uuid('id').primary();
    table.enum('status', ['confirmed', 'rac', 'waiting']);
    table.integer('seat_number').nullable();
    table.enum('berth_type', ['lower', 'middle', 'upper', 'side-lower']).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('tickets');
};
