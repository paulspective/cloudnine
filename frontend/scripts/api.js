import { memoryElement, weatherWrapper, updateUI } from "./ui.js";
import { saveWeatherState } from "./main.js";

export async function fetchWeather(city) {
  const [weatherRes, forecastRes] = await Promise.all([
    fetch(`http://localhost:3000/weather?city=${city}`),
    fetch(`http://localhost:3000/forecast?city=${city}`)
  ]);
  if (!weatherRes.ok || !forecastRes.ok) throw new Error('Bad response');

  const weatherData = await weatherRes.json();
  const forecastData = await forecastRes.json();
  return { weatherData, forecastData };
}

async function fetchWeatherByCoords(lat, lon) {
  const [weatherRes, forecastRes] = await Promise.all([
    fetch(`http://localhost:3000/geoweather?lat=${lat}&lon=${lon}`),
    fetch(`http://localhost:3000/geoforecast?lat=${lat}&lon=${lon}`)
  ]);
  if (!weatherRes.ok || !forecastRes.ok) throw new Error('Bad response');

  const weatherData = await weatherRes.json();
  const forecastData = await forecastRes.json();
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
        forecast: forecastData.forecast
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