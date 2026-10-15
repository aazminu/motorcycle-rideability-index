// Importing Required Modules
const express = require('express');
const PouchDB = require('pouchdb');
const dotenv = require('dotenv');
const cors = require('cors');
const fetch = require('node-fetch'); // Import node-fetch to make API requests

dotenv.config(); // Load environment variables from .env file

// Initialize PouchDB
const db = new PouchDB('searches');

// Create Express App
const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); //for parsing JSON request bodies

let idCounter = 1; //counter for generating unique IDs

// Function to Calculate Rideability Score
const calculateRideabilityScore = (temperature, visibility, isSnow, precipitation, wind) => {
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
  return score;
};
// Function to Get Latitude and Longitude from ZIP code
async function getLatLonFromZip(zipCode) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `http://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${apiKey}`;

  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch location data');
      const data = await response.json();
      return { lat: data.lat, lon: data.lon, location: data.name };
  } catch (error) {
      console.error('Error fetching latitude and longitude:', error.message);
      throw error;
  }
}

// Function to Get Weather Data from Latitude and Longitude
async function getWeatherData(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${apiKey}`;

  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch weather data');
      return await response.json();
  } catch (error) {
      console.error('Error fetching weather data:', error.message);
      throw error;
  }
}

// Endpoint to Get Weather Data by ZIP Code
app.get('/api/weather/:zipCode', async (req, res) => {
  const { zipCode } = req.params;
  try {
      console.log(`Received request for zip code: ${zipCode}`);

      // Get latitude and longitude from the ZIP code
      const { lat, lon, location } = await getLatLonFromZip(zipCode);
      console.log(`Latitude: ${lat}, Longitude: ${lon}, Location: ${location}`);

      // Get weather data from latitude and longitude
      const weatherData = await getWeatherData(lat, lon);
      console.log('Weather data received:', weatherData);

      // Construct the search entry
      const searchEntry = {
          location: location,
          temperature: weatherData.current.temp,
          humidity: weatherData.current.humidity,
          weather: weatherData.current.weather[0].description,
          precipitation: weatherData.current.rain ? weatherData.current.rain['1h'] : 0,
          visibility: weatherData.current.visibility / 1000, // convert meters to kilometers
          wind: weatherData.current.wind_speed,
          rideabilityScore: calculateRideabilityScore(
              weatherData.current.temp,
              weatherData.current.visibility / 1000,
              weatherData.current.weather[0].main.toLowerCase() === 'snow',
              weatherData.current.rain ? weatherData.current.rain['1h'] : 0,
              weatherData.current.wind_speed
          ),
          zipCode,
          _id: `search-${zipCode}`
      };

      // Fetch the existing document to get the latest _rev
      try {
          const existingSearch = await db.get(`search-${zipCode}`);
          searchEntry._rev = existingSearch._rev; // Attach the current revision ID
      } catch (error) {
          if (error.status !== 404) {
              throw error; // Re-throw if the error is not a 404 (document not found)
          }
          // If the document is not found, we proceed without the _rev field
      }

      // Store or update the search in the database
      await db.put(searchEntry);

      // Respond with the weather data
      res.json(searchEntry);
  } catch (error) {
      console.error('Error processing weather request:', error.message);
      res.status(500).json({ error: 'Failed to process weather request' });
  }
});





// CRUD Endpoints

// Create a new search entry
app.post('/api/searches', async (req, res) => {
  const { zipCode, location, temperature, humidity, weather, precipitation, visibility, wind } = req.body;
  
  const newSearch = {
    _id: idCounter.toString(),
    zipCode,
    location,
    temperature,
    humidity,
    weather,
    precipitation,
    visibility,
    wind,
    rideabilityScore: calculateRideabilityScore(temperature, visibility, false, precipitation, wind)
  };

  try {
    await db.put(newSearch);
    idCounter += 1;
    res.status(201).json(newSearch);
  } catch (error) {
    console.error('Error creating new search entry:', error.message);
    res.status(500).json({ error: 'Failed to create new search entry' });
  }
});

// Get all search entries
  app.get('/api/searches', async (req, res) => {
    try {
      const result = await db.allDocs({ include_docs: true, descending: true });
      const searches = result.rows.map(row => row.doc);
      res.json(searches);
    } catch (error) {
      console.error('Error fetching search entries:', error.message);
      res.status(500).json({ error: 'Failed to fetch search entries' });
    }
  });

// Get a single search entry by ID
app.get('/api/searches/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const search = await db.get(id);
    res.json(search);
  } catch (error) {
    console.error('Error fetching search entry:', error.message);
    res.status(404).json({ error: 'Search entry not found' });
  }
});

// Update a search entry
app.put('/api/searches/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const search = await db.get(id);
    const updatedSearch = { ...search, ...updates };
    await db.put(updatedSearch);
    res.json(updatedSearch);
  } catch (error) {
    console.error('Error updating search entry:', error.message);
    res.status(500).json({ error: 'Failed to update search entry' });
  }
});

// Delete a search entry
app.delete('/api/searches/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const search = await db.get(id);
    await db.remove(search);
    res.json({ message: 'Search entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting search entry:', error.message);
    res.status(500).json({ error: 'Failed to delete search entry' });
  }
});

// Start the Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
