const cityForm = document.querySelector('form');
const weatherWrapper = document.querySelector('.weather-wrapper');
const todayIcon = document.querySelector('.today .icon img');
const todayTemp = document.querySelector('.today .temperature');
const todayCondition = document.querySelector('.today .condition');
const todayCity = document.querySelector('.today .city');
const forecastContainer = document.querySelector('.forecast');
const memoryElement = document.querySelector('.memory');

// Memory
function getMemory(city, condition) {
  const skyMood = condition.toLowerCase();

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

  // Create ripple shimmer layer
  const rippleLayer = document.createElement('div');
  rippleLayer.className = 'weather-ripple';
  document.body.appendChild(rippleLayer);

  rippleLayer.addEventListener('animationend', () => {
    document.body.removeChild(rippleLayer);
  });

  // Create gradient transition layer
  const transitionLayer = document.createElement('div');
  transitionLayer.style.position = 'fixed';
  transitionLayer.style.top = 0;
  transitionLayer.style.left = 0;
  transitionLayer.style.width = '100%';
  transitionLayer.style.height = '100%';
  transitionLayer.style.zIndex = -1;
  transitionLayer.style.background = newGradient;
  transitionLayer.style.opacity = 0;
  transitionLayer.style.transition = 'opacity 1s ease';

  document.body.appendChild(transitionLayer);

  requestAnimationFrame(() => {
    transitionLayer.style.opacity = 1;
  });

  setTimeout(() => {
    document.body.style.background = newGradient;
    document.body.removeChild(transitionLayer);
  }, 1000);
}

function updateUI(data) {
  const { details, weather, forecast } = data;

  if (!details || !weather || !forecast) {
    memoryElement.textContent = `Could not load data. Maybe the sky's keeping secrets.`;
    memoryElement.classList.add('loaded');
    weatherWrapper.classList.add('hidden');
    return;
  }

  // Today
  todayIcon.setAttribute('src', `./icons/${weather.WeatherIcon}.svg`);
  todayTemp.innerHTML = `${Math.round(weather.Temperature.Metric.Value)}&deg;C`;
  todayCondition.textContent = weather.WeatherText;
  todayCity.textContent = details.EnglishName;

  // Background gradient
  setDynamicBackground(weather.WeatherText);

  // Forecast
  forecastContainer.innerHTML = '';
  forecast.forEach(day => {
    const div = document.createElement('div');
    div.classList.add('day');

    const date = new Date(day.Date);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const weekday = isToday
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'short' });

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

// Fetching data
async function updateCity(city) {
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

// Form submit
cityForm.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityForm.city.value.trim();
  cityForm.reset();

  memoryElement.textContent = '';
  memoryElement.classList.remove('loaded');

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

// Refresh and auto load logic
function isTabActive() {
  return !document.hidden;
}

function refreshWeatherData() {
  if (!isTabActive()) {
    console.log('Tab is inactive. Skipping refresh.');
    return;
  }

  const savedCity = localStorage.getItem('lastCity');
  if (savedCity) {
    console.log(`Refreshing data for ${savedCity}...`);
    updateCity(savedCity)
      .then(data => {
        const newCondition = data.weather.WeatherText;
        const lastCondition = localStorage.getItem('lastCondition');

        localStorage.setItem('lastCity', data.details.EnglishName);

        if (newCondition !== lastCondition) {
          console.log(`Weather changed: ${lastCondition} → ${newCondition}`);
          updateUI(data);
          localStorage.setItem('lastCondition', newCondition);
        } else {
          console.log('Weather unchanged. Skipping UI update.');
        }
      })
      .catch(err => console.error('Failed to refresh weather data:', err));
  }
}

// Refresh data when the tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshWeatherData();
  }
});

// Refresh data every 30 minutes
setInterval(refreshWeatherData, 1800000);

// Intial load logic
window.addEventListener('DOMContentLoaded', () => {
  const savedCity = localStorage.getItem('lastCity');
  const savedCondition = localStorage.getItem('lastCondition');

  if (savedCity) {
    if (savedCondition) {
      const memoryLine = getMemory(savedCity, savedCondition);
      memoryElement.textContent = memoryLine;
      memoryElement.classList.add('loaded');
    }

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