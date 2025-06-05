const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');


function getEligibleConfirmedBerth(age, gender, hasChild, availableBerths) {
  // Priority 1: Senior citizens or women with children — prefer lower berth
  if (age >= 60 || (gender === 'female' && hasChild)) {
    const lower = availableBerths.find(b => b.berth_type === 'lower');
    if (lower) return lower;
  }

  // Priority 2: Males — try middle, upper, then side-lower
  if (gender === 'male') {
    for (let type of ['upper', 'middle', 'side-lower']) {
      const berth = availableBerths.find(b => b.berth_type === type);
      if (berth) return berth;
    }
  }

  // Priority 3: Others — try lower first, then others in order
  for (let type of ['lower', 'middle', 'upper', 'side-lower']) {
    const berth = availableBerths.find(b => b.berth_type === type);
    if (berth) return berth;
  }

  // No berth available
  return null;
}

exports.book = async (passengers) => {
  const trx = await db.transaction();
  try {
    const ticketId = uuidv4();
    const passengerList = [];
    const hasChild = passengers.some(p => p.age < 5);
    const nonChildPassengers = passengers.filter(p => p.age >= 5);
    const totalToAllocate = nonChildPassengers.length;

    const confirmedAvailable = await trx('berths')
      .where('is_occupied', false)
      .whereIn('berth_type', ['lower', 'middle', 'upper', 'side-lower'])
      .select();

    const racAvailable = await trx('berths')
      .where({ is_occupied: false, berth_type: 'rac' })
      .orderBy('position')
      .select();

    const waitingAvailable = await trx('berths')
      .where({ is_occupied: false, berth_type: 'waiting' })
      .orderBy('berth_number')
      .select();

    const totalCapacity =
      confirmedAvailable.length + racAvailable.length + waitingAvailable.length;

    if (totalToAllocate > totalCapacity) {
      throw new Error(
        `Only ${totalCapacity} total seats available (Confirmed: ${confirmedAvailable.length}, RAC: ${racAvailable.length}, Waiting: ${waitingAvailable.length}). Cannot accommodate ${totalToAllocate} passengers.`
      );
    }

    // Insert ticket status initially as 'confirmed'; will update later
    await trx('tickets').insert({ id: ticketId, status: 'confirmed' });

    let ticketStatus = 'confirmed';

    const insertPassenger = async (p, berth = null, status) => {
      const isChild = p.age < 5;
      const passengerId = uuidv4();

      await trx('passengers').insert({
        id: passengerId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        is_child: isChild,
        ticket_id: ticketId,
      });

      if (berth && !isChild) {
        await trx('berths').where({ id: berth.id }).update({
          is_occupied: true,
          ticket_id: ticketId,
          passenger_id: passengerId,
        });
      }

      passengerList.push({
        ...p,
        is_child: isChild,
        status,
        berth: !isChild ? berth?.berth_number : null,
      });

      if (status === 'waiting' && ticketStatus !== 'waiting') {
        ticketStatus = 'waiting';
      } else if (status === 'rac' && ticketStatus === 'confirmed') {
        ticketStatus = 'rac';
      }
    };

    // Assign confirmed first
    for (const p of passengers) {
      if (p.age < 5) {
        await insertPassenger(p, null, 'no-berth');
        continue;
      }

      const berth = getEligibleConfirmedBerth(
        p.age,
        p.gender,
        hasChild,
        confirmedAvailable
      );
      if (berth) {
        confirmedAvailable.splice(
          confirmedAvailable.findIndex(b => b.id === berth.id),
          1
        );
        await insertPassenger(p, berth, 'confirmed');
        continue;
      }

      // No confirmed left, try RAC
      const rac = racAvailable.shift();
      if (rac) {
        await insertPassenger(p, rac, 'rac');
        continue;
      }

      // No RAC left, try Waiting
      const wait = waitingAvailable.shift();
      if (wait) {
        await insertPassenger(p, wait, 'waiting');
        continue;
      }
    }

    // Update ticket status after loop
    await trx('tickets').where({ id: ticketId }).update({ status: ticketStatus });

    await trx.commit();
    return {
      message: `Ticket Booked (${ticketStatus})`,
      ticket_id: ticketId,
      passengers: passengerList,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

exports.cancel = async (ticketId) => {
  const trx = await db.transaction();

  try {
    const ticket = await trx('tickets').where({ id: ticketId }).first();
    if (!ticket) throw new Error('Ticket not found');

    const passengers = await trx('passengers').where({ ticket_id: ticketId });

    // Step 1: Free all real berths (exclude children with null berths)
    await trx('berths')
      .where('ticket_id', ticketId)
      .whereNotNull('passenger_id')
      .update({ is_occupied: false, ticket_id: null, passenger_id: null });

    // Step 2: Delete passengers and ticket
    await trx('passengers').where({ ticket_id: ticketId }).del();
    await trx('tickets').where({ id: ticketId }).del();

    const promoted = {
      racToConfirmed: [],
      waitingToRac: []
    };

    // Step 3: Promote one RAC ticket to Confirmed
    const confirmedAvailable = await trx('berths')
      .whereIn('berth_type', ['lower', 'middle', 'upper', 'side-lower'])
      .andWhere('is_occupied', false)
      .orderBy('berth_number')
      .select();

    const racTickets = await trx('tickets')
      .where({ status: 'rac' })
      .orderBy('created_at')
      .select();

    if (confirmedAvailable.length > 0 && racTickets.length > 0) {
      const targetRacTicket = racTickets[0];

      const racPassengers = await trx('passengers')
        .where('ticket_id', targetRacTicket.id)
        .whereNotNull('id');

      for (let i = 0; i < racPassengers.length && confirmedAvailable.length > 0; i++) {
        const berth = confirmedAvailable.shift();
        const p = racPassengers[i];

        // Free old RAC berth
        await trx('berths')
          .where({ passenger_id: p.id, ticket_id: targetRacTicket.id, berth_type: 'rac' })
          .update({ is_occupied: false, ticket_id: null, passenger_id: null });

        await trx('berths')
          .where({ id: berth.id })
          .update({
            is_occupied: true,
            ticket_id: targetRacTicket.id,
            passenger_id: p.id
          });
      }

      await trx('tickets')
        .where({ id: targetRacTicket.id })
        .update({ status: 'confirmed' });

      promoted.racToConfirmed.push(targetRacTicket.id);
    }

    // Step 4: Promote one Waiting ticket to RAC
    const availableRACBerths = await trx('berths')
      .where({ berth_type: 'rac', is_occupied: false })
      .orderBy('position')
      .select();

    const waitingTickets = await trx('tickets')
      .where({ status: 'waiting' })
      .orderBy('created_at')
      .select();

    if (availableRACBerths.length > 0 && waitingTickets.length > 0) {
      const targetWaitTicket = waitingTickets[0];

      const waitingPassengers = await trx('passengers')
        .where('ticket_id', targetWaitTicket.id)
        .whereNotNull('id');

      for (let i = 0; i < waitingPassengers.length && availableRACBerths.length > 0; i++) {
        const berth = availableRACBerths.shift();
        const p = waitingPassengers[i];

        // Free old waiting berth
        await trx('berths')
          .where({ passenger_id: p.id, ticket_id: targetWaitTicket.id, berth_type: 'waiting' })
          .update({ is_occupied: false, ticket_id: null, passenger_id: null });

        await trx('berths')
          .where({ id: berth.id })
          .update({
            is_occupied: true,
            ticket_id: targetWaitTicket.id,
            passenger_id: p.id
          });
      }

      await trx('tickets')
        .where({ id: targetWaitTicket.id })
        .update({ status: 'rac' });

      promoted.waitingToRac.push(targetWaitTicket.id);
    }

    await trx.commit();

    return {
      message: 'Ticket cancelled and promotions (if any) completed.',
      promoted
    };

  } catch (err) {
    await trx.rollback();
    throw err;
  }
};








exports.getAvailability = async () => {
  const confirmed = await db('berths')
    .whereIn('berth_type', ['lower', 'middle', 'upper', 'side-lower'])
    .andWhere('is_occupied', false)
    .count();

  const rac = await db('berths').where({ berth_type: 'rac', is_occupied: false }).count();
  const waiting = await db('berths').where({ berth_type: 'waiting', is_occupied: false }).count();

  return {
    confirmed_left: Number(confirmed[0].count),
    rac_left: Number(rac[0].count),
    waiting_left: Number(waiting[0].count)
  };
};


exports.getBooked = async () => {
  const tickets = await db('tickets').select().orderBy('created_at');
  // console.log('ticket : ', tickets)
  const result = [];

  for (const ticket of tickets) {
    const passengers = await db('passengers').where({ ticket_id: ticket.id });
    // console.log('passengers : ', passengers);
    const berths = await db('berths').where({ ticket_id: ticket.id });

    const passengerDetails = passengers.map(p => {
      const berth = berths.find(b => b.passenger_id === p.id);
      return {
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        is_child: p.is_child,
        berth_number: berth?.berth_number || null,
        berth_type: berth?.berth_type || null
      };
    });


    result.push({
      ticket_id: ticket.id,
      status: ticket.status,
      passengers: passengerDetails
    });
  }

  return {
    total: result.length,
    tickets: result
  };
};


