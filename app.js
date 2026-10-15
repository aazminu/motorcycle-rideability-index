function calculateRideabilityScore(temperature, visibility, isSnow, precipitation, wind) {
  let score = 10;
  if (isSnow) score -= 8;
  if (precipitation > 0) score -= 3;
  if (visibility < 2) score -= 5;
  if (visibility < 5) score -= 2;
  if (visibility < 10) score -= 1;
  if (temperature < 0 || temperature > 30) score -= 2;
  if (temperature < 5 || temperature > 25) score -= 1;
  if (wind > 5) score -= 1;
  if (wind > 10) score -= 2;
  return Math.max(0, Math.min(10, score));
}

function classifyRideRisk(score) {
  const s = Math.max(0, Math.min(10, Number(score) || 0));
  if (s >= 8) return { level: 'LOW', label: 'Optimal riding conditions' };
  if (s >= 5) return { level: 'MODERATE', label: 'Exercise caution' };
  if (s >= 3) return { level: 'HIGH', label: 'Hazardous conditions' };
  return { level: 'EXTREME', label: 'Riding not recommended' };
}

function isSnowWeather(weatherDesc) {
  return typeof weatherDesc === 'string' && weatherDesc.toLowerCase().includes('snow');
}

function buildSearchRecord(payload, id) {
  const {
    zipCode,
    location,
    temperature,
    humidity,
    weather,
    precipitation = 0,
    visibility = 10,
    wind = 0,
  } = payload;
  const rideabilityScore = calculateRideabilityScore(
    temperature,
    visibility,
    isSnowWeather(weather),
    precipitation,
    wind
  );
  return {
    _id: String(id),
    zipCode,
    location,
    temperature,
    humidity,
    weather,
    precipitation,
    visibility,
    wind,
    rideabilityScore,
    risk: classifyRideRisk(rideabilityScore),
  };
}

function createServer() {
  const express = require('express');
  const PouchDB = require('pouchdb');
  const dotenv = require('dotenv');
  const cors = require('cors');
  const fetch = globalThis.fetch || require('node-fetch');

  dotenv.config();

  const db = new PouchDB('searches');
  const app = express();
  app.use(cors());
  app.use(express.json());

  let idCounter = 1;

  async function getLatLonFromZip(zipCode) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `http://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch location data');
    const data = await response.json();
    return { lat: data.lat, lon: data.lon, location: data.name };
  }

  async function getWeatherData(lat, lon) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather data');
    return await response.json();
  }

  app.get('/api/weather/:zipCode', async (req, res) => {
    const { zipCode } = req.params;
    try {
      const { lat, lon, location } = await getLatLonFromZip(zipCode);
      const weatherData = await getWeatherData(lat, lon);
      const weatherMain = weatherData.current.weather[0].main || '';
      const weatherDesc = weatherData.current.weather[0].description || weatherMain;
      const precipitation = weatherData.current.rain ? weatherData.current.rain['1h'] : 0;
      const visibilityKm = weatherData.current.visibility / 1000;
      const rideabilityScore = calculateRideabilityScore(
        weatherData.current.temp,
        visibilityKm,
        isSnowWeather(weatherMain) || isSnowWeather(weatherDesc),
        precipitation,
        weatherData.current.wind_speed
      );

      const searchEntry = {
        location,
        temperature: weatherData.current.temp,
        humidity: weatherData.current.humidity,
        weather: weatherDesc,
        precipitation,
        visibility: visibilityKm,
        wind: weatherData.current.wind_speed,
        rideabilityScore,
        risk: classifyRideRisk(rideabilityScore),
        zipCode,
        _id: `search-${zipCode}`,
      };

      try {
        const existingSearch = await db.get(`search-${zipCode}`);
        searchEntry._rev = existingSearch._rev;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      await db.put(searchEntry);
      res.json(searchEntry);
    } catch (error) {
      res.status(500).json({ error: 'Failed to process weather request' });
    }
  });

  app.post('/api/searches', async (req, res) => {
    const newSearch = buildSearchRecord(req.body, idCounter);
    try {
      await db.put(newSearch);
      idCounter += 1;
      res.status(201).json(newSearch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create new search entry' });
    }
  });

  app.get('/api/searches', async (req, res) => {
    try {
      const result = await db.allDocs({ include_docs: true, descending: true });
      res.json(result.rows.map((row) => row.doc));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch search entries' });
    }
  });

  app.get('/api/searches/:id', async (req, res) => {
    try {
      const search = await db.get(req.params.id);
      res.json(search);
    } catch (error) {
      res.status(404).json({ error: 'Search entry not found' });
    }
  });

  app.put('/api/searches/:id', async (req, res) => {
    try {
      const search = await db.get(req.params.id);
      const merged = { ...search, ...req.body };
      merged.rideabilityScore = calculateRideabilityScore(
        merged.temperature,
        merged.visibility,
        isSnowWeather(merged.weather),
        merged.precipitation,
        merged.wind
      );
      merged.risk = classifyRideRisk(merged.rideabilityScore);
      await db.put(merged);
      res.json(merged);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update search entry' });
    }
  });

  app.delete('/api/searches/:id', async (req, res) => {
    try {
      const search = await db.get(req.params.id);
      await db.remove(search);
      res.json({ message: 'Search entry deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete search entry' });
    }
  });

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = {
  calculateRideabilityScore,
  classifyRideRisk,
  isSnowWeather,
  buildSearchRecord,
  createServer,
};
