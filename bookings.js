const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const router = express.Router();

// POST /api/bookings
router.post('/', (req, res) => {
  const { experienceId, travelerName, travelers, itinerary } = req.body;
  if (!experienceId || !travelerName) {
    return res.status(400).json({ error: 'experienceId and travelerName are required' });
  }
  const db = readDB();
  const experience = db.experiences.find((e) => e.id === experienceId);
  if (!experience) return res.status(404).json({ error: 'Experience not found' });
  const booking = {
    id: uuidv4(),
    experienceId,
    experienceTitle: experience.title,
    travelerName,
    travelers: travelers ? Number(travelers) : 1,
    itinerary: itinerary || null,
    createdAt: new Date().toISOString(),
  };
  db.bookings.push(booking);
  writeDB(db);
  res.status(201).json(booking);
});

// GET /api/bookings
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.bookings);
});

module.exports = router;