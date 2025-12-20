require('dotenv').config();
const API_KEY = process.env.ACCUWEATHER_KEY;

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

async function getGeoposition(lat, lon) {
  const endpoint = 'https://dataservice.accuweather.com/locations/v1/cities/geoposition/search';
  const query = `?apikey=${API_KEY}&q=${lat},${lon}`;
  const response = await fetch(endpoint + query);
  if (!response.ok) throw new Error('Failed to fetch location by coordinates');
  const data = await response.json();
  if (!data.Key) throw new Error('Location key missing');
  return data;
}

module.exports = { getCityInfo, getForecastInfo, getWeatherInfo, getGeoposition };