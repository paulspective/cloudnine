// DOM Elements 
const cityForm = document.querySelector('form');
const weatherWrapper = document.querySelector('.weather-wrapper');
const forecastContainer = document.querySelector('.forecast');
const memoryElement = document.querySelector('.memory');

// Memory
function getMemory(city, condition) {
  const skyMood = (condition || '').toLowerCase();
  if (skyMood.includes('rain') || skyMood.includes('showers')) return `Last time in ${city}, the sky was weeping. Let's see what mood it's in now.`;
  if (skyMood.includes('cloud')) return `${city} wore a cloudy hush last time. Let's see what's changed.`;
  if (skyMood.includes('sun') || skyMood.includes('clear')) return `${city} basked in unapologetic light last time. Let's see if it's still glowing.`;
  if (skyMood.includes('fog')) return `The world faded to grayscale last time in ${city}. Trust your steps today.`;
  if (skyMood.includes('mist') || skyMood.includes('haze')) return `${city} wore a soft blur last time. Let's see what's come into focus.`;
  if (skyMood.includes('snow')) return `Silence fell in flakes last time in ${city}. Let's see what's stirring beneath.`;
  if (skyMood.includes('thunder')) return `The sky spoke in pulses last time in ${city}. Let's see if it's whispering now.`;
  return `Last time in ${city}, the weather kept quiet. Let's see what it says today.`;
}

function getOfflineMessage({ city }) {
  return city ? `You're offline. Showing last known weather for ${city}.` : "You're offline and no previous data is available.";
}

function updateMemoryLine({ city, condition, isOffline = false }) {
  memoryElement.textContent = isOffline ? getOfflineMessage({ city }) : getMemory(city, condition);
  memoryElement.classList.add('loaded');
}

// State Management
function saveWeatherState({ city, condition, forecast }) {
  const forecastSummary = forecast.map(d => d.Day.IconPhrase).join(', ');
  const state = { city, condition, forecastSummary, lastUpdate: Date.now() };
  localStorage.setItem('lastWeather', JSON.stringify(state));
  return state;
}

function getStoredWeatherState() {
  return JSON.parse(localStorage.getItem('lastWeather') || '{}');
}

// Skeletons
function showSkeletons() {
  const today = document.querySelector('.today');
  today.innerHTML = `
    <div class="shimmer-wrap"><div class="shimmer-block"></div></div>
    <div class="temperature skeleton" style="width:120px; height:40px;"></div>
    <div class="condition skeleton" style="width:80%; height:20px;"></div>
    <div class="city skeleton" style="width:60%; height:20px;"></div>
  `;
  forecastContainer.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const div = document.createElement('div');
    div.className = 'day skeleton';
    forecastContainer.appendChild(div);
  }
}

// Dynamic Background 
function setDynamicBackground(weather = 'clear') {
  const weatherType = weather.toLowerCase();
  const gradients = {
    rain: 'linear-gradient(135deg, #3AB4B4, #7B8D9E)',
    drizzle: 'linear-gradient(135deg, #3AB4B4, #7B8D9E)',
    cloud: 'linear-gradient(135deg, #A9C0D9, #7B8D9E)',
    overcast: 'linear-gradient(135deg, #9E9E9E, #B0BEC5)',
    thunder: 'linear-gradient(135deg, #5C5C70, #A3A3B5, #D6D6E0)',
    snow: 'linear-gradient(135deg, #E0F7FA, #B2EBF2)',
    mist: 'linear-gradient(135deg, #CFD8DC, #ECEFF1)',
    fog: 'linear-gradient(135deg, #B0BEC5, #CFD8DC)',
    haze: 'linear-gradient(135deg, #D7CCC8, #BCAAA4)',
    default: 'linear-gradient(135deg, #4A90E2, #F5C542)'
  };
  const matchedKey = Object.keys(gradients).find(key => key !== 'default' && weatherType.includes(key));
  const newGradient = gradients[matchedKey] || gradients.default;

  if (document.body.style.background === newGradient) return;

  document.querySelectorAll('.weather-ripple, .weather-transition').forEach(el => el.remove());

  const rippleLayer = document.createElement('div');
  rippleLayer.className = 'weather-ripple';
  document.body.appendChild(rippleLayer);
  rippleLayer.addEventListener('animationend', () => rippleLayer.remove());

  const transitionLayer = document.createElement('div');
  transitionLayer.className = 'weather-transition';
  Object.assign(transitionLayer.style, {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    zIndex: -1, background: newGradient, opacity: 0,
    transition: 'opacity 1s ease', willChange: 'opacity'
  });
  document.body.appendChild(transitionLayer);

  requestAnimationFrame(() => transitionLayer.style.opacity = 1);
  transitionLayer.addEventListener('transitionend', () => {
    document.body.style.background = newGradient;
    transitionLayer.remove();
  });
  setTimeout(() => {
    if (document.body.contains(transitionLayer)) {
      document.body.style.background = newGradient;
      transitionLayer.remove();
    }
  }, 1000);
}

// Fetch 
async function fetchWeather(city) {
  const [weatherRes, forecastRes] = await Promise.all([
    fetch(`http://localhost:3000/weather?city=${city}`),
    fetch(`http://localhost:3000/forecast?city=${city}`)
  ]);
  if (!weatherRes.ok || !forecastRes.ok) throw new Error('Bad response');
  return { weatherData: await weatherRes.json(), forecastData: await forecastRes.json() };
}

