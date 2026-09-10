const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const router = express.Router();

// GET /api/experiences?location=&category=
router.get('/', (req, res) => {
  const { location, category } = req.query;
  const db = readDB();
  let results = db.experiences;
  if (location) {
    results = results.filter((e) => e.location.toLowerCase().includes(location.toLowerCase()));
  }
  if (category) {
    results = results.filter((e) => e.category.toLowerCase().includes(category.toLowerCase()));
  }
  res.json(results);
});

// GET /api/experiences/:id
router.get('/:id', (req, res) => {
  const db = readDB();
  const exp = db.experiences.find((e) => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experience not found' });
  res.json(exp);
});

// POST /api/experiences  (a host creates a new listing)
router.post('/', (req, res) => {
  const { title, location, date, time, price, capacity, category, description, hostName, image } = req.body;
  if (!title || !location || price === undefined || !category) {
    return res.status(400).json({ error: 'title, location, price and category are required' });
  }
  const db = readDB();
  const newExperience = {
    id: uuidv4(),
    title,
    location,
    date: date || '',
    time: time || '',
    price: Number(price),
    capacity: capacity ? Number(capacity) : null,
    category,
    description: description || '',
    hostName: hostName || 'Local Host',
    image: image || 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=800',
  };
  db.experiences.push(newExperience);
  writeDB(db);
  res.status(201).json(newExperience);
});

module.exports = router;
