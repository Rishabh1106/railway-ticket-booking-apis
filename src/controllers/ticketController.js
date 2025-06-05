const ticketService = require('../services/ticketService');

exports.bookTicket = async (req, res) => {
  try {
    const result = await ticketService.book(req.body.passengers);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


exports.cancelTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const result = await ticketService.cancel(ticketId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getBookedTickets = async (req, res) => {
  try {
    const result = await ticketService.getBooked();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailableTickets = async (req, res) => {
  try {
    const result = await ticketService.getAvailability();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
