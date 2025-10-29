import { fetchWeather, getWeatherByLocation } from './api.js';
import { updateUI, updateMemoryLine, showOfflineOverlay, hideOfflineOverlay, getOfflineMessage, showSkeletons, memoryElement, weatherWrapper } from './ui.js';

// State Management
export function saveWeatherState({ city, condition, temp, icon, forecast }) {
  const state = { city, condition, temp, icon, forecast, lastUpdate: Date.now() };
  localStorage.setItem('lastWeather', JSON.stringify(state));
  return state;
}

export function getStoredWeatherState() {
  return JSON.parse(localStorage.getItem('lastWeather') || '{}');
}

// Main update function
async function updateCity(city) {
  showSkeletons();
  const storedState = getStoredWeatherState();

  // Offline: show stored weather data
  if (!navigator.onLine) {
    if (storedState.city && storedState.city.toLowerCase() === city.toLowerCase()) {
      updateUI(
        {
          details: { EnglishName: storedState.city },
          weather: {
            WeatherText: storedState.condition,
            WeatherIcon: storedState.icon || 1,
            Temperature: { Metric: { Value: storedState.temp ?? null } }
          },
          forecast: storedState.forecast || []
        },
        true
      );

      updateMemoryLine({
        city: storedState.city,
        condition: storedState.condition,
        isOffline: true
      });

      memoryElement.textContent = getOfflineMessage(storedState);
      memoryElement.classList.add('loaded');
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

    const conditionChanged = weatherData.weather.WeatherText !== storedState.condition;
    const forecastChanged =
      JSON.stringify(forecastData.forecast) !== JSON.stringify(storedState.forecast);

    setTimeout(() => {
      updateUI(
        {
          details: weatherData.details,
          weather: weatherData.weather,
          forecast: forecastData.forecast
        },
        !conditionChanged && !forecastChanged
      );

      const newCity = cityForm.city.value.trim().toLowerCase() !== (storedState.city || '').toLowerCase();

      updateMemoryLine({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        isFresh: newCity
      });

      saveWeatherState({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        temp: weatherData.weather.Temperature.Metric.Value,
        icon: weatherData.weather.WeatherIcon,
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
    updateMemoryLine({
      city: storedState.city,
      condition: storedState.condition,
      isOffline: true
    });
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
    const forecastChanged =
      JSON.stringify(forecastData.forecast) !== JSON.stringify(storedState.forecast);

    setTimeout(() => {
      updateUI(
        {
          details: weatherData.details,
          weather: weatherData.weather,
          forecast: forecastData.forecast
        },
        !conditionChanged && !forecastChanged
      );

      updateMemoryLine({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        isOffline: false
      });

      saveWeatherState({
        city: weatherData.details.EnglishName,
        condition: weatherData.weather.WeatherText,
        temp: weatherData.weather.Temperature.Metric.Value,
        icon: weatherData.weather.WeatherIcon,
        forecast: forecastData.forecast
      });
    }, 100);
  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent = `Could not refresh data for ${storedState.city}. Maybe the sky's keeping secrets.`;
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
window.addEventListener('offline', () => {
  const storedState = getStoredWeatherState();
  updateMemoryLine({
    city: storedState.city,
    condition: storedState.condition,
    isOffline: true
  });
  showOfflineOverlay();
});

window.addEventListener('online', async () => {
  hideOfflineOverlay();
  const storedState = getStoredWeatherState();
  if (storedState.city) await refreshWeatherData(true);
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
  const storedState = getStoredWeatherState();

  if (storedState.city) {
    // Online: fetch latest weather
    if (navigator.onLine) {
      refreshWeatherData(true);
    } else {
      // Offline: show stored weather data
      updateUI(
        {
          details: { EnglishName: storedState.city },
          weather: {
            WeatherText: storedState.condition,
            WeatherIcon: storedState.icon || 1,
            Temperature: { Metric: { Value: storedState.temp ?? null } }
          },
          forecast: storedState.forecast || []
        },
        true
      );

      updateMemoryLine({
        city: storedState.city,
        condition: storedState.condition,
        isOffline: true
      });

      memoryElement.textContent = getOfflineMessage(storedState);
      memoryElement.classList.add('loaded');
      showOfflineOverlay();
    }
  } else {
    getWeatherByLocation();
  }
});