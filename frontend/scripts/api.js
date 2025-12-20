import { memoryElement, updateMemoryLine, weatherWrapper, updateUI } from "./ui.js";
import { saveWeatherState } from "./main.js";

// Utility to fetch and parse JSON
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bad response from ${url}`);
  return res.json();
}

// Base URL can come from environment or be passed in
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

export async function fetchWeather(city, baseUrl = BASE_URL) {
  const [weatherData, forecastData] = await Promise.all([
    fetchJson(`${baseUrl}/weather?city=${encodeURIComponent(city)}`),
    fetchJson(`${baseUrl}/forecast?city=${encodeURIComponent(city)}`)
  ]);
  return { weatherData, forecastData };
}

export async function fetchWeatherByCoords(lat, lon, baseUrl = BASE_URL) {
  const [weatherData, forecastData] = await Promise.all([
    fetchJson(`${baseUrl}/geoweather?lat=${lat}&lon=${lon}`),
    fetchJson(`${baseUrl}/geoforecast?lat=${lat}&lon=${lon}`)
  ]);
  return { weatherData, forecastData };
}

export function getWeatherByLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    try {
      const { weatherData, forecastData } = await fetchWeatherByCoords(latitude, longitude);
      updateUI({ details: weatherData.details, weather: weatherData.weather, forecast: forecastData.forecast });

      saveWeatherState({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        temp: weatherData.weather?.Temperature?.Metric?.Value ?? '--',
        icon: weatherData.weather.WeatherIcon,
        forecast: forecastData.forecast
      });

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