async function fetchWeatherByCoords(lat, lon) {
  const [weatherRes, forecastRes] = await Promise.all([
    fetch(`http://localhost:3000/geoweather?lat=${lat}&lon=${lon}`),
    fetch(`http://localhost:3000/geoforecast?lat=${lat}&lon=${lon}`)
  ]);
  if (!weatherRes.ok || !forecastRes.ok) throw new Error('Bad response');
  return { weatherData: await weatherRes.json(), forecastData: await forecastRes.json() };
}

// UI Update
function updateUI({ details, weather, forecast }, skipSkeleton = false) {
  if (!skipSkeleton) showSkeletons();

  const today = document.querySelector('.today');
  today.innerHTML = `
    <div class="shimmer-wrap">
      <div class="icon"><img src="./icons/${weather.WeatherIcon}.svg" alt="${weather.WeatherText}"></div>
    </div>
    <div class="temperature">${Math.round(weather.Temperature.Metric.Value)}&deg;C</div>
    <div class="condition">${weather.WeatherText}</div>
    <div class="city">${details.EnglishName}</div>
  `;

  setDynamicBackground(weather.WeatherText);

  forecastContainer.innerHTML = '';
  forecast.forEach(day => {
    const date = new Date(day.Date);
    const todayDate = new Date();
    const isToday = date.toDateString() === todayDate.toDateString();
    const weekday = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

    const div = document.createElement('div');
    div.classList.add('day');
    div.innerHTML = `
      <img src="./icons/${day.Day.Icon}.svg" alt="">
      <div class="weekday">${weekday}</div>
      <div class="temp">H ${Math.round(day.Temperature.Maximum.Value)}°C / L ${Math.round(day.Temperature.Minimum.Value)}°C</div>
    `;
    forecastContainer.appendChild(div);
  });

  weatherWrapper.classList.remove('hidden');
}

// Update City / auto refresh 
async function updateCity(city) {
  showSkeletons();
  try {
    const { weatherData, forecastData } = await fetchWeather(city);

    updateUI({ details: weatherData.details, weather: weatherData.weather, forecast: forecastData.forecast });
    updateMemoryLine({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText });
    saveWeatherState({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText, forecast: forecastData.forecast });
  } catch (err) {
    console.error('Failed to update city:', err);
    memoryElement.textContent = `Could not load data for ${city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
  }
}

async function refreshWeatherData(force = false) {
  const storedState = getStoredWeatherState();
  if (!storedState.city) return;

  if (!navigator.onLine) {
    updateMemoryLine({ city: storedState.city, condition: storedState.condition, isOffline: true });
    showOfflineOverlay();
    return;
  } else hideOfflineOverlay();

  const minInterval = 10 * 60 * 1000;
  if (!force && storedState.lastUpdate && Date.now() - storedState.lastUpdate < minInterval) return;

  showSkeletons();
  try {
    const { weatherData, forecastData } = await fetchWeather(storedState.city);
    updateUI({ details: weatherData.details, weather: weatherData.weather, forecast: forecastData.forecast });
    updateMemoryLine({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText });
    saveWeatherState({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText, forecast: forecastData.forecast });
  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent = `Could not refresh data for ${storedState.city}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
  }
}

// Geolocation
function getWeatherByLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    try {
      const { weatherData, forecastData } = await fetchWeatherByCoords(latitude, longitude);
      updateUI({ details: weatherData.details, weather: weatherData.weather, forecast: forecastData.forecast });
      updateMemoryLine({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText });
      saveWeatherState({ city: weatherData.details.EnglishName, condition: weatherData.weather.WeatherText, forecast: forecastData.forecast });
    } catch {
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

// Offline/online overlay
function showOfflineOverlay() {
  if (document.querySelector('.offline-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'offline-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.3)',
    opacity: 0,
    transition: 'opacity 0.5s ease',
    zIndex: 9999,
    pointerEvents: 'none'
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.style.opacity = 1);
}
function hideOfflineOverlay() {
  const overlay = document.querySelector('.offline-overlay');
  if (!overlay) return;
  overlay.style.opacity = 0;
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}
window.addEventListener('offline', () => {
  const storedState = getStoredWeatherState();
  updateMemoryLine({ city: storedState.city, condition: storedState.condition, isOffline: true });
  showOfflineOverlay();
});
window.addEventListener('online', () => {
  hideOfflineOverlay();
  const storedState = getStoredWeatherState();
  if (storedState.city) {
    updateMemoryLine({ city: storedState.city, condition: storedState.condition, isOffline: false });
    refreshWeatherData(true);
  }
});

// Event Listeners 
cityForm.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityForm.city.value.trim();
  if (!city) return;
  cityForm.reset();
  updateCity(city);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) setTimeout(refreshWeatherData, 300);
});

// Initial Load
window.addEventListener('DOMContentLoaded', () => {
  const storedState = getStoredWeatherState();
  getWeatherByLocation();

  if (storedState.city) {
    updateMemoryLine({ city: storedState.city, condition: storedState.condition, isOffline: !navigator.onLine });
    if (navigator.onLine) refreshWeatherData(true);
  } else weatherWrapper.classList.add('hidden');
});
