import { fetchWeather, getWeatherByLocation } from './api.js';
import {
  updateUI,
  updateMemoryLine,
  showOfflineOverlay,
  hideOfflineOverlay,
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

// Compare forecasts
function hasForecastChanged(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b)) return true;
  if (a.length !== b.length) return true;
  return a.some((f, i) => f.date !== b[i].date || f.condition !== b[i].condition);
}

// Render saved cities list (always shows 3 others besides current)
async function renderSavedCities(currentCity) {
  const container = document.getElementById('recentCitiesList');
  if (!container) return;

  const cities = await getStoredCities();

  // Exclude current city
  const others = cities.filter(c => !currentCity || c.city !== currentCity);

  // Sort by lastUpdate descending and pick top 3
  const recent = others
    .sort((a, b) => b.lastUpdate - a.lastUpdate)
    .slice(0, 3);

  container.innerHTML = '';

  const label = container.parentElement.querySelector('span');

  if (!recent.length) {
    const hasAnyCities = cities.length > 0;

    if (hasAnyCities) {
      container.parentElement.style.display = 'none';
      return;
    }

    label.textContent = 'Start with:';
    const defaults = ['New York', 'London', 'Tokyo', 'Paris'];
    defaults.forEach(city => {
      const btn = document.createElement('button');
      btn.textContent = city;
      btn.addEventListener('click', () => updateCity(city));
      container.appendChild(btn);
    });

    container.parentElement.style.display = 'flex';
  } else {
    label.textContent = 'Back to:';
    container.parentElement.style.display = 'flex';
  }

  recent.forEach(c => {
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

  // Offline: use stored data if available
  if (!navigator.onLine) {
    if (!storedCity) {
      memoryElement.textContent = `No stored data for ${city} available offline. The sky's being quiet.`;
      memoryElement.classList.add('loaded');
      weatherWrapper.classList.remove('hidden');
      showOfflineOverlay();
      return;
    }

    updateUI({
      details: { EnglishName: storedCity.city },
      weather: {
        WeatherText: storedCity.condition || 'Unavailable',
        WeatherIcon: storedCity.icon || 1,
        Temperature: { Metric: { Value: storedCity.temp ?? '--' } }
      },
      forecast: Array.isArray(storedCity.forecast) ? storedCity.forecast : []
    }, true);

    updateMemoryLine({
      city: storedCity.city,
      condition: storedCity.condition || 'Unavailable',
      isOffline: true
    });

    showOfflineOverlay();
    renderSavedCities(storedCity.city);
    return;
  }

  // Online: fetch fresh data
  try {
    hideOfflineOverlay();

    const { weatherData, forecastData } = await fetchWeather(city);
    const newForecast = forecastData.forecast || [];

    const conditionChanged =
      !storedCity || weatherData.weather.WeatherText !== storedCity.condition;
    const forecastChanged =
      !storedCity || hasForecastChanged(newForecast, storedCity.forecast);

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
      temp: weatherData.weather.Temperature.Metric.Value ?? '--',
      icon: weatherData.weather.WeatherIcon || 1,
      forecast: newForecast
    });

    await trimStore(4, weatherData.details.EnglishName);

    renderSavedCities(weatherData.details.EnglishName);
  } catch (err) {
    console.error('Failed to update city:', err);
    memoryElement.textContent = `Could not load data for ${city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.remove('hidden');
  }
}

// Refresh weather data periodically
async function refreshWeatherData(force = false) {
  if (document.hidden) return;

  const storedCity = await getMostRecentCity();
  if (!storedCity) return;

  if (!navigator.onLine) {
    updateMemoryLine({
      city: storedCity.city,
      condition: storedCity.condition || 'Unavailable',
      isOffline: true
    });
    showOfflineOverlay();
    return;
  }

  hideOfflineOverlay();

  const minInterval = 15 * 60 * 1000; // 15 minutes
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
      forecast: forecastData.forecast || []
    }, !conditionChanged && !forecastChanged);

    updateMemoryLine({
      city: weatherData.details.EnglishName,
      condition: weatherData.weather.WeatherText,
      isOffline: false
    });

    await addCity(weatherData.details.EnglishName, {
      condition: weatherData.weather.WeatherText,
      temp: weatherData.weather.Temperature.Metric.Value ?? '--',
      icon: weatherData.weather.WeatherIcon || 1,
      forecast: forecastData.forecast || []
    });

    await trimStore(4, weatherData.details.EnglishName);
    renderSavedCities(weatherData.details.EnglishName);
  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent = `Could not refresh data for ${storedCity.city}. The forecast slipped out of reach.`;
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

// Offline/online events
window.addEventListener('offline', async () => {
  const city = await getMostRecentCity();
  if (!city) return;
  updateMemoryLine({
    city: city.city,
    condition: city.condition || 'Unavailable',
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
  renderSavedCities(storedCity?.city || null);

  if (storedCity) {
    await updateCity(storedCity.city);
  } else if (!navigator.onLine) {
    memoryElement.textContent = 'No stored weather data available offline. The weather isn\'t talking right now.';
    memoryElement.classList.add('loaded');
    showSkeletons();
    weatherWrapper.classList.remove('hidden');
    showOfflineOverlay();
  } else {
    getWeatherByLocation();
  }

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully.');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }
});
