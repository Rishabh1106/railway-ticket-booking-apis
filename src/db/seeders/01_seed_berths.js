const { v4: uuidv4 } = require('uuid');

exports.seed = async function (knex) {
  await knex('berths').del();

  const berths = [];

  const confirmedTypes = ['upper', 'middle', 'lower'];

  // Confirmed berths — 63 in total: C1 to C63 (rotating pattern)
  for (let i = 1; i <= 63; i++) {
    const berth_type = confirmedTypes[(i - 1) % 3]; // rotate: 0 -> upper, 1 -> middle, 2 -> lower

    berths.push({
      id: uuidv4(),
      berth_number: `C${i}`, // Confirmed
      berth_type,
      position: null,
      is_occupied: false,
      ticket_id: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // RAC berths — R1-1 to R9-2 (18 total)
  for (let i = 1; i <= 9; i++) {
    berths.push({
      id: uuidv4(),
      berth_number: `R${i}-1`,
      berth_type: 'rac',
      position: 1,
      is_occupied: false,
      ticket_id: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    berths.push({
      id: uuidv4(),
      berth_number: `R${i}-2`,
      berth_type: 'rac',
      position: 2,
      is_occupied: false,
      ticket_id: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Waiting List — W1 to W10
  for (let i = 1; i <= 10; i++) {
    berths.push({
      id: uuidv4(),
      berth_number: `W${i}`,
      berth_type: 'waiting',
      position: null,
      is_occupied: false,
      ticket_id: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await knex('berths').insert(berths);
};
