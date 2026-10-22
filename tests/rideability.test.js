const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateRideabilityScore,
  classifyRideRisk,
  buildSearchRecord,
} = require('../app');

test('calculateRideabilityScore scores ideal and moderate weather accurately', () => {
  // Ideal clear warm day: 20C, 10km visibility, no snow, 0 precip, 3 m/s wind -> 10
  assert.equal(calculateRideabilityScore(20, 10, false, 0, 3), 10);
  // Light rain and breezy: 18C, 8km vis (-1), no snow, 1.2mm rain (-3), 7 m/s wind (-1) -> 5
  assert.equal(calculateRideabilityScore(18, 8, false, 1.2, 7), 5);
});

test('calculateRideabilityScore clamps severe blizzard conditions to [0, 10]', () => {
  // Freezing blizzard: -5C (-3), 1km vis (-8), snow (-8), 5mm precip (-3), 15 m/s wind (-3)
  // Unclamped raw value would be -15; clamped value must be 0
  const score = calculateRideabilityScore(-5, 1, true, 5, 15);
  assert.equal(score, 0);
  assert.equal(classifyRideRisk(score).level, 'EXTREME');
});

test('buildSearchRecord detects snow from weather description and attaches risk tier', () => {
  const rec = buildSearchRecord(
    {
      zipCode: '01002',
      location: 'Amherst',
      temperature: -2,
      humidity: 88,
      weather: 'light snow showers',
      precipitation: 2.0,
      visibility: 3,
      wind: 8,
    },
    42
  );
  assert.equal(rec._id, '42');
  assert.equal(rec.rideabilityScore, 0);
  assert.equal(rec.risk.level, 'EXTREME');

  // Explicit null fields should fall back to safe defaults (10km visibility, 0 precip, 0 wind)
  const clearRec = buildSearchRecord(
    {
      zipCode: '02139',
      location: 'Cambridge',
      temperature: 20,
      humidity: 50,
      weather: 'clear sky',
      precipitation: null,
      visibility: null,
      wind: null,
    },
    43
  );
  assert.equal(clearRec.visibility, 10);
  assert.equal(clearRec.rideabilityScore, 10);
  assert.equal(clearRec.risk.level, 'LOW');
});

test('summarizeForecastWindow computes peak, mean, and worst risk tier across hourly forecasts', () => {
  const { summarizeForecastWindow } = require('../app');
  const summary = summarizeForecastWindow([
    { temperature: 21, visibility: 10, weather: 'clear sky', precipitation: 0, wind: 2 },
    { temperature: 16, visibility: 8, weather: 'light rain', precipitation: 1.5, wind: 6 },
  ]);
  assert.equal(summary.count, 2);
  assert.equal(summary.bestScore, 10);
  assert.ok(summary.meanScore >= 7);
});
