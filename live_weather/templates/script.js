"use strict";

document.addEventListener("DOMContentLoaded", () => {
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
        refreshTimer: null
    };

    const $ = (id) => document.getElementById(id);

    const elements = {
        searchForm: $("search-form"),
        cityInput: $("city-input"),
        clearSearchBtn: $("clear-search-btn"),
        locationBtn: $("location-btn"),
        unitC: $("unit-c"),
        unitF: $("unit-f"),
        themeToggleBtn: $("theme-toggle-btn"),

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
        pressureValue: $("pressure-value"),
        visibilityValue: $("visibility-value"),
        visibilityDesc: $("visibility-desc"),
        cloudsValue: $("clouds-value"),

        sunriseTime: $("sunrise-time"),
        sunsetTime: $("sunset-time"),

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

        recentSearchesContainer: $("recent-searches-container"),
        favoritesContainer: $("favorites-container"),

        lastUpdatedText: $("last-updated-text"),
        refreshSpinner: $("refresh-spinner"),
        skeletonLoader: $("skeleton-loader"),
        weatherDashboard: $("weather-dashboard")
    };

    initialize();

    function initialize() {
        applyTheme();
        applyUnitButtons();
        bindEvents();
        updateClock();
        setInterval(updateClock, 1000);

        loadRecentSearches();
        loadFavorites();

        const defaultCity = elements.cityInput?.value?.trim() || "Pune";
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

            loadWeather(city);
        });

        elements.clearSearchBtn?.addEventListener("click", () => {
            elements.cityInput.value = "";
            elements.cityInput.focus();
        });

        elements.locationBtn?.addEventListener("click", getCurrentLocation);

        elements.closeErrorBtn?.addEventListener("click", hideError);

        elements.themeToggleBtn?.addEventListener("click", toggleTheme);

        elements.unitC?.addEventListener("click", () => {
            state.unit = "C";
            localStorage.setItem("weatherUnit", "C");
            applyUnitButtons();

            if (state.weather) {
                displayCurrentWeather(state.weather);
            }

            if (state.forecast) {
                displayHourlyForecast(state.forecast);
                displayDailyForecast(state.forecast);
            }
        });

        elements.unitF?.addEventListener("click", () => {
            state.unit = "F";
            localStorage.setItem("weatherUnit", "F");
            applyUnitButtons();

            if (state.weather) {
                displayCurrentWeather(state.weather);
            }

            if (state.forecast) {
                displayHourlyForecast(state.forecast);
                displayDailyForecast(state.forecast);
            }
        });

        elements.favToggleBtn?.addEventListener("click", toggleFavorite);
    }

    async function loadWeather(city, isRefresh = false) {
        try {
            if (!isRefresh) {
                showLoading();
            } else {
                showRefreshSpinner();
            }

            hideError();

            const weatherResponse = await fetch(
                `/api/weather?city=${encodeURIComponent(city)}`
            );

            const weatherData = await parseResponse(weatherResponse);

            state.city = weatherData.city || city;
            state.country = weatherData.country || "";
            state.latitude = weatherData.latitude ?? weatherData.lat;
            state.longitude = weatherData.longitude ?? weatherData.lon;
            state.weather = weatherData;
            state.timezone = weatherData.timezone || 0;

            displayCurrentWeather(weatherData);

            if (state.latitude !== null && state.longitude !== null) {
                await Promise.all([
                    loadForecast(),
                    loadAirQuality()
                ]);
            }

            await Promise.all([
                loadRecentSearches(),
                loadFavorites()
            ]);

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
        const response = await fetch(
            `/api/forecast?city=${encodeURIComponent(state.city)}`
        );

        const data = await parseResponse(response);

        state.forecast = data;

        displayHourlyForecast(data);
        displayDailyForecast(data);
    }

    async function loadAirQuality() {
        const response = await fetch(
            `/api/air-quality?lat=${state.latitude}&lon=${state.longitude}`
        );

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
            throw new Error(
                data.error || data.message || "Server request failed."
            );
        }

        return data;
    }

    function displayCurrentWeather(data) {
        const temperature = getTemperature(data.temp);
        const feelsLike = getTemperature(
            data.feels_like ?? data.feelsLike ?? data.main?.feels_like
        );

        const maxTemp = getTemperature(
            data.temp_max ?? data.tempMax ?? data.main?.temp_max
        );

        const minTemp = getTemperature(
            data.temp_min ?? data.tempMin ?? data.main?.temp_min
        );

        const humidity = data.humidity ?? data.main?.humidity ?? 0;
        const windSpeed = data.wind_speed ?? data.wind?.speed ?? 0;
        const pressure = data.pressure ?? data.main?.pressure ?? 0;
        const visibility = data.visibility ?? 0;
        const clouds = data.clouds ?? data.clouds?.all ?? 0;

        const condition =
            data.condition ||
            data.weather?.[0]?.main ||
            data.weather?.[0]?.description ||
            "Unknown";

        const description =
            data.description ||
            data.weather?.[0]?.description ||
            "Weather information";

        const icon =
            data.icon ||
            data.weather?.[0]?.icon ||
            "01d";

        const windDirection = data.wind_deg ?? data.wind?.deg ?? 0;

        elements.cityName.textContent = state.city;
        elements.countryBadge.textContent = state.country;

        elements.currentTemp.textContent = `${temperature}°`;
        elements.feelsLikeTemp.textContent = `${feelsLike}°`;
        elements.tempMax.textContent = `${maxTemp}°`;
        elements.tempMin.textContent = `${minTemp}°`;

        elements.weatherCondition.textContent = capitalize(condition);
        elements.weatherDescription.textContent = capitalize(description);

        elements.weatherIcon.src = getWeatherIcon(icon);
        elements.weatherIcon.alt = condition;

        elements.humidityValue.textContent = `${humidity}%`;
        elements.humidityDesc.textContent = getHumidityDescription(humidity);

        elements.windValue.textContent = convertWindSpeed(windSpeed);
        elements.windUnit.textContent =
            state.unit === "C" ? "m/s" : "mph";

        elements.windDirDesc.textContent =
            `${getWindDirection(windDirection)} wind`;

        elements.pressureValue.textContent = `${pressure} hPa`;

        elements.visibilityValue.textContent =
            visibility > 0 ? `${(visibility / 1000).toFixed(1)}` : "--";

        elements.visibilityDesc.textContent =
            visibility > 0 ? "kilometers" : "Not available";

        elements.cloudsValue.textContent = `${clouds}%`;

        elements.sunriseTime.textContent = formatTime(
            data.sunrise ?? data.sys?.sunrise
        );

        elements.sunsetTime.textContent = formatTime(
            data.sunset ?? data.sys?.sunset
        );

        updateClock();
    }

    function displayHourlyForecast(data) {
        if (!elements.hourlyForecastContainer) return;

        const items = data.list || data.hourly || [];

        if (!items.length) {
            elements.hourlyForecastContainer.innerHTML =
                `<p class="empty-message">Hourly forecast unavailable.</p>`;
            return;
        }

        const hourlyItems = items.slice(0, 8);

        elements.hourlyForecastContainer.innerHTML =
            hourlyItems.map((item, index) => {
                const temp = getTemperature(
                    item.temp ?? item.main?.temp
                );

                const icon =
                    item.icon ||
                    item.weather?.[0]?.icon ||
                    "01d";

                const condition =
                    item.condition ||
                    item.weather?.[0]?.main ||
                    "Weather";

                const timestamp =
                    item.dt ?? item.timestamp ?? Date.now() / 1000;

                const time =
                    index === 0
                        ? "Now"
                        : formatForecastTime(timestamp);

                return `
                    <div class="hourly-card">
                        <p class="forecast-time">${time}</p>
                        <img
                            src="${getWeatherIcon(icon)}"
                            alt="${escapeHTML(condition)}"
                            class="forecast-icon"
                        >
                        <p class="forecast-temp">${temp}°</p>
                        <p class="forecast-condition">
                            ${escapeHTML(condition)}
                        </p>
                    </div>
                `;
            }).join("");
    }

    function displayDailyForecast(data) {
        if (!elements.dailyForecastContainer) return;

        const dailyItems = data.daily || buildDailyForecast(data.list || []);

        if (!dailyItems.length) {
            elements.dailyForecastContainer.innerHTML =
                `<p class="empty-message">Daily forecast unavailable.</p>`;
            return;
        }

        elements.dailyForecastContainer.innerHTML =
            dailyItems.slice(0, 7).map((item) => {
                const date =
                    item.dt ?? item.timestamp ?? Date.now() / 1000;

                const icon =
                    item.icon ||
                    item.weather?.[0]?.icon ||
                    "01d";

                const condition =
                    item.condition ||
                    item.weather?.[0]?.main ||
                    "Weather";

                const maxTemp = getTemperature(
                    item.temp_max ??
                    item.temp?.max ??
                    item.max
                );

                const minTemp = getTemperature(
                    item.temp_min ??
                    item.temp?.min ??
                    item.min
                );

                return `
                    <div class="daily-card">
                        <p class="daily-date">
                            ${formatDay(date)}
                        </p>

                        <img
                            src="${getWeatherIcon(icon)}"
                            alt="${escapeHTML(condition)}"
                            class="daily-icon"
                        >

                        <p class="daily-condition">
                            ${escapeHTML(condition)}
                        </p>

                        <div class="daily-temperatures">
                            <strong>${maxTemp}°</strong>
                            <span>${minTemp}°</span>
                        </div>
                    </div>
                `;
            }).join("");
    }

    function buildDailyForecast(items) {
        const grouped = {};

        items.forEach((item) => {
            const timestamp = item.dt || item.timestamp;
            const date = new Date(timestamp * 1000)
                .toISOString()
                .split("T")[0];

            if (!grouped[date]) {
                grouped[date] = [];
            }

            grouped[date].push(item);
        });

        return Object.entries(grouped).map(([date, values]) => {
            const temperatures = values.map(
                (item) => item.main?.temp ?? item.temp
            );

            const first = values[0];

            return {
                dt: new Date(date).getTime() / 1000,
                icon: first.weather?.[0]?.icon || "01d",
                condition: first.weather?.[0]?.main || "Weather",
                max: Math.max(...temperatures),
                min: Math.min(...temperatures)
            };
        });
    }

    function displayAirQuality(data) {
        const aqi = data.aqi ?? data.list?.[0]?.main?.aqi ?? 0;
        const components =
            data.components ||
            data.list?.[0]?.components ||
            {};

        const aqiInfo = getAQIInfo(aqi);

        elements.aqiValue.textContent = aqi || "--";
        elements.aqiLevelBadge.textContent = aqiInfo.label;
        elements.aqiLevelBadge.className =
            `aqi-level-badge ${aqiInfo.className}`;

        elements.aqiProgressBar.style.width =
            `${Math.min((aqi / 5) * 100, 100)}%`;

        elements.pm25Val.textContent =
            formatNumber(components.pm2_5);

        elements.pm10Val.textContent =
            formatNumber(components.pm10);

        elements.coVal.textContent =
            formatNumber(components.co);

        elements.no2Val.textContent =
            formatNumber(components.no2);

        elements.so2Val.textContent =
            formatNumber(components.so2);

        elements.o3Val.textContent =
            formatNumber(components.o3);
    }

    async function getCurrentLocation() {
        if (!navigator.geolocation) {
            showError("Geolocation is not supported by your browser.");
            return;
        }

        showLoading();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    const response = await fetch(
                        `/api/weather/coordinates?lat=${latitude}&lon=${longitude}`
                    );

                    const data = await parseResponse(response);

                    state.city = data.city || "Current Location";
                    state.country = data.country || "";
                    state.latitude = latitude;
                    state.longitude = longitude;
                    state.weather = data;

                    elements.cityInput.value = state.city;

                    displayCurrentWeather(data);

                    await Promise.all([
                        loadForecast(),
                        loadAirQuality(),
                        loadRecentSearches(),
                        loadFavorites()
                    ]);

                    updateLastUpdated();
                } catch (error) {
                    showError(error.message);
                } finally {
                    hideLoading();
                }
            },
            () => {
                hideLoading();
                showError(
                    "Location permission denied. Please search for a city manually."
                );
            }
        );
    }

    async function loadRecentSearches() {
        try {
            const response = await fetch("/api/recent-searches");
            const data = await parseResponse(response);

            renderRecentSearches(data.recent_searches || data || []);
        } catch (error) {
            console.warn("Recent searches unavailable:", error);
        }
    }

    function renderRecentSearches(searches) {
        if (!elements.recentSearchesContainer) return;

        if (!searches.length) {
            elements.recentSearchesContainer.innerHTML =
                `<p class="empty-message">No recent searches.</p>`;
            return;
        }

        elements.recentSearchesContainer.innerHTML =
            searches.map((item) => {
                const city =
                    typeof item === "string"
                        ? item
                        : item.city || item.name;

                return `
                    <button
                        class="recent-search-item"
                        data-city="${escapeHTML(city)}"
                    >
                        ${escapeHTML(city)}
                    </button>
                `;
            }).join("");

        elements.recentSearchesContainer
            .querySelectorAll("[data-city]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const city = button.dataset.city;
                    elements.cityInput.value = city;
                    loadWeather(city);
                });
            });
    }

    async function loadFavorites() {
        try {
            const response = await fetch("/api/favorites");
            const data = await parseResponse(response);

            renderFavorites(data.favorites || data || []);
        } catch (error) {
            console.warn("Favorites unavailable:", error);
        }
    }

    function renderFavorites(favorites) {
        if (!elements.favoritesContainer) return;

        if (!favorites.length) {
            elements.favoritesContainer.innerHTML =
                `<p class="empty-message">No favorite cities.</p>`;
            return;
        }

        elements.favoritesContainer.innerHTML =
            favorites.map((favorite) => {
                const city = favorite.city || favorite.name;
                const id = favorite.id;

                return `
                    <div class="favorite-item">
                        <button
                            class="favorite-city"
                            data-city="${escapeHTML(city)}"
                        >
                            ${escapeHTML(city)}
                        </button>

                        <button
                            class="remove-favorite"
                            data-id="${id}"
                            aria-label="Remove favorite"
                        >
                            ×
                        </button>
                    </div>
                `;
            }).join("");

        elements.favoritesContainer
            .querySelectorAll(".favorite-city")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const city = button.dataset.city;
                    elements.cityInput.value = city;
                    loadWeather(city);
                });
            });

        elements.favoritesContainer
            .querySelectorAll(".remove-favorite")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    removeFavorite(button.dataset.id);
                });
            });
    }

    async function toggleFavorite() {
        if (!state.city) return;

        try {
            if (state.favoriteId) {
                await fetch(`/api/favorites/${state.favoriteId}`, {
                    method: "DELETE"
                });

                state.favoriteId = null;
                elements.favToggleBtn.classList.remove("active");
            } else {
                const response = await fetch("/api/favorites", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        city: state.city,
                        country: state.country
                    })
                });

                const data = await parseResponse(response);

                state.favoriteId = data.id || data.favorite_id;
                elements.favToggleBtn.classList.add("active");
            }

            await loadFavorites();
        } catch (error) {
            showError(error.message || "Unable to update favorite.");
        }
    }

    async function removeFavorite(id) {
        try {
            await fetch(`/api/favorites/${id}`, {
                method: "DELETE"
            });

            if (String(state.favoriteId) === String(id)) {
                state.favoriteId = null;
                elements.favToggleBtn.classList.remove("active");
            }

            await loadFavorites();
        } catch (error) {
            showError("Unable to remove favorite city.");
        }
    }

    function getTemperature(value) {
        const temperature = Number(value);

        if (Number.isNaN(temperature)) {
            return "--";
        }

        if (state.unit === "F") {
            return Math.round((temperature * 9) / 5 + 32);
        }

        return Math.round(temperature);
    }

    function convertWindSpeed(value) {
        const speed = Number(value);

        if (Number.isNaN(speed)) {
            return "--";
        }

        if (state.unit === "F") {
            return (speed * 2.23694).toFixed(1);
        }

        return speed.toFixed(1);
    }

    function getWeatherIcon(iconCode) {
        if (String(iconCode).startsWith("http")) {
            return iconCode;
        }

        return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    }

    function getWindDirection(degrees) {
        const directions = [
            "N",
            "NE",
            "E",
            "SE",
            "S",
            "SW",
            "W",
            "NW"
        ];

        const index = Math.round(degrees / 45) % 8;

        return directions[index];
    }

    function getHumidityDescription(humidity) {
        if (humidity < 30) return "Low humidity";
        if (humidity < 60) return "Comfortable";
        if (humidity < 80) return "High humidity";
        return "Very humid";
    }

    function getAQIInfo(aqi) {
        const levels = {
            1: {
                label: "Good",
                className: "good"
            },
            2: {
                label: "Fair",
                className: "fair"
            },
            3: {
                label: "Moderate",
                className: "moderate"
            },
            4: {
                label: "Poor",
                className: "poor"
            },
            5: {
                label: "Very Poor",
                className: "very-poor"
            }
        };

        return levels[aqi] || {
            label: "Unavailable",
            className: "unknown"
        };
    }

    function formatTime(timestamp) {
        if (!timestamp) return "--";

        const date = new Date(timestamp * 1000);

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatForecastTime(timestamp) {
        const date = new Date(timestamp * 1000);

        return date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function formatDay(timestamp) {
        const date = new Date(timestamp * 1000);

        return date.toLocaleDateString([], {
            weekday: "short"
        });
    }

    function updateClock() {
        const now = new Date();

        if (elements.liveDate) {
            elements.liveDate.textContent = now.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            });
        }

        if (elements.liveClock) {
            elements.liveClock.textContent = now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
        }
    }

    function updateLastUpdated() {
        if (elements.lastUpdatedText) {
            elements.lastUpdatedText.textContent =
                `Updated ${new Date().toLocaleTimeString()}`;
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
        const currentTheme =
            document.documentElement.getAttribute("data-theme") || "dark";

        const newTheme = currentTheme === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("weatherTheme", newTheme);
    }

    function showLoading() {
        elements.skeletonLoader?.classList.remove("hidden");
        elements.weatherDashboard?.classList.add("loading");
    }

    function hideLoading() {
        elements.skeletonLoader?.classList.add("hidden");
        elements.weatherDashboard?.classList.remove("loading");
    }

    function showRefreshSpinner() {
        elements.refreshSpinner?.classList.add("active");
    }

    function hideRefreshSpinner() {
        elements.refreshSpinner?.classList.remove("active");
    }

    function showError(message) {
        if (!elements.errorBanner) return;

        elements.errorMessage.textContent = message;
        elements.errorBanner.classList.add("show");
    }

    function hideError() {
        elements.errorBanner?.classList.remove("show");
    }

    function capitalize(value) {
        if (!value) return "";

        return String(value)
            .charAt(0)
            .toUpperCase() + String(value).slice(1);
    }

    function formatNumber(value) {
        if (value === undefined || value === null) {
            return "--";
        }

        return Number(value).toFixed(1);
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});