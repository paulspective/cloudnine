import { fetchWeather, getWeatherByLocation } from './api.js';
import { updateUI, updateMemoryLine, showOfflineOverlay, hideOfflineOverlay, getOfflineMessage, showSkeletons, memoryElement, weatherWrapper } from './ui.js';

// State Management 
function saveWeatherState({ city, condition, forecast }) {
  const forecastSummary = forecast.map(d => d.Day.IconPhrase).join(', ');
  const state = { city, condition, forecastSummary, lastUpdate: Date.now() };
  localStorage.setItem('lastWeather', JSON.stringify(state));
  return state;
}

export function getStoredWeatherState() {
  return JSON.parse(localStorage.getItem('lastWeather') || '{}');
}

// Main update function
async function updateCity(city) {
  showSkeletons();

  try {
    const { weatherData, forecastData } = await fetchWeather(city);

    const storedState = getStoredWeatherState();
    const conditionChanged = weatherData.weather.WeatherText !== storedState.condition;
    const forecastSummary = forecastData.forecast.map(d => d.Day.IconPhrase).join(', ');
    const forecastChanged = forecastSummary !== storedState.forecastSummary;

    setTimeout(() => {
      updateUI({
        details: weatherData.details,
        weather: weatherData.weather,
        forecast: forecastData.forecast
      }, !conditionChanged && !forecastChanged);

      const storedState = getStoredWeatherState();
      const newCity = cityForm.city.value.trim().toLowerCase() !== (storedState.city || '').toLowerCase();

      updateMemoryLine({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        isFresh: newCity
      });

      saveWeatherState({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        forecast: forecastData.forecast
      });
    }, 100);

  } catch (err) {
    console.error('Failed to update city:', err);
    memoryElement.textContent = `Could not load data for ${city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
  }
}

// Auto refresh 
async function refreshWeatherData(force = false) {
  if (document.hidden) return;

  const storedState = getStoredWeatherState();
  if (!storedState.city) return;

  // Skip refresh if offline
  if (!navigator.onLine) {
    memoryElement.textContent = getOfflineMessage(storedState);
    memoryElement.classList.add('loaded');
    showOfflineOverlay();
    return;
  } else {
    hideOfflineOverlay();
  }

  const minInterval = 10 * 60 * 1000;
  if (!force && storedState.lastUpdate && Date.now() - storedState.lastUpdate < minInterval) return;

  try {
    showSkeletons();
    const { weatherData, forecastData } = await fetchWeather(storedState.city);
    const conditionChanged = weatherData.weather.WeatherText !== storedState.condition;

    setTimeout(() => {
      updateUI({
        details: weatherData.details,
        weather: weatherData.weather,
        forecast: forecastData.forecast
      }, !conditionChanged);

      updateMemoryLine({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText, isOffline: false });

      saveWeatherState({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        forecast: forecastData.forecast
      });
    }, 100);

  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent = `Could not refresh data for ${storedState.city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
  }
}

let tabActiveTimeout;
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    clearTimeout(tabActiveTimeout);
    tabActiveTimeout = setTimeout(refreshWeatherData, 300);
  }
});

// Hook offline/online events
window.addEventListener('offline', () => {
  const storedState = getStoredWeatherState();
  updateMemoryLine({ city: storedState.city, condition: storedState.condition, isOffline: true });
  showOfflineOverlay();
});

window.addEventListener('online', async () => {
  hideOfflineOverlay();
  const storedState = getStoredWeatherState();
  if (storedState.city) await refreshWeatherData(true);
});

// City submission
const cityForm = document.querySelector('form');
cityForm.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityForm.city.value.trim().toLowerCase();
  if (!city) return;
  cityForm.reset();
  updateCity(city);
});

// Initial Load 
window.addEventListener('DOMContentLoaded', () => {
  getWeatherByLocation();

  const storedState = getStoredWeatherState();
  if (storedState.city) {
    refreshWeatherData(true);
  } else {
    weatherWrapper.classList.add('hidden');
  }
});