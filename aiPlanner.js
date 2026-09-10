// The "AI Travel Engine": turns one booked experience into a full trip.
//
// If ANTHROPIC_API_KEY is set, generateItinerary() asks Claude to write the
// plan. Otherwise (or if that call fails for any reason) it falls back to
// ruleBasedItinerary(), a constraint-based generator that still reasons
// about the experience's real time slot, the traveler count, and the
// chosen budget tier instead of returning static text.
// Current model id for the Claude API - see
// https://docs.claude.com/en/docs/about-claude/models/overview if this
// ever needs updating.
const CLAUDE_MODEL = 'claude-sonnet-5';
const ATTRACTIONS_BY_CITY = {
  ahmedabad: {
    heritage: ['Sabarmati Ashram', 'Adalaj Stepwell', 'Jama Masjid in the Old City'],
    food: ['the Manek Chowk night food market', 'a Gujarati thali at a local dining hall'],
    shopping: ['Law Garden night market', 'Rajasthan Haat handicrafts market'],
    nature: ['Kankaria Lake', 'the Sabarmati Riverfront'],
  },
};
const BUDGET_TIERS = {
  'Budget-Friendly': { hotel: 1200, food: 250, label: 'Budget-friendly stay' },
  Moderate: { hotel: 2500, food: 400, label: 'Moderate 3-star hotel' },
  'Moderate (Standard 3-Star)': { hotel: 2500, food: 400, label: 'Moderate 3-star hotel' },
  Luxury: { hotel: 6000, food: 800, label: 'Luxury hotel' },
};
function getTier(budget) {
  return BUDGET_TIERS[budget] || BUDGET_TIERS.Moderate;
}
function cityKeyFor(location = '') {
  const lower = location.toLowerCase();
  if (lower.includes('ahmedabad') || lower.includes('manek chowk')) return 'ahmedabad';
  return null;
}
function pick(list, fallback) {
  if (!list || list.length === 0) return fallback;
  return list[Math.floor(Math.random() * list.length)];
}
function ruleBasedItinerary({ experience, travelers = 2, budget = 'Moderate', interests = '', tripDays = 3 }) {
  const tier = getTier(budget);
  const cityKey = cityKeyFor(experience.location);
  const spots = cityKey ? ATTRACTIONS_BY_CITY[cityKey] : null;
  const nights = Math.max(tripDays - 1, 1);
  const eventDay = tripDays === 1 ? 1 : Math.min(2, tripDays);
  const eventStartTime = (experience.time || '').split(' - ')[0] || 'Evening';
  const days = [];
  for (let d = 1; d <= tripDays; d += 1) {
    const activities = [];
    if (d === 1) {
      activities.push({
        time: '10:00 AM',
        title: 'Hotel check-in',
        description: `Check in to your ${tier.label.toLowerCase()} near ${experience.location}.`,
        highlight: false,
      });
      activities.push({
        time: '1:00 PM',
        title: 'Local lunch',
        description: spots ? `Try ${pick(spots.food, 'a local restaurant')}.` : 'Settle in with lunch near your hotel.',
        highlight: false,
      });
      if (d === eventDay) {
        activities.push({
          time: eventStartTime,
          title: `${experience.title} (your booked experience)`,
          description: experience.description,
          highlight: true,
        });
      } else {
        activities.push({
          time: '4:00 PM',
          title: spots ? `Walk through ${pick(spots.heritage, 'the old town')}` : `Explore ${experience.location}`,
          description: 'A relaxed first-day orientation walk.',
          highlight: false,
        });
      }
    } else if (d === eventDay) {
      activities.push({
        time: '10:00 AM',
        title: spots ? pick(spots.heritage, 'Morning sightseeing') : 'Morning sightseeing',
        description: 'Visit a well-known local landmark before the main event.',
        highlight: false,
      });
      activities.push({
        time: '2:00 PM',
        title: spots ? pick(spots.shopping, 'Local market visit') : 'Local market visit',
        description: 'Pick up souvenirs and snacks.',
        highlight: false,
      });
      activities.push({
        time: eventStartTime,
        title: `${experience.title} (your booked experience)`,
        description: experience.description,
        highlight: true,
      });
    } else if (d === tripDays) {
      activities.push({
        time: '10:00 AM',
        title: spots ? pick(spots.nature, 'Free morning to explore') : 'Free morning to explore',
        description: 'A relaxed final morning before heading out.',
        highlight: false,
      });
      activities.push({
        time: '2:00 PM',
        title: 'Departure',
        description: 'Check out and head to the station or airport.',
        highlight: false,
      });
    } else {
      activities.push({
        time: '10:00 AM',
        title: spots ? pick(spots.heritage, 'Sightseeing') : 'Sightseeing',
        description: 'Continue exploring the area at a relaxed pace.',
        highlight: false,
      });
      activities.push({
        time: '7:00 PM',
        title: 'Dinner',
        description: spots ? `Dinner near ${pick(spots.food, 'the city center')}.` : 'Dinner near your hotel.',
        highlight: false,
      });
    }
    days.push({
      dayNumber: d,
      title: d === 1 ? 'Arrival' : d === tripDays ? 'Departure' : d === eventDay ? 'The Main Event' : 'Exploring',
      activities,
    });
  }
  const hotelCost = tier.hotel * nights;
  const transportCost = 500 + tripDays * 400;
  const foodCost = tier.food * travelers * tripDays;
  const experienceCost = (experience.price || 0) * travelers;
  const total = hotelCost + transportCost + foodCost + experienceCost;
  return {
    tripTitle: `Your ${experience.location.split(',')[0]} Trip`,
    days,
    hotelSuggestion: { name: tier.label, tier: budget, pricePerNight: tier.hotel },
    costBreakdown: { hotel: hotelCost, transport: transportCost, food: foodCost, experience: experienceCost, total },
    aiNote: `Built with the constraint-based planner: the hotel and food budget match "${budget}", and ${experience.title} is scheduled at its real listed time (${experience.time}) so travel around it stays realistic.${interests ? ` Extra focus on: ${interests}.` : ''}`,
    source: 'rule-based',
  };
}
async function callClaude({ experience, travelers, budget, interests, dates, tripDays }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const prompt = `You are the AI Travel Engine for ExploreHub, a local-tourism platform in India.Generate a realistic ${tripDays}-day trip itinerary built around one core experience. Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:{"tripTitle": string, "days": [{"dayNumber": number, "title": string, "activities": [{"time": string, "title": string, "description": string, "highlight": boolean}]}], "hotelSuggestion": {"name": string, "tier": string, "pricePerNight": number}, "costBreakdown": {"hotel": number, "transport": number, "food": number, "experience": number, "total": number}, "aiNote": string}
Core experience: "${experience.title}" in ${experience.location}, timing ${experience.time}, category ${experience.category}, price ₹${experience.price} per person. Description: ${experience.description}Travel dates: ${dates || 'flexible'}Travelers: ${travelers}Budget category: ${budget}Other interests: ${interests || 'general sightseeing'}Place the core experience on the correct day at its real scheduled time and mark that one activity "highlight": true. Keep each description to one short sentence. All costs in INR, "total" scaled for ${travelers} traveler(s). Use real, well-known landmarks near ${experience.location} where you can.`;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API responded ${response.status}: ${errText}`);
  }
  const data = await response.json();
  const text = data.content.map((block) => block.text || '').join('\n');
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  parsed.source = 'claude';
  return parsed;
}
async function generateItinerary(input) {
  try {
    const aiResult = await callClaude(input);
    if (aiResult) return aiResult;
  } catch (err) {
    console.error('Claude itinerary generation failed, falling back to rule-based planner:', err.message);
  }
  return ruleBasedItinerary(input);
}
module.exports = { generateItinerary, ruleBasedItinerary };