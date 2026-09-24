"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================================
       1. GLOBAL STATE & DOM ELEMENTS
       ========================================================================== */
    const state = {
        city: "",
        country: "",
        latitude: null,
        longitude: null,
        weather: null,
        forecast: null,
        airQuality: null,
        unit: localStorage.getItem("weatherUnit") || "C",
        favoriteId: null,
        timezone: 0,
        refreshTimer: null,
        soundEnabled: false,
        activeCondition: "Clear"
    };

    const $ = (id) => document.getElementById(id);

    const elements = {
        canvas: $("weather-canvas"),
        searchForm: $("search-form"),
        cityInput: $("city-input"),
        clearSearchBtn: $("clear-search-btn"),
        suggestDropdown: $("suggest-dropdown"),
        locationBtn: $("location-btn"),
        unitC: $("unit-c"),
        unitF: $("unit-f"),
        themeToggleBtn: $("theme-toggle-btn"),
        ambientSoundBtn: $("ambient-sound-btn"),

        errorBanner: $("error-banner"),
        errorMessage: $("error-message"),
        closeErrorBtn: $("close-error-btn"),

        cityName: $("city-name"),
        countryBadge: $("country-badge"),
        favToggleBtn: $("fav-toggle-btn"),
        liveDate: $("live-date"),
        liveClock: $("live-clock"),

        weatherIcon: $("weather-icon"),
        currentTemp: $("current-temp"),
        weatherCondition: $("weather-condition"),
        feelsLikeTemp: $("feels-like-temp"),
        tempMax: $("temp-max"),
        tempMin: $("temp-min"),
        weatherDescription: $("weather-description"),

        humidityValue: $("humidity-value"),
        humidityDesc: $("humidity-desc"),
        windValue: $("wind-value"),
        windUnit: $("wind-unit"),
        windDirDesc: $("wind-dir-desc"),
        beaufortLabel: $("beaufort-label"),
        pressureValue: $("pressure-value"),
        visibilityValue: $("visibility-value"),
        visibilityDesc: $("visibility-desc"),
        cloudsValue: $("clouds-value"),
        dewPointValue: $("dew-point-value"),

        sunriseTime: $("sunrise-time"),
        sunsetTime: $("sunset-time"),

        hourlyChartSvg: $("hourly-chart-svg"),
        hourlyForecastContainer: $("hourly-forecast-container"),
        dailyForecastContainer: $("daily-forecast-container"),

        aqiLevelBadge: $("aqi-level-badge"),
        aqiValue: $("aqi-value"),
        aqiProgressBar: $("aqi-progress-bar"),
        pm25Val: $("pm25-val"),
        pm10Val: $("pm10-val"),
        coVal: $("co-val"),
        no2Val: $("no2-val"),
        so2Val: $("so2-val"),
        o3Val: $("o3-val"),

        uvIndexVal: $("uv-index-val"),
        uvBadge: $("uv-badge"),
        uvProgressBar: $("uv-progress-bar"),
        uvAdviceText: $("uv-advice-text"),

        compassNeedle: $("compass-needle"),
        windDegreesVal: $("wind-degrees-val"),

        activitiesContainer: $("activities-container"),

        recentSearchesContainer: $("recent-searches-container"),
        favoritesContainer: $("favorites-container"),
        worldCitiesContainer: $("world-cities-container"),

        lastUpdatedText: $("last-updated-text"),
        refreshSpinner: $("refresh-spinner"),
        skeletonLoader: $("skeleton-loader"),
        weatherDashboard: $("weather-dashboard")
    };

    const WORLD_CITIES = [
        { name: "Mumbai", flag: "🇮🇳" },
        { name: "London", flag: "🇬🇧" },
        { name: "New York", flag: "🇺🇸" },
        { name: "Tokyo", flag: "🇯🇵" },
        { name: "Paris", flag: "🇫🇷" },
        { name: "Sydney", flag: "🇦🇺" },
        { name: "Dubai", flag: "🇦🇪" }
    ];

    const POPULAR_SUGGESTIONS = [
        "Mumbai", "Delhi", "Bengaluru", "Pune", "London", "New York", "Tokyo",
        "Paris", "Singapore", "Sydney", "Dubai", "Berlin", "Toronto", "Chicago",
        "San Francisco", "Rome", "Madrid", "Bangkok", "Seoul", "Amsterdam"
    ];

    /* ==========================================================================
       2. CANVAS WEATHER ANIMATION ENGINE
       ========================================================================== */
    class WeatherCanvasEngine {
        constructor(canvas) {
            if (!canvas) return;
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.particles = [];
            this.condition = "Clear";
            this.isNight = false;
            this.lightningTimer = 0;
            this.resize();

            window.addEventListener("resize", () => this.resize());
            this.animate();
        }

        resize() {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.initParticles();
        }

        setCondition(condition, isNight = false) {
            this.condition = condition;
            this.isNight = isNight;
            this.initParticles();
        }

        initParticles() {
            this.particles = [];
            const count = this.condition === "Rain" ? 120 :
                          this.condition === "Snow" ? 80 :
                          this.condition === "Thunderstorm" ? 150 :
                          this.condition === "Clouds" ? 25 :
                          this.isNight ? 90 : 35; // Sunbeams or Stars

            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    length: Math.random() * 20 + 10,
                    speed: Math.random() * 8 + 4,
                    radius: Math.random() * 3 + 1,
                    opacity: Math.random() * 0.7 + 0.3,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: Math.random() * 2 + 0.5,
                    pulse: Math.random() * 0.05 + 0.01,
                    angle: Math.random() * Math.PI * 2
                });
            }
        }

        animate() {
            this.ctx.clearRect(0, 0, this.width, this.height);

            if (this.condition === "Rain" || this.condition === "Drizzle") {
                this.drawRain();
            } else if (this.condition === "Thunderstorm") {
                this.drawRain();
                this.drawLightning();
            } else if (this.condition === "Snow") {
                this.drawSnow();
            } else if (this.condition === "Clouds" || this.condition === "Mist" || this.condition === "Fog") {
                this.drawClouds();
            } else if (this.isNight) {
                this.drawStars();
            } else {
                this.drawSunbeams();
            }

            requestAnimationFrame(() => this.animate());
        }

        drawRain() {
            this.ctx.strokeStyle = "rgba(186, 230, 253, 0.4)";
            this.ctx.lineWidth = 1.8;
            this.ctx.lineCap = "round";

            this.particles.forEach((p) => {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - 3, p.y + p.length);
                this.ctx.stroke();

                p.y += p.speed;
                p.x -= 0.8;

                if (p.y > this.height) {
                    p.y = -20;
                    p.x = Math.random() * this.width;
                }
            });
        }

        drawLightning() {
            if (Math.random() < 0.015) {
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
                this.ctx.fillRect(0, 0, this.width, this.height);
            }
        }

        drawSnow() {
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            this.particles.forEach((p) => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();

                p.y += p.vy;
                p.x += Math.sin(p.angle) * 0.8;
                p.angle += 0.02;

                if (p.y > this.height) {
                    p.y = -10;
                    p.x = Math.random() * this.width;
                }
            });
        }

        drawClouds() {
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
            this.particles.forEach((p) => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius * 35, 0, Math.PI * 2);
                this.ctx.fill();

                p.x += p.vx * 0.3;
                if (p.x > this.width + 100) p.x = -100;
            });
        }

        drawStars() {
            this.particles.forEach((p) => {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
                this.ctx.fill();

                p.opacity += p.pulse;
                if (p.opacity > 0.9 || p.opacity < 0.2) p.pulse = -p.pulse;
            });
        }

        drawSunbeams() {
            this.particles.forEach((p) => {
                this.ctx.fillStyle = `rgba(254, 240, 138, ${p.opacity * 0.4})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
                this.ctx.fill();

                p.y -= p.vy * 0.2;
                p.opacity += p.pulse;
                if (p.opacity > 0.6 || p.opacity < 0.1) p.pulse = -p.pulse;
                if (p.y < -10) p.y = this.height + 10;
            });
        }
    }

    const canvasEngine = new WeatherCanvasEngine(elements.canvas);


    /* ==========================================================================
       3. AMBIENT WEATHER SOUND SYNTHESIZER (Web Audio API)
       ========================================================================== */
    class WeatherSoundSynth {
        constructor() {
            this.ctx = null;
            this.osc = null;
            this.gain = null;
            this.isPlaying = false;
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
            }
        }

        toggle(condition) {
            if (this.isPlaying) {
                this.stop();
            } else {
                this.start(condition);
            }
        }

        start(condition) {
            this.init();
            if (this.ctx.state === "suspended") {
                this.ctx.resume();
            }

            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = condition === "Rain" ? "lowpass" : "bandpass";
            filter.frequency.value = condition === "Rain" ? 800 : 400;

            this.gain = this.ctx.createGain();
            this.gain.gain.value = 0.05;

            noise.connect(filter);
            filter.connect(this.gain);
            this.gain.connect(this.ctx.destination);

            noise.start();
            this.noiseSource = noise;
            this.isPlaying = true;
        }

        stop() {
            if (this.noiseSource) {
                this.noiseSource.stop();
                this.isPlaying = false;
            }
        }
    }

    const soundSynth = new WeatherSoundSynth();


    /* ==========================================================================
       4. INITIALIZATION & BINDING
       ========================================================================== */
    initialize();

    function initialize() {
        applyTheme();
        applyUnitButtons();
        bindEvents();
        renderWorldCities();
        updateClock();
        setInterval(updateClock, 1000);

        loadRecentSearches();
        loadFavorites();

        const defaultCity = elements.cityInput?.value?.trim() || "Mumbai";
        loadWeather(defaultCity);

        state.refreshTimer = setInterval(() => {
            if (state.city) {
                loadWeather(state.city, true);
            }
        }, 5 * 60 * 1000);
    }

    function bindEvents() {
        elements.searchForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            const city = elements.cityInput.value.trim();
            if (!city) {
                showError("Please enter a city name.");
                return;
            }
            hideSuggestDropdown();
            loadWeather(city);
        });

        // Search Auto-Suggest
        elements.cityInput?.addEventListener("input", (e) => {
            const query = e.target.value.trim().toLowerCase();
            elements.clearSearchBtn.style.display = query ? "block" : "none";

            if (query.length < 2) {
                hideSuggestDropdown();
                return;
            }

            const matches = POPULAR_SUGGESTIONS.filter(c => c.toLowerCase().includes(query)).slice(0, 5);
            if (matches.length > 0) {
                renderSuggestDropdown(matches);
            } else {
                hideSuggestDropdown();
            }
        });

        elements.clearSearchBtn?.addEventListener("click", () => {
            elements.cityInput.value = "";
            elements.clearSearchBtn.style.display = "none";
            hideSuggestDropdown();
            elements.cityInput.focus();
        });

        elements.locationBtn?.addEventListener("click", getCurrentLocation);
        elements.closeErrorBtn?.addEventListener("click", hideError);
        elements.themeToggleBtn?.addEventListener("click", toggleTheme);

        elements.ambientSoundBtn?.addEventListener("click", () => {
            soundSynth.toggle(state.activeCondition);
            elements.ambientSoundBtn.classList.toggle("active", soundSynth.isPlaying);
        });

        elements.unitC?.addEventListener("click", () => switchUnit("C"));
        elements.unitF?.addEventListener("click", () => switchUnit("F"));

        elements.favToggleBtn?.addEventListener("click", toggleFavorite);

        document.addEventListener("click", (e) => {
            if (!elements.searchForm.contains(e.target)) {
                hideSuggestDropdown();
            }
        });
    }

    function switchUnit(unit) {
        if (state.unit === unit) return;
        state.unit = unit;
        localStorage.setItem("weatherUnit", unit);
        applyUnitButtons();

        if (state.weather) displayCurrentWeather(state.weather);
        if (state.forecast) {
            renderHourlyChart(state.forecast);
            displayHourlyForecast(state.forecast);
            displayDailyForecast(state.forecast);
        }
    }


    /* ==========================================================================
       5. WEATHER DATA LOADING & FETCHING
       ========================================================================== */
    async function loadWeather(city, isRefresh = false) {
        try {
            if (!isRefresh) showLoading();
            else showRefreshSpinner();

            hideError();

            const weatherResponse = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const weatherData = await parseResponse(weatherResponse);

            state.city = weatherData.city || city;
            state.country = weatherData.country || "";
            state.latitude = weatherData.lat ?? weatherData.coord?.lat;
            state.longitude = weatherData.lon ?? weatherData.coord?.lon;
            state.weather = weatherData;
            state.timezone = weatherData.timezone || 0;
            state.activeCondition = weatherData.condition || "Clear";

            // Update Theme & Particle Canvas
            applyDynamicWeatherTheme(state.activeCondition, weatherData.icon);
            canvasEngine.setCondition(state.activeCondition, weatherData.icon.includes("n"));

            displayCurrentWeather(weatherData);

            if (state.latitude !== null && state.longitude !== null) {
                await Promise.all([loadForecast(), loadAirQuality()]);
            }

            await Promise.all([loadRecentSearches(), loadFavorites()]);
            updateLastUpdated();

        } catch (error) {
            console.error("Weather loading error:", error);
            showError(error.message || "Unable to load weather information.");
        } finally {
            hideLoading();
            hideRefreshSpinner();
        }
    }

    async function loadForecast() {
        const response = await fetch(`/api/forecast?city=${encodeURIComponent(state.city)}`);
        const data = await parseResponse(response);
        state.forecast = data;

        renderHourlyChart(data);
        displayHourlyForecast(data);
        displayDailyForecast(data);
    }

    async function loadAirQuality() {
        const response = await fetch(`/api/air-quality?lat=${state.latitude}&lon=${state.longitude}`);
        const data = await parseResponse(response);
        state.airQuality = data;
        displayAirQuality(data);
    }

    async function parseResponse(response) {
        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid response received from server.");
        }
        if (!response.ok) {
            throw new Error(data.error || data.message || "Server request failed.");
        }
        return data;
    }


    /* ==========================================================================
       6. UI DISPLAY & RENDERING FUNCTIONS
       ========================================================================== */
    function displayCurrentWeather(data) {
        const temp = getTemperature(data.temp);
        const feelsLike = getTemperature(data.feels_like);
        const maxTemp = getTemperature(data.temp_max);
        const minTemp = getTemperature(data.temp_min);

        elements.cityName.textContent = state.city;
        elements.countryBadge.textContent = state.country;

        // Animated Number Counters
        animateCounter(elements.currentTemp, temp);
        elements.feelsLikeTemp.textContent = `${feelsLike}°${state.unit}`;
        elements.tempMax.textContent = `${maxTemp}°${state.unit}`;
        elements.tempMin.textContent = `${minTemp}°${state.unit}`;

        elements.weatherCondition.textContent = capitalize(data.condition);
        elements.weatherDescription.textContent = capitalize(data.description);

        elements.weatherIcon.src = getWeatherIcon(data.icon);
        elements.weatherIcon.alt = data.condition;

        elements.humidityValue.textContent = `${data.humidity}%`;
        elements.humidityDesc.textContent = getHumidityDescription(data.humidity);

        elements.windValue.textContent = convertWindSpeed(data.wind_speed);
        elements.windUnit.textContent = state.unit === "C" ? "m/s" : "mph";
        elements.windDirDesc.textContent = `${getWindDirection(data.wind_deg)} wind`;
        elements.beaufortLabel.textContent = data.beaufort?.label || "Breeze";

        elements.pressureValue.textContent = `${data.pressure} hPa`;
        elements.visibilityValue.textContent = data.visibility > 0 ? `${data.visibility}` : "--";
        elements.visibilityDesc.textContent = data.visibility > 0 ? "Good visibility" : "Low visibility";
        elements.cloudsValue.textContent = `${data.clouds}%`;
        elements.dewPointValue.textContent = `${getTemperature(data.dew_point)}°${state.unit}`;

        elements.sunriseTime.textContent = formatTime(data.sunrise);
        elements.sunsetTime.textContent = formatTime(data.sunset);

        // Update Wind Compass Needle
        if (elements.compassNeedle) {
            elements.compassNeedle.style.transform = `rotate(${data.wind_deg}deg)`;
            elements.windDegreesVal.textContent = `${data.wind_deg}° ${getWindDirection(data.wind_deg)}`;
        }

        // Display UV Index & Sun Arc
        if (data.uv) {
            displayUVIndex(data.uv);
        }

        // Render Outdoor Activities Advice
        renderActivities(data);
    }

    /* SVG 24-Hour Temperature Curve Chart */
    function renderHourlyChart(data) {
        if (!elements.hourlyChartSvg) return;
        const items = (data.hourly || data.list || []).slice(0, 8);
        if (!items.length) return;

        const temps = items.map(i => getTemperature(i.temp ?? i.main?.temp));
        const min = Math.min(...temps) - 2;
        const max = Math.max(...temps) + 2;
        const range = max - min || 1;

        const width = elements.hourlyChartSvg.clientWidth || 600;
        const height = 180;
        const padding = 30;

        const points = temps.map((t, idx) => {
            const x = padding + (idx / (items.length - 1)) * (width - padding * 2);
            const y = height - padding - ((t - min) / range) * (height - padding * 2);
            return { x, y, temp: t, item: items[idx] };
        });

        // Build SVG Bezier Path
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            const cx = (curr.x + next.x) / 2;
            pathD += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
        }

        const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

        let svgHtml = `
            <defs>
                <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#38bdf8" />
                    <stop offset="100%" stop-color="#818cf8" />
                </linearGradient>
                <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
                </linearGradient>
            </defs>
            <path class="chart-area" d="${areaD}" />
            <path class="chart-line" d="${pathD}" />
        `;

        points.forEach((p) => {
            const timeStr = formatForecastTime(p.item.dt);
            svgHtml += `
                <g class="chart-node">
                    <circle class="chart-dot" cx="${p.x}" cy="${p.y}" />
                    <text x="${p.x}" y="${p.y - 12}" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">${p.temp}°</text>
                    <text x="${p.x}" y="${height - 8}" fill="#94a3b8" font-size="11" text-anchor="middle">${timeStr}</text>
                </g>
            `;
        });

        elements.hourlyChartSvg.innerHTML = svgHtml;
    }

    function displayHourlyForecast(data) {
        if (!elements.hourlyForecastContainer) return;
        const items = (data.hourly || data.list || []).slice(0, 8);

        elements.hourlyForecastContainer.innerHTML = items.map((item, idx) => {
            const temp = getTemperature(item.temp ?? item.main?.temp);
            const icon = item.icon || item.weather?.[0]?.icon || "01d";
            const condition = item.condition || item.weather?.[0]?.main || "";
            const pop = item.pop ?? 0;
            const time = idx === 0 ? "Now" : formatForecastTime(item.dt);

            return `
                <div class="hourly-card">
                    <p class="forecast-time">${time}</p>
                    <img src="${getWeatherIcon(icon)}" alt="${escapeHTML(condition)}" class="forecast-icon">
                    <p class="forecast-temp">${temp}°</p>
                    ${pop > 0 ? `<p class="forecast-pop"><i class="fa-solid fa-droplet"></i> ${pop}%</p>` : ''}
                </div>
            `;
        }).join("");
    }

    function displayDailyForecast(data) {
        if (!elements.dailyForecastContainer) return;
        const items = (data.daily || []).slice(0, 5);

        elements.dailyForecastContainer.innerHTML = items.map((item) => {
            const maxTemp = getTemperature(item.temp_max);
            const minTemp = getTemperature(item.temp_min);
            const icon = item.icon || "01d";
            const condition = item.condition || "Clear";
            const dayName = formatDay(item.dt);

            return `
                <div class="daily-card">
                    <p class="daily-date">${dayName}</p>
                    <img src="${getWeatherIcon(icon)}" alt="${escapeHTML(condition)}" class="daily-icon">
                    <p class="daily-condition">${escapeHTML(condition)}</p>
                    <div class="daily-temperatures">
                        <strong>${maxTemp}°</strong>
                        <span>${minTemp}°</span>
                    </div>
                </div>
            `;
        }).join("");
    }

    function displayAirQuality(data) {
        if (!data || !elements.aqiValue) return;
        const aqi = data.aqi || 1;
        const comp = data.components || {};

        elements.aqiValue.textContent = aqi;
        elements.aqiLevelBadge.textContent = data.level || "Good";
        elements.aqiLevelBadge.style.backgroundColor = data.color || "#10b981";
        elements.aqiProgressBar.style.width = `${(aqi / 5) * 100}%`;

        elements.pm25Val.textContent = comp.pm2_5 ?? "--";
        elements.pm10Val.textContent = comp.pm10 ?? "--";
        elements.coVal.textContent = comp.co ?? "--";
        elements.no2Val.textContent = comp.no2 ?? "--";
        elements.so2Val.textContent = comp.so2 ?? "--";
        elements.o3Val.textContent = comp.o3 ?? "--";
    }

    function displayUVIndex(uv) {
        if (!elements.uvIndexVal) return;
        elements.uvIndexVal.textContent = uv.index;
        elements.uvBadge.textContent = uv.level;
        elements.uvBadge.style.backgroundColor = uv.color;
        elements.uvProgressBar.style.width = `${Math.min((uv.index / 11) * 100, 100)}%`;
        elements.uvAdviceText.textContent = uv.advice;
    }

    function renderActivities(data) {
        if (!elements.activitiesContainer) return;
        const temp = data.temp;
        const isRain = data.condition.includes("Rain") || data.condition.includes("Drizzle");

        const runningScore = isRain ? "Poor (Rain)" : temp > 32 ? "Fair (Heat)" : "Excellent";
        const diningScore = isRain ? "Indoor Only" : temp >= 18 && temp <= 28 ? "Ideal Outdoor" : "Fair";
        const clothing = temp < 10 ? "Heavy Jacket & Layers" : temp < 20 ? "Light Sweater / Jacket" : "Light T-Shirt";

        elements.activitiesContainer.innerHTML = `
            <div class="activity-item">
                <i class="fa-solid fa-person-running activity-icon"></i>
                <div class="activity-text">
                    <strong>Jogging & Outdoor Sports</strong>
                    <span>${runningScore}</span>
                </div>
            </div>
            <div class="activity-item">
                <i class="fa-solid fa-utensils activity-icon"></i>
                <div class="activity-text">
                    <strong>Outdoor Dining</strong>
                    <span>${diningScore}</span>
                </div>
            </div>
            <div class="activity-item">
                <i class="fa-solid fa-shirt activity-icon"></i>
                <div class="activity-text">
                    <strong>Clothing Outfit</strong>
                    <span>${clothing}</span>
                </div>
            </div>
        `;
    }

    function renderWorldCities() {
        if (!elements.worldCitiesContainer) return;
        elements.worldCitiesContainer.innerHTML = WORLD_CITIES.map(c => `
            <span class="chip" data-city="${c.name}">
                ${c.flag} ${c.name}
            </span>
        `).join("");

        elements.worldCitiesContainer.querySelectorAll(".chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const city = chip.dataset.city;
                elements.cityInput.value = city;
                loadWeather(city);
            });
        });
    }

    function renderSuggestDropdown(items) {
        if (!elements.suggestDropdown) return;
        elements.suggestDropdown.innerHTML = items.map(item => `
            <div class="suggest-item" data-city="${item}">${item}</div>
        `).join("");
        elements.suggestDropdown.classList.add("active");

        elements.suggestDropdown.querySelectorAll(".suggest-item").forEach(item => {
            item.addEventListener("click", () => {
                const city = item.dataset.city;
                elements.cityInput.value = city;
                hideSuggestDropdown();
                loadWeather(city);
            });
        });
    }

    function hideSuggestDropdown() {
        elements.suggestDropdown?.classList.remove("active");
    }


    /* ==========================================================================
       7. RECENT & FAVORITES MANAGEMENT
       ========================================================================== */
    async function loadRecentSearches() {
        try {
            const response = await fetch("/api/recent-searches");
            const data = await parseResponse(response);
            renderRecentSearches(data.searches || []);
        } catch (err) {
            console.warn("Recent searches unavailable:", err);
        }
    }

    function renderRecentSearches(searches) {
        if (!elements.recentSearchesContainer) return;
        if (!searches.length) {
            elements.recentSearchesContainer.innerHTML = `<span class="chip-placeholder">No recent searches</span>`;
            return;
        }

        elements.recentSearchesContainer.innerHTML = searches.map(item => `
            <button class="chip" data-city="${escapeHTML(item.city)}">
                <i class="fa-solid fa-clock-rotate-left"></i> ${escapeHTML(item.city)}
            </button>
        `).join("");

        elements.recentSearchesContainer.querySelectorAll("[data-city]").forEach(btn => {
            btn.addEventListener("click", () => {
                const city = btn.dataset.city;
                elements.cityInput.value = city;
                loadWeather(city);
            });
        });
    }

    async function loadFavorites() {
        try {
            const response = await fetch("/api/favorites");
            const data = await parseResponse(response);
            renderFavorites(data.favorites || []);
        } catch (err) {
            console.warn("Favorites unavailable:", err);
        }
    }

    function renderFavorites(favorites) {
        if (!elements.favoritesContainer) return;
        if (!favorites.length) {
            elements.favoritesContainer.innerHTML = `<span class="chip-placeholder">No favorites saved yet</span>`;
            return;
        }

        elements.favoritesContainer.innerHTML = favorites.map(fav => `
            <div class="chip">
                <span class="fav-city-click" data-city="${escapeHTML(fav.city)}">⭐ ${escapeHTML(fav.city)}</span>
                <i class="fa-solid fa-xmark remove-fav-btn" data-id="${fav.id}" style="cursor:pointer; margin-left:4px;"></i>
            </div>
        `).join("");

        elements.favoritesContainer.querySelectorAll(".fav-city-click").forEach(el => {
            el.addEventListener("click", () => {
                elements.cityInput.value = el.dataset.city;
                loadWeather(el.dataset.city);
            });
        });

        elements.favoritesContainer.querySelectorAll(".remove-fav-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                removeFavorite(btn.dataset.id);
            });
        });
    }

    async function toggleFavorite() {
        if (!state.city) return;
        try {
            if (state.favoriteId) {
                await fetch(`/api/favorites/${state.favoriteId}`, { method: "DELETE" });
                state.favoriteId = null;
                elements.favToggleBtn.classList.remove("active");
            } else {
                const response = await fetch("/api/favorites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ city: state.city, country: state.country })
                });
                const data = await parseResponse(response);
                state.favoriteId = data.id;
                elements.favToggleBtn.classList.add("active");
            }
            await loadFavorites();
        } catch (err) {
            showError(err.message || "Unable to update favorite.");
        }
    }

    async function removeFavorite(id) {
        try {
            await fetch(`/api/favorites/${id}`, { method: "DELETE" });
            await loadFavorites();
        } catch (err) {
            showError("Unable to remove favorite city.");
        }
    }

    async function getCurrentLocation() {
        if (!navigator.geolocation) {
            showError("Geolocation is not supported by your browser.");
            return;
        }
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const response = await fetch(`/api/weather/coordinates?lat=${latitude}&lon=${longitude}`);
                    const data = await parseResponse(response);

                    state.city = data.city || "Current Location";
                    state.country = data.country || "";
                    state.latitude = latitude;
                    state.longitude = longitude;

                    elements.cityInput.value = state.city;
                    displayCurrentWeather(data);
                    await Promise.all([loadForecast(), loadAirQuality(), loadRecentSearches(), loadFavorites()]);
                    updateLastUpdated();
                } catch (err) {
                    showError(err.message);
                } finally {
                    hideLoading();
                }
            },
            () => {
                hideLoading();
                showError("Location permission denied. Please search for a city manually.");
            }
        );
    }


    /* ==========================================================================
       8. UTILITY HELPER FUNCTIONS
       ========================================================================== */
    function animateCounter(element, targetVal) {
        if (!element) return;
        const startVal = parseInt(element.textContent) || 0;
        const duration = 600;
        const startTime = performance.now();

        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.round(startVal + (targetVal - startVal) * progress);
            element.textContent = current;
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    function applyDynamicWeatherTheme(condition, icon) {
        const isNight = icon?.includes("n");
        let themeName = "clear-day";

        if (condition === "Rain" || condition === "Drizzle") themeName = "rain";
        else if (condition === "Thunderstorm") themeName = "thunder";
        else if (condition === "Snow") themeName = "snow";
        else if (condition === "Clouds") themeName = "clouds";
        else if (isNight) themeName = "clear-night";

        document.documentElement.setAttribute("data-weather-theme", themeName);
    }

    function getTemperature(value) {
        const num = Number(value);
        if (Number.isNaN(num)) return "--";
        if (state.unit === "F") return Math.round((num * 9) / 5 + 32);
        return Math.round(num);
    }

    function convertWindSpeed(value) {
        const speed = Number(value);
        if (Number.isNaN(speed)) return "--";
        if (state.unit === "F") return (speed * 2.23694).toFixed(1);
        return speed.toFixed(1);
    }

    function getWeatherIcon(iconCode) {
        if (String(iconCode).startsWith("http")) return iconCode;
        return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    }

    function getWindDirection(degrees) {
        const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        return dirs[Math.round(degrees / 45) % 8];
    }

    function getHumidityDescription(h) {
        if (h < 30) return "Low humidity";
        if (h < 60) return "Comfortable";
        if (h < 80) return "High humidity";
        return "Very humid";
    }

    function formatTime(timestamp) {
        if (!timestamp) return "--";
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function formatForecastTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function formatDay(timestamp) {
        return new Date(timestamp * 1000).toLocaleDateString([], { weekday: "short" });
    }

    function updateClock() {
        const now = new Date();
        if (elements.liveDate) {
            elements.liveDate.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        }
        if (elements.liveClock) {
            elements.liveClock.innerHTML = `<i class="fa-regular fa-clock"></i> ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
        }
    }

    function updateLastUpdated() {
        if (elements.lastUpdatedText) {
            elements.lastUpdatedText.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Updated ${new Date().toLocaleTimeString()}`;
        }
    }

    function applyUnitButtons() {
        elements.unitC?.classList.toggle("active", state.unit === "C");
        elements.unitF?.classList.toggle("active", state.unit === "F");
    }

    function applyTheme() {
        const theme = localStorage.getItem("weatherTheme") || "dark";
        document.documentElement.setAttribute("data-theme", theme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("weatherTheme", next);
    }

    function showLoading() {
        elements.skeletonLoader?.style.setProperty("display", "block");
    }

    function hideLoading() {
        elements.skeletonLoader?.style.setProperty("display", "none");
    }

    function showRefreshSpinner() {
        elements.refreshSpinner?.style.setProperty("display", "inline-block");
    }

    function hideRefreshSpinner() {
        elements.refreshSpinner?.style.setProperty("display", "none");
    }

    function showError(msg) {
        if (!elements.errorBanner) return;
        elements.errorMessage.textContent = msg;
        elements.errorBanner.style.display = "flex";
    }

    function hideError() {
        elements.errorBanner?.style.setProperty("display", "none");
    }

    function capitalize(str) {
        if (!str) return "";
        return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    }

    function escapeHTML(str) {
        return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }
});
