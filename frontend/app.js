const cityForm = document.querySelector('form');
const weatherWrapper = document.querySelector('.weather-wrapper');
const forecastContainer = document.querySelector('.forecast');
const memoryElement = document.querySelector('.memory');

// Memory
function getMemory(city, condition) {
  const skyMood = (condition || '').toLowerCase();

  if (skyMood.includes('rain') || skyMood.includes('showers')) {
    return `Last time in ${city}, the sky was weeping. Let's see what mood it's in now.`;
  }
  if (skyMood.includes('cloud')) {
    return `${city} wore a cloudy hush last time. Let's see what's changed.`;
  }
  if (skyMood.includes('sun') || skyMood.includes('clear')) {
    return `${city} basked in unapologetic light last time. Let's see if it's still glowing.`;
  }
  if (skyMood.includes('fog')) {
    return `The world faded to grayscale last time in ${city}. Trust your steps today.`;
  }
  if (skyMood.includes('mist') || skyMood.includes('haze')) {
    return `${city} wore a soft blur last time. Let's see what's come into focus.`;
  }
  if (skyMood.includes('snow')) {
    return `Silence fell in flakes last time in ${city}. Let's see what's stirring beneath.`;
  }
  if (skyMood.includes('thunder')) {
    return `The sky spoke in pulses last time in ${city}. Let's see if it's whispering now.`;
  }

  return `Last time in ${city}, the weather kept quiet. Let's see what it says today.`;
}

// Dynamic background
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

  document.querySelectorAll('.weather-ripple, .weather-transition').forEach(el => el.remove());

  // Ripple layer
  const rippleLayer = document.createElement('div');
  rippleLayer.className = 'weather-ripple';
  document.body.appendChild(rippleLayer);
  rippleLayer.addEventListener('animationend', () => rippleLayer.remove());

  // Transition layer
  const transitionLayer = document.createElement('div');
  transitionLayer.className = 'weather-transition';
  Object.assign(transitionLayer.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    background: newGradient,
    opacity: 0,
    transition: 'opacity 1s ease',
    willChange: 'opacity'
  });

  document.body.appendChild(transitionLayer);

  requestAnimationFrame(() => {
    transitionLayer.style.opacity = 1;
  });

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

// Show skeleton loaders
function showSkeletons() {
  const today = document.querySelector('.today');

  today.innerHTML = '';
  forecastContainer.innerHTML = '';

  today.innerHTML = `
    <div class="shimmer-wrap">
      <div class="shimmer-block"></div>
    </div>
    <div class="temperature skeleton" style="width:120px; height:40px;"></div>
    <div class="condition skeleton" style="width:80%; height:20px;"></div>
    <div class="city skeleton" style="width:60%; height:20px;"></div>
  `;

  for (let i = 0; i < 5; i++) {
    const div = document.createElement('div');
    div.className = 'day skeleton';
    forecastContainer.appendChild(div);
  }
}

// Update UI with weather data
function updateUI(data) {
  const { details, weather, forecast } = data;

  if (!details || !weather || !forecast) {
    memoryElement.textContent = `Could not load data. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
    return;
  }

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

  if (weatherWrapper.classList.contains('hidden')) {
    weatherWrapper.classList.remove('hidden');
  }
}

// Get weather by geolocation
async function getWeatherByLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;

    memoryElement.textContent = '';
    memoryElement.classList.remove('loaded');
    showSkeletons();

    try {
      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`http://localhost:3000/geoweather?lat=${latitude}&lon=${longitude}`),
        fetch(`http://localhost:3000/geoforecast?lat=${latitude}&lon=${longitude}`)
      ]);

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      updateUI({
        details: weatherData.details,
        weather: weatherData.weather,
        forecast: forecastData.forecast
      });

      localStorage.setItem('lastCity', weatherData.details.EnglishName);
      localStorage.setItem('lastCondition', weatherData.weather.WeatherText);
    } catch (err) {
      memoryElement.textContent = `Could not fetch your location's weather. Try typing your city.`;
      memoryElement.classList.add('loaded');
      weatherWrapper.classList.add('hidden');
      console.error(err);
    }
  }, () => {
    memoryElement.textContent = `Location access denied. Type your city instead.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
  });
}

// Update city weather and forecast
async function updateCity(city) {
  showSkeletons();

  const [weatherRes, forecastRes] = await Promise.all([
    fetch(`http://localhost:3000/weather?city=${city}`),
    fetch(`http://localhost:3000/forecast?city=${city}`)
  ]);

  const weatherData = await weatherRes.json();
  const forecastData = await forecastRes.json();

  return {
    details: weatherData.details,
    weather: weatherData.weather,
    forecast: forecastData.forecast
  };
}

