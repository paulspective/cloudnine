export const weatherWrapper = document.querySelector('.weather-wrapper');
export const forecastContainer = document.querySelector('.forecast');
export const memoryElement = document.querySelector('.memory');

// Memory line
export function getMemory(city, condition) {
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

export async function updateMemoryLine({ city, condition, isOffline = false, isFresh = false }) {
  if (!city) return;

  if (isOffline) {
    memoryElement.textContent = getOfflineMessage(city);
    memoryElement.classList.add('loaded');
    return;
  }

  if (isFresh) {
    memoryElement.textContent = `Here's what the sky has to say about ${city}.`;
    memoryElement.classList.add('loaded');
    return;
  }

  memoryElement.classList.add('loaded');
}

// Dynamic background
let isTransitioning = false;

export function setDynamicBackground(weather = 'clear') {
  if (isTransitioning) return;
  isTransitioning = true;

  const weatherType = (weather || '').toLowerCase();
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

  const matchedKey = Object.keys(gradients).find(
    key => key !== 'default' && weatherType.includes(key)
  );
  const newGradient = gradients[matchedKey] || gradients.default;

  const currentBg = document.body.dataset.bgGradient;
  if (currentBg === newGradient) {
    isTransitioning = false;
    return;
  }

  if (!document.body.style.transition.includes('background')) {
    document.body.style.transition = 'background 1s ease';
  }

  const rippleLayer = document.createElement('div');
  rippleLayer.className = 'weather-ripple';
  document.body.appendChild(rippleLayer);
  rippleLayer.addEventListener('animationend', () => rippleLayer.remove());

  document.body.style.background = newGradient;
  document.body.dataset.bgGradient = newGradient;

  setTimeout(() => (isTransitioning = false), 1000);
}

// UI skeletons
export function showSkeletons() {
  const today = document.querySelector('.today');
  if (!today) return;

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

// Offline overlay updates
export function showOfflineOverlay() {
  if (document.querySelector('.offline-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'offline-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.23)',
    opacity: 0,
    transition: 'opacity 0.5s ease',
    zIndex: 9999,
    pointerEvents: 'none'
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.style.opacity = 1);
}

export function hideOfflineOverlay() {
  const overlay = document.querySelector('.offline-overlay');
  if (!overlay) return;

  overlay.style.opacity = 0;
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

export function getOfflineMessage(city) {
  if (!city) return "You're offline and no previous data is available.";
  return `You're offline. Showing last known weather for ${city}.`;
}

// UI update 
export function updateUI({ details, weather, forecast }, skipSkeleton = false) {
  if (!skipSkeleton) showSkeletons();

  const today = document.querySelector('.today');
  if (!today) return;

  // Safe access for all weather fields
  const tempValue = weather?.Temperature?.Metric?.Value;
  const tempDisplay =
    typeof tempValue === 'number' && !isNaN(tempValue)
      ? `${Math.round(tempValue)}°C`
      : '--°C';

  const condition = weather?.WeatherText || 'Unknown';
  const icon = weather?.WeatherIcon || 1;
  const cityName = details?.EnglishName || 'Unknown location';

  today.innerHTML = `
    <div class="shimmer-wrap">
      <div class="icon"><img src="./icons/${icon}.svg" alt="${condition}"></div>
    </div>
    <div class="temperature">${tempDisplay}</div>
    <div class="condition">${condition}</div>
    <div class="city">${cityName}</div>
  `;

  setDynamicBackground(condition);

  forecastContainer.innerHTML = '';

  // Handle missing or empty forecast data
  if (Array.isArray(forecast) && forecast.length > 0) {
    forecast.forEach(day => {
      const date = new Date(day.Date);
      const todayDate = new Date();
      const isToday = date.toDateString() === todayDate.toDateString();
      const weekday = isToday
        ? 'Today'
        : date.toLocaleDateString('en-US', { weekday: 'short' });

      const maxTemp = day?.Temperature?.Maximum?.Value;
      const minTemp = day?.Temperature?.Minimum?.Value;

      const tempText =
        typeof maxTemp === 'number' && typeof minTemp === 'number'
          ? `H ${Math.round(maxTemp)}°C / L ${Math.round(minTemp)}°C`
          : '--°C';

      const div = document.createElement('div');
      div.classList.add('day');
      div.innerHTML = `
        <img src="./icons/${day?.Day?.Icon || 1}.svg" alt="">
        <div class="weekday">${weekday}</div>
        <div class="temp">${tempText}</div>
      `;
      forecastContainer.appendChild(div);
    });
  } else {
    const div = document.createElement('div');
    div.classList.add('day');
    div.innerHTML = `
      <div class="weekday">No Data</div>
      <div class="temp">--°C</div>
    `;
    forecastContainer.appendChild(div);
  }

  weatherWrapper.classList.remove('hidden');
}