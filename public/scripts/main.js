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

import { addCity, getMostRecentCity, getStoredCities, trimStore } from './db.js';

// Render saved cities excluding the current one
async function renderSavedCities(currentCity) {
  const cities = await getStoredCities();
  const container = document.getElementById('recentCitiesList');
  if (!container) return;
  container.innerHTML = '';

  // Filter out the currently displayed city
  const filtered = cities.filter(c =>
    !currentCity || c.city.toLowerCase() !== currentCity.toLowerCase()
  );

  if (filtered.length > 0) {
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
  } else {
    container.parentElement.style.display = 'none';
  }
}

// Main update function
async function updateCity(city) {
  showSkeletons();
  const storedCity = await getMostRecentCity();

  // Offline: show stored weather data
  if (!navigator.onLine) {
    const storedCities = await getStoredCities();
    const match = storedCities.find(
      c => c.city.toLowerCase() === city.toLowerCase()
    );

    if (match) {
      updateUI({
        details: { EnglishName: match.city },
        weather: {
          WeatherText: match.condition,
          WeatherIcon: match.icon || 1,
          Temperature: { Metric: { Value: match.temp ?? null } }
        },
        forecast: match.forecast || []
      }, true);

      updateMemoryLine({
        city: match.city,
        condition: match.condition,
        isOffline: true
      });

      showOfflineOverlay();
    } else {
      memoryElement.textContent = `Cannot load data for ${city} while offline.`;
      memoryElement.classList.add('loaded');
      weatherWrapper.classList.remove('hidden');
    }
    return;
  }

  // Online: fetch weather
  try {
    const { weatherData, forecastData } = await fetchWeather(city);

    const conditionChanged = !storedCity || weatherData.weather.WeatherText !== storedCity.condition;
    const forecastChanged = !storedCity || JSON.stringify(forecastData.forecast) !== JSON.stringify(storedCity.forecast);

    setTimeout(async () => {
      updateUI({
        details: weatherData.details,
        weather: weatherData.weather,
        forecast: forecastData.forecast
      }, !conditionChanged && !forecastChanged);

      const newCity = !storedCity || city.toLowerCase() !== storedCity.city.toLowerCase();

      updateMemoryLine({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        isFresh: newCity
      });

      await addCity(weatherData.details.EnglishName, {
        condition: weatherData.weather.WeatherText,
        temp: weatherData.weather.Temperature.Metric.Value,
        icon: weatherData.weather.WeatherIcon,
        forecast: forecastData.forecast
      });
      await trimStore();

      // Render recent cities excluding the current one
      renderSavedCities(weatherData.details.EnglishName);
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

  const storedCity = await getMostRecentCity();
  if (!storedCity) return;

  // Skip refresh if offline
  if (!navigator.onLine) {
    memoryElement.textContent = getOfflineMessage(storedCity);
    memoryElement.classList.add('loaded');
    updateMemoryLine({
      city: storedCity.city,
      condition: storedCity.condition,
      isOffline: true
    });
    showOfflineOverlay();
    return;
  } else {
    hideOfflineOverlay();
  }

  const minInterval = 10 * 60 * 1000;
  if (!force && storedCity.lastUpdate && Date.now() - storedCity.lastUpdate < minInterval) return;

  try {
    showSkeletons();
    const { weatherData, forecastData } = await fetchWeather(storedCity.city);

    const conditionChanged = weatherData.weather.WeatherText !== storedCity.condition;
    const forecastChanged = JSON.stringify(forecastData.forecast) !== JSON.stringify(storedCity.forecast);

    setTimeout(async () => {
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

      // Render recent cities excluding the current one
      renderSavedCities(weatherData.details.EnglishName);
    }, 100);
  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent = `Could not refresh data for ${storedCity.city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
  }
}

// Visibility refresh
let tabActiveTimeout;
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    clearTimeout(tabActiveTimeout);
    tabActiveTimeout = setTimeout(refreshWeatherData, 300);
  }
});

// Offline/Online events
window.addEventListener('offline', async () => {
  const storedCities = await getStoredCities();
  if (storedCities.length > 0) {
    storedCities.forEach(city => {
      updateMemoryLine({
        city: city.city,
        condition: city.condition,
        isOffline: true
      });
    });
    showOfflineOverlay();
  }
});

window.addEventListener('online', async () => {
  hideOfflineOverlay();
  const storedCity = await getMostRecentCity();
  if (storedCity) await refreshWeatherData(true);
});

// City form
const cityForm = document.querySelector('form');
cityForm.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityForm.city.value.trim().toLowerCase();
  if (!city) return;
  cityForm.reset();
  updateCity(city);
});

// Initial Load
window.addEventListener('DOMContentLoaded', async () => {
  const storedCities = await getStoredCities();

  if (storedCities.length > 0) {
    await updateCity(storedCities[0].city);
    renderSavedCities(storedCities[0].city);
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