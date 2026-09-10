const express = require('express');
const { readDB } = require('../db');
const { generateItinerary } = require('../utils/aiPlanner');
const router = express.Router();

// POST /api/plan-trip
router.post('/plan-trip', async (req, res) => {
  const { experienceId, travelers, budget, interests, dates, tripDays } = req.body;
  if (!experienceId) return res.status(400).json({ error: 'experienceId is required' });
  const db = readDB();
  const experience = db.experiences.find((e) => e.id === experienceId);
  if (!experience) return res.status(404).json({ error: 'Experience not found' });
  try {
    const itinerary = await generateItinerary({
      experience,
      travelers: travelers ? Number(travelers) : 2,
      budget: budget || 'Moderate',
      interests: interests || '',
      dates,
      tripDays: tripDays ? Number(tripDays) : 3,
    });
    res.json(itinerary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

module.exports = router;