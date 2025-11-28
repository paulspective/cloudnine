# ☁️ CloudNine

**Weather or not, we've got you covered.**

CloudNine is a polished, interactive weather app that taps into the AccuWeather API to deliver real-time forecasts wrapped in smooth animations and a responsive design.

## 📸 Screenshot

![CloudNine Preview](assets/cloudnine-screenshot.png)

## ✨ Features

- Real-time weather and 5-day forecast via AccuWeather
- Responsive design with smooth UI transitions
- Weather-based background updates
- Express backend with secure API integration
- Local caching for faster refreshes

## 🔧 Setup

To run CloudNine locally:

### 1. Clone the repository

```bash
git clone https://github.com/paulspective/cloudnine.git
```

### 2. Set up the backend

```bash
cd cloudnine/backend
npm install
```

Create a `.env` file and add your AccuWeather API key:

```env
ACCUWEATHER_KEY=your_actual_api_key
```

Start the server:

```bash
npm run dev
```

### 3. Launch the frontend

```bash
cd ../frontend
```

Open `index.html` in your browser (use Live Server or any static server).

## 🧠 Architecture

```
cloudnine/
├── backend/
│   ├── .env
│   ├── server.js
│   └── weather_service.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── icons/
│   └── scripts/
│       ├── api.js
│       ├── ui.js
│       └── main.js
├── assets/
│   ├── cloudnine-screenshot.png
│   └── favicons/
├── .gitignore
├── service-worker.js
├── manifest.json
└── README.md
```

## 🧰 Tech Stack
- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js, Express
- API: AccuWeather
- Tools: Git, Live Server, npm


## ❤️ Credits

Uses data from AccuWeather API 

Built with love, logic, and a little shimmer. ✨

---

## 🚀 v2.0 – Always Aware

- Added offline persistence: CloudNine now retains the last known weather data even after refresh or loss of connection.
- Auto-updates when connection is restored — no manual refresh needed.
- Enhanced background ripple and weather transitions.
- Improved caching logic and API response handling.
- Refined UI polish for smoother loading and idle states.

## 🚀 v1.1 – Shimmer & Sense

- Added geolocation support for automatic weather detection
- Improved ripple/gradient background transitions
- Added skeleton shimmer loaders for smoother content loading
- Smarter refresh logic with tab visibility and condition checks
- Minor fixes: Cleaner DOM updates and memory line sync