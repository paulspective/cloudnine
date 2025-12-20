const { getCityInfo, getWeatherInfo, getForecastInfo, getGeoposition } = require('./weather_service');

const express = require('express');
const cors = require('cors');
const apicache = require('apicache');
let cache = apicache.middleware;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/geoweather', cache('10 minutes'), async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude required' });

    const details = await getGeoposition(lat, lon);
    const weather = await getWeatherInfo(details.Key);

    res.json({ details, weather });
  } catch (err) {
    console.error('/geoweather error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/geoforecast', cache('1 hour'), async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude required' });

    const details = await getGeoposition(lat, lon);
    const forecast = await getForecastInfo(details.Key);

    res.json({ details, forecast });
  } catch (err) {
    console.error('/geoforecast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Weather endpoint
app.get('/weather', cache('10 minutes'), async (req, res) => {
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
app.get('/forecast', cache('1 hour'), async (req, res) => {
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

// Error logging
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});