// Form submission
cityForm.addEventListener('submit', e => {
  e.preventDefault();
  const cityInput = cityForm.city;
  if (!cityInput) return;
  const city = cityInput.value.trim();
  cityForm.reset();

  memoryElement.textContent = '';
  memoryElement.classList.remove('loaded');
  showSkeletons();

  updateCity(city)
    .then(data => {
      updateUI(data);
      localStorage.setItem('lastCity', data.details.EnglishName);
      localStorage.setItem('lastCondition', data.weather.WeatherText);
    })
    .catch(err => {
      memoryElement.textContent = `No forecast found. Maybe the sky's keeping secrets.`;
      memoryElement.classList.add('loaded');
      weatherWrapper.classList.add('hidden');
      console.error(err);
    });
});

// Auto-refresh logic
function isTabActive() {
  return !document.hidden;
}

async function refreshWeatherData() {
  if (!isTabActive()) {
    console.log('Tab is inactive. Skipping refresh.');
    return;
  }

  const savedCity = localStorage.getItem('lastCity');
  const lastCondition = localStorage.getItem('lastCondition');
  if (!savedCity) return;

  console.log(`Refreshing data for ${savedCity}...`);
  showSkeletons();

  try {
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`http://localhost:3000/weather?city=${savedCity}`),
      fetch(`http://localhost:3000/forecast?city=${savedCity}`)
    ]);

    if (!weatherRes.ok || !forecastRes.ok) throw new Error('Bad response');

    const weatherData = await weatherRes.json();
    const forecastData = await forecastRes.json();

    const newCondition = weatherData.weather.WeatherText;

    // Update memory line if condition changed
    if (newCondition !== lastCondition) {
      console.log(`Weather changed: ${lastCondition} → ${newCondition}`);
      const memoryLine = getMemory(savedCity, newCondition);
      memoryElement.textContent = memoryLine;
      memoryElement.classList.add('loaded');
      localStorage.setItem('lastCondition', newCondition);
    }

    updateUI({
      details: weatherData.details,
      weather: weatherData.weather,
      forecast: forecastData.forecast
    });

    localStorage.setItem('lastCity', weatherData.details.EnglishName);
  } catch (err) {
    console.error('Failed to refresh weather data:', err);
    memoryElement.textContent = `Could not refresh data for ${savedCity}. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshWeatherData();
  }
});

setInterval(refreshWeatherData, 1800000);

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  getWeatherByLocation();

  const savedCity = localStorage.getItem('lastCity');
  const savedCondition = localStorage.getItem('lastCondition');

  if (savedCity) {
    if (savedCondition) {
      const memoryLine = getMemory(savedCity, savedCondition);
      memoryElement.textContent = memoryLine;
      memoryElement.classList.add('loaded');
    }

    showSkeletons();
    updateCity(savedCity)
      .then(data => {
        updateUI(data);
        localStorage.setItem('lastCondition', data.weather.WeatherText);
      })
      .catch(err => {
        console.error('Initial load failed:', err);
        localStorage.removeItem('lastCity');
        localStorage.removeItem('lastCondition');
        memoryElement.textContent = `Could not load data for ${savedCity}. Maybe the sky's keeping secrets.`;
        memoryElement.classList.add('loaded');
        weatherWrapper.classList.add('hidden');
      });
  } else {
    weatherWrapper.classList.add('hidden');
  }
});
