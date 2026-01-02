import { memoryElement, updateMemoryLine, weatherWrapper, updateUI } from './ui.js';
import { addCity, trimStore } from './db.js';

// Utility to fetch and parse JSON
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bad response from ${url}`);
  return res.json();
}

// Fetch weather by city name
export async function fetchWeather(city) {
  const [weatherData, forecastData] = await Promise.all([
    fetchJson(`/weather?city=${encodeURIComponent(city)}`),
    fetchJson(`/forecast?city=${encodeURIComponent(city)}`)
  ]);
  return { weatherData, forecastData };
}

// Fetch weather by coordinates
export async function fetchWeatherByCoords(lat, lon) {
  const [weatherData, forecastData] = await Promise.all([
    fetchJson(`/geoweather?lat=${lat}&lon=${lon}`),
    fetchJson(`/geoforecast?lat=${lat}&lon=${lon}`)
  ]);
  return { weatherData, forecastData };
}

// Get weather using geolocation
export function getWeatherByLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;

    try {
      const { weatherData, forecastData } = await fetchWeatherByCoords(latitude, longitude);

      // Update UI
      updateUI({
        details: weatherData.details,
        weather: weatherData.weather,
        forecast: forecastData.forecast
      });

      // Save to IndexedDB
      await addCity(weatherData.details.EnglishName, {
        condition: weatherData.weather.WeatherText,
        temp: weatherData.weather?.Temperature?.Metric?.Value ?? '--',
        icon: weatherData.weather.WeatherIcon,
        forecast: forecastData.forecast
      });
      await trimStore();

      // Update memory line
      updateMemoryLine({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        isFresh: true,
        isOffline: false
      });

    } catch (err) {
      console.error(err);
      memoryElement.textContent = `Could not fetch your location's weather. Try typing your city.`;
      memoryElement.classList.add('loaded');
      weatherWrapper.classList.add('hidden');
    }
  }, () => {
    memoryElement.textContent = `Location access denied. Type your city instead.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
  });
}