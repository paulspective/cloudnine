require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;
const API_KEY = process.env.ACCUWEATHER_KEY;

app.use(cors());

// Weather fetching functions
async function getCityInfo(city) {
  const endpoint = 'https://dataservice.accuweather.com/locations/v1/cities/search';
  const query = `?apikey=${API_KEY}&q=${city}`;
  const response = await fetch(endpoint + query);
  if (!response.ok) throw new Error('Failed to fetch city info');
  const data = await response.json();
  if (!data.length) throw new Error('City not found');
  return data[0];
}

async function getWeatherInfo(id) {
  const endpoint = 'https://dataservice.accuweather.com/currentconditions/v1/';
  const query = `${id}?apikey=${API_KEY}`;
  const response = await fetch(endpoint + query);
  if (!response.ok) throw new Error('Failed to fetch weather info');
  const data = await response.json();
  if (!data[0]) throw new Error('Weather data missing');
  return data[0];
}

async function getForecastInfo(id) {
  const endpoint = 'https://dataservice.accuweather.com/forecasts/v1/daily/5day/';
  const query = `${id}?apikey=${API_KEY}&metric=true`;
  const response = await fetch(endpoint + query);
  if (!response.ok) throw new Error('Failed to fetch forecast info');
  const data = await response.json();
  if (!data.DailyForecasts) throw new Error('Forecast data missing');
  return data.DailyForecasts;
}

// Weather endpoint
app.get('/weather', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'City is required' });

    const details = await getCityInfo(city);
    const weather = await getWeatherInfo(details.Key);

    res.json({ details, weather });
  } catch (err) {
    console.error('/weather error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Forecast endpoint
app.get('/forecast', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'City is required' });

    const details = await getCityInfo(city);
    const forecast = await getForecastInfo(details.Key);

    res.json({ details, forecast });
  } catch (err) {
    console.error('/forecast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});