require('dotenv').config();
const express = require('express');
const cors = require('cors');

const experiencesRouter = require('./routes/experiences');
const bookingsRouter = require('./routes/bookings');
const plannerRouter = require('./routes/planner');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ExploreHub API is running' });
});

app.use('/api/experiences', experiencesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/auth', authRouter);
app.use('/api', plannerRouter); // exposes POST /api/plan-trip

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ExploreHub backend running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('No ANTHROPIC_API_KEY set - using the built-in rule-based trip planner.');
  }
});