import { fetchWeather, getWeatherByLocation } from './api.js';
import {
  updateUI,
  updateMemoryLine,
  showOfflineOverlay,
  hideOfflineOverlay,
  getOfflineMessage,
  showSkeletons,
  memoryElement,
  weatherWrapper
} from './ui.js';

import {
  addCity,
  getMostRecentCity,
  getStoredCities,
  getCityByName,
  trimStore
} from './db.js';

// Check if forecast has changed
function hasForecastChanged(a = [], b = []) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

// Render saved cities
async function renderSavedCities(currentCity) {
  const container = document.getElementById('recentCitiesList');
  if (!container) return;

  const cities = await getStoredCities();
  const filtered = cities.filter(c =>
    !currentCity || c.city !== currentCity
  );

  container.innerHTML = '';

  if (!filtered.length) {
    container.parentElement.style.display = 'none';
    return;
  }

  filtered
    .sort((a, b) => b.lastUpdate - a.lastUpdate)
    .slice(0, 2)
    .forEach(c => {
      const btn = document.createElement('button');
      btn.textContent = c.city;
      btn.addEventListener('click', () => updateCity(c.city));
      container.appendChild(btn);
    });

  container.parentElement.style.display = 'flex';
}

// Update city weather data
async function updateCity(city) {
  showSkeletons();

  const storedCity = await getCityByName(city);

  // Offline: use stored data
  if (!navigator.onLine) {
    if (!storedCity) {
      memoryElement.textContent = `Cannot load data for ${city} while offline.`;
      memoryElement.classList.add('loaded');
      weatherWrapper.classList.remove('hidden');
      return;
    }

    updateUI({
      details: { EnglishName: storedCity.city },
      weather: {
        WeatherText: storedCity.condition,
        WeatherIcon: storedCity.icon || 1,
        Temperature: { Metric: { Value: storedCity.temp ?? null } }
      },
      forecast: storedCity.forecast || []
    }, true);

    updateMemoryLine({
      city: storedCity.city,
      condition: storedCity.condition,
      isOffline: true
    });

    getOfflineMessage(storedCity);
    showOfflineOverlay();
    return;
  }

  // Online: fetch fresh data
  try {
    hideOfflineOverlay();

    const { weatherData, forecastData } = await fetchWeather(city);

    const newForecast = forecastData.forecast || [];
    const conditionChanged =
      !storedCity ||
      weatherData.weather.WeatherText !== storedCity.condition;

    const forecastChanged =
      !storedCity ||
      hasForecastChanged(newForecast, storedCity.forecast);

    updateUI({
      details: weatherData.details,
      weather: weatherData.weather,
      forecast: newForecast
    }, !conditionChanged && !forecastChanged);

    updateMemoryLine({
      city: weatherData.details.EnglishName,
      condition: weatherData.weather.WeatherText,
      isFresh: !storedCity
    });

    await addCity(weatherData.details.EnglishName, {
      condition: weatherData.weather.WeatherText,
      temp: weatherData.weather.Temperature.Metric.Value,
      icon: weatherData.weather.WeatherIcon,
      forecast: newForecast
    });

    await trimStore();
    renderSavedCities(weatherData.details.EnglishName);

  } catch (err) {
    console.error('Failed to update city:', err);
    memoryElement.textContent = `Could not load data for ${city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
  }
}

// Refresh weather data
async function refreshWeatherData(force = false) {
  if (document.hidden) return;

  const storedCity = await getMostRecentCity();
  if (!storedCity) return;

  if (!navigator.onLine) {
    updateMemoryLine({
      city: storedCity.city,
      condition: storedCity.condition,
      isOffline: true
    });
    showOfflineOverlay();
    return;
  }

  hideOfflineOverlay();

  const minInterval = 10 * 60 * 1000;
  if (!force && Date.now() - storedCity.lastUpdate < minInterval) return;

  try {
    showSkeletons();

    const { weatherData, forecastData } = await fetchWeather(storedCity.city);

    const conditionChanged =
      weatherData.weather.WeatherText !== storedCity.condition;
    const forecastChanged =
      hasForecastChanged(forecastData.forecast, storedCity.forecast);

    updateUI({
      details: weatherData.details,
      weather: weatherData.weather,
      forecast: forecastData.forecast
    }, !conditionChanged && !forecastChanged);

    updateMemoryLine({
      city: weatherData.details.EnglishName,
      condition: weatherData.weather.WeatherText,
      isOffline: false
    });

    await addCity(weatherData.details.EnglishName, {
      condition: weatherData.weather.WeatherText,
      temp: weatherData.weather.Temperature.Metric.Value,
      icon: weatherData.weather.WeatherIcon,
      forecast: forecastData.forecast
    });

    await trimStore();
    renderSavedCities(weatherData.details.EnglishName);

  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent =
      `Could not refresh data for ${storedCity.city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
  }
}

// Tab visibility change
let tabActiveTimeout;
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    clearTimeout(tabActiveTimeout);
    tabActiveTimeout = setTimeout(refreshWeatherData, 300);
  }
});

window.addEventListener('offline', async () => {
  const city = await getMostRecentCity();
  if (!city) return;

  updateMemoryLine({
    city: city.city,
    condition: city.condition,
    isOffline: true
  });
  showOfflineOverlay();
});

window.addEventListener('online', async () => {
  hideOfflineOverlay();
  await refreshWeatherData(true);
});

// City form submission
const cityForm = document.querySelector('form');
cityForm.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityForm.city.value.trim();
  if (!city) return;
  cityForm.reset();
  updateCity(city);
});

// Initial load
window.addEventListener('DOMContentLoaded', async () => {
  const storedCity = await getMostRecentCity();

  if (storedCity) {
    await updateCity(storedCity.city);
  } else {
    getWeatherByLocation();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
});