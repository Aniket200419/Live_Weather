import os
import requests
from datetime import datetime, timezone as dt_timezone
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

from database.database import (
    init_db, add_search_history, get_recent_searches,
    add_favorite, get_favorites, delete_favorite
)

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Initialize SQLite Database tables
with app.app_context():
    init_db()

# OpenWeatherMap API Base URLs
OWM_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
OWM_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
OWM_AIR_POLLUTION_URL = "https://api.openweathermap.org/data/2.5/air_pollution"

def get_api_key():
    """Retrieve OpenWeatherMap API Key from environment."""
    key = os.getenv("WEATHER_API_KEY", "").strip()
    if not key or key == "YOUR_OPENWEATHER_API_KEY":
        return None
    return key

# Helper for standardized error responses
def make_error_response(message, status_code=400):
    return jsonify({"success": False, "error": message}), status_code


def calculate_beaufort(speed_ms):
    if speed_ms < 0.5: return {"scale": 0, "label": "Calm"}
    elif speed_ms < 3.3: return {"scale": 1, "label": "Light Breeze"}
    elif speed_ms < 5.5: return {"scale": 2, "label": "Gentle Breeze"}
    elif speed_ms < 8.0: return {"scale": 3, "label": "Moderate Breeze"}
    elif speed_ms < 10.8: return {"scale": 4, "label": "Fresh Breeze"}
    elif speed_ms < 13.9: return {"scale": 5, "label": "Strong Breeze"}
    elif speed_ms < 17.2: return {"scale": 6, "label": "High Wind"}
    elif speed_ms < 20.7: return {"scale": 7, "label": "Gale"}
    elif speed_ms < 24.5: return {"scale": 8, "label": "Strong Gale"}
    elif speed_ms < 28.5: return {"scale": 9, "label": "Storm"}
    else: return {"scale": 10, "label": "Violent Storm"}

def calculate_uv_index(dt, sunrise, sunset, clouds):
    if not (sunrise <= dt <= sunset):
        return {"index": 0, "level": "Low", "color": "#10b981", "advice": "No solar UV protection required at night."}
    midday = (sunrise + sunset) / 2
    half_day = max((sunset - sunrise) / 2, 1)
    time_diff = abs(dt - midday)
    max_uv = max(0, 9.5 * (1 - (time_diff / half_day) ** 2))
    cloud_factor = 1 - (clouds / 100) * 0.4
    estimated_uv = round(max(0.5, max_uv * cloud_factor), 1)
    if estimated_uv < 3:
        return {"index": estimated_uv, "level": "Low", "color": "#10b981", "advice": "Low UV risk. Wear sunglasses on bright days."}
    elif estimated_uv < 6:
        return {"index": estimated_uv, "level": "Moderate", "color": "#f59e0b", "advice": "Moderate UV. Use SPF 30+ sunscreen and stay in shade."}
    elif estimated_uv < 8:
        return {"index": estimated_uv, "level": "High", "color": "#f97316", "advice": "High UV hazard! Wear hat, SPF 30+ sunscreen & sunglasses."}
    elif estimated_uv < 11:
        return {"index": estimated_uv, "level": "Very High", "color": "#ef4444", "advice": "Very High UV! Minimize sun exposure between 10 AM - 4 PM."}
    else:
        return {"index": estimated_uv, "level": "Extreme", "color": "#a855f7", "advice": "Extreme UV risk! Take all outdoor precautions."}

@app.route('/')
def index():
    """Render main web application dashboard."""
    return render_template('index.html')

@app.route('/api/weather/coordinates', methods=['GET'])
@app.route('/api/weather', methods=['GET'])
def get_weather():
    """Fetch current live weather from OpenWeatherMap API by city name or coordinates."""
    api_key = get_api_key()
    if not api_key:
        return make_error_response("Please configure your OpenWeatherMap API key in the .env file.", 400)
    
    city = request.args.get('city', '').strip()
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    params = {'appid': api_key, 'units': 'metric'}

    if city:
        params['q'] = city
    elif lat and lon:
        params['lat'] = lat
        params['lon'] = lon
    else:
        return make_error_response("Please provide a city name or latitude and longitude coordinates.", 400)

    try:
        response = requests.get(OWM_WEATHER_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return make_error_response("City not found. Please check the spelling and try again.", 404)
        elif response.status_code == 401:
            return make_error_response("Invalid API Key. Please verify your OpenWeatherMap API key.", 401)
        elif response.status_code != 200:
            return make_error_response("Weather service temporarily unavailable. Please try again later.", response.status_code)
        
        data = response.json()

        city_name = data.get('name', '')
        country_code = data.get('sys', {}).get('country', '')

        # Save successful city search to SQLite database
        if city_name:
            add_search_history(city_name, country_code)

        coord = data.get('coord', {})
        temp = round(data.get('main', {}).get('temp', 0), 1)
        humidity = data.get('main', {}).get('humidity', 0)
        wind_speed = round(data.get('wind', {}).get('speed', 0), 1)
        wind_deg = data.get('wind', {}).get('deg', 0)
        clouds = data.get('clouds', {}).get('all', 0)
        sunrise = data.get('sys', {}).get('sunrise', 0)
        sunset = data.get('sys', {}).get('sunset', 0)
        dt = data.get('dt', 0)

        dew_point = round(temp - ((100 - humidity) / 5), 1)
        beaufort = calculate_beaufort(wind_speed)
        uv_info = calculate_uv_index(dt, sunrise, sunset, clouds)

        weather_info = {
            "success": True,
            "city": city_name,
            "country": country_code,
            "coord": coord,
            "lat": coord.get('lat'),
            "lon": coord.get('lon'),
            "temp": temp,
            "feels_like": round(data.get('main', {}).get('feels_like', 0), 1),
            "temp_min": round(data.get('main', {}).get('temp_min', 0), 1),
            "temp_max": round(data.get('main', {}).get('temp_max', 0), 1),
            "condition": data['weather'][0]['main'] if data.get('weather') else "Clear",
            "description": data['weather'][0]['description'].title() if data.get('weather') else "",
            "icon": data['weather'][0]['icon'] if data.get('weather') else "01d",
            "humidity": humidity,
            "wind_speed": wind_speed,
            "wind_deg": wind_deg,
            "beaufort": beaufort,
            "pressure": data.get('main', {}).get('pressure', 0),
            "visibility": round(data.get('visibility', 0) / 1000, 1),  # Convert meters to km
            "clouds": clouds,
            "dew_point": dew_point,
            "uv": uv_info,
            "sunrise": sunrise,
            "sunset": sunset,
            "timezone": data.get('timezone', 0),
            "dt": dt
        }

        return jsonify(weather_info)

    except requests.exceptions.Timeout:
        return make_error_response("Weather request timed out. Please check your internet connection.", 504)
    except requests.exceptions.ConnectionError:
        return make_error_response("Unable to connect to weather service. Please check your internet connection.", 503)
    except Exception as e:
        return make_error_response(f"An unexpected error occurred: {str(e)}", 500)


@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    """Fetch 5-day forecast & hourly weather data from OpenWeatherMap API."""
    api_key = get_api_key()
    if not api_key:
        return make_error_response("Please configure your OpenWeatherMap API key in the .env file.", 400)

    city = request.args.get('city', '').strip()
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    params = {'appid': api_key, 'units': 'metric'}

    if city:
        params['q'] = city
    elif lat and lon:
        params['lat'] = lat
        params['lon'] = lon
    else:
        return make_error_response("Please provide a city name or latitude and longitude.", 400)

    try:
        response = requests.get(OWM_FORECAST_URL, params=params, timeout=10)
        if response.status_code != 200:
            return make_error_response("Failed to fetch forecast data.", response.status_code)

        data = response.json()
        forecast_list = data.get('list', [])
        tz_offset = data.get('city', {}).get('timezone', 0)

        # 1. Hourly Forecast (Next 24 Hours - 8 items of 3-hour intervals)
        hourly_forecast = []
        for item in forecast_list[:8]:
            dt_timestamp = item.get('dt', 0)
            pop = round(item.get('pop', 0) * 100)  # Precipitation probability percentage
            
            hourly_forecast.append({
                "dt": dt_timestamp,
                "temp": round(item.get('main', {}).get('temp', 0), 1),
                "pop": pop,
                "icon": item['weather'][0]['icon'] if item.get('weather') else "01d",
                "condition": item['weather'][0]['main'] if item.get('weather') else ""
            })

        # 2. 5-Day Daily Forecast Grouping
        daily_map = {}
        for item in forecast_list:
            dt_timestamp = item.get('dt', 0)
            # Group by local date string
            date_str = datetime.fromtimestamp(dt_timestamp, dt_timezone.utc).strftime('%Y-%m-%d')

            temp = item.get('main', {}).get('temp', 0)
            weather_obj = item.get('weather', [{}])[0]

            if date_str not in daily_map:
                daily_map[date_str] = {
                    "date": date_str,
                    "dt": dt_timestamp,
                    "min_temp": temp,
                    "max_temp": temp,
                    "icons": [weather_obj.get('icon', '01d')],
                    "conditions": [weather_obj.get('main', 'Clear')],
                    "descriptions": [weather_obj.get('description', '').title()]
                }
            else:
                daily_map[date_str]['min_temp'] = min(daily_map[date_str]['min_temp'], temp)
                daily_map[date_str]['max_temp'] = max(daily_map[date_str]['max_temp'], temp)
                daily_map[date_str]['icons'].append(weather_obj.get('icon', '01d'))
                daily_map[date_str]['conditions'].append(weather_obj.get('main', 'Clear'))

        daily_forecast = []
        for date_str, day_data in list(daily_map.items())[:5]:
            # Select icon representing midday / most common condition
            mid_icon = day_data['icons'][len(day_data['icons']) // 2]
            mid_condition = day_data['conditions'][len(day_data['conditions']) // 2]
            
            daily_forecast.append({
                "date": date_str,
                "dt": day_data['dt'],
                "temp_min": round(day_data['min_temp'], 1),
                "temp_max": round(day_data['max_temp'], 1),
                "icon": mid_icon,
                "condition": mid_condition
            })

        return jsonify({
            "success": True,
            "hourly": hourly_forecast,
            "daily": daily_forecast
        })

    except Exception as e:
        return make_error_response(f"Unable to fetch forecast: {str(e)}", 500)


@app.route('/api/air-quality', methods=['GET'])
def get_air_quality():
    """Fetch Air Quality Index & Pollutant metrics from OpenWeatherMap Air Pollution API."""
    api_key = get_api_key()
    if not api_key:
        return make_error_response("Please configure your OpenWeatherMap API key in the .env file.", 400)

    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if not lat or not lon:
        return make_error_response("Latitude and longitude coordinates are required for Air Quality data.", 400)

    try:
        response = requests.get(OWM_AIR_POLLUTION_URL, params={'lat': lat, 'lon': lon, 'appid': api_key}, timeout=10)
        if response.status_code != 200:
            return make_error_response("Air quality data currently unavailable.", response.status_code)

        data = response.json()
        list_data = data.get('list', [{}])[0]
        
        aqi = list_data.get('main', {}).get('aqi', 1)  # 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
        components = list_data.get('components', {})

        aqi_labels = {
            1: {"level": "Good", "color": "#10b981"},
            2: {"level": "Fair", "color": "#84cc16"},
            3: {"level": "Moderate", "color": "#f59e0b"},
            4: {"level": "Poor", "color": "#ef4444"},
            5: {"level": "Very Poor", "color": "#991b1b"}
        }

        aqi_info = aqi_labels.get(aqi, {"level": "Unknown", "color": "#6b7280"})

        return jsonify({
            "success": True,
            "aqi": aqi,
            "level": aqi_info["level"],
            "color": aqi_info["color"],
            "components": {
                "pm2_5": round(components.get('pm2_5', 0), 1),
                "pm10": round(components.get('pm10', 0), 1),
                "co": round(components.get('co', 0), 1),
                "no2": round(components.get('no2', 0), 1),
                "so2": round(components.get('so2', 0), 1),
                "o3": round(components.get('o3', 0), 1)
            }
        })

    except Exception as e:
        return make_error_response(f"Unable to fetch air quality data: {str(e)}", 500)


@app.route('/api/recent-searches', methods=['GET'])
def recent_searches():
    """Retrieve recent search history from SQLite database."""
    try:
        history = get_recent_searches(limit=5)
        return jsonify({"success": True, "searches": history})
    except Exception as e:
        return make_error_response(str(e), 500)


@app.route('/api/favorites', methods=['GET', 'POST'])
def favorites():
    """Retrieve or add favorite cities in SQLite database."""
    if request.method == 'GET':
        try:
            favs = get_favorites()
            return jsonify({"success": True, "favorites": favs})
        except Exception as e:
            return make_error_response(str(e), 500)

    elif request.method == 'POST':
        try:
            req_data = request.get_json() or {}
            city = req_data.get('city', '').strip()
            country = req_data.get('country', '').strip()

            if not city:
                return make_error_response("City name is required to add favorite.", 400)

            fav_id = add_favorite(city, country)
            return jsonify({"success": True, "id": fav_id, "city": city, "country": country})
        except Exception as e:
            return make_error_response(str(e), 500)


@app.route('/api/favorites/<fav_id>', methods=['DELETE'])
def remove_favorite(fav_id):
    """Remove a favorite city from SQLite database by ID or city name."""
    try:
        success = delete_favorite(fav_id)
        if success:
            return jsonify({"success": True, "message": "Favorite removed successfully."})
        else:
            return make_error_response("Favorite city not found.", 404)
    except Exception as e:
        return make_error_response(str(e), 500)


if __name__ == '__main__':
    # Run Flask application server
    print("\n=======================================================")
    print(" Live Weather Dashboard is running!")
    print(" Access application at: http://127.0.0.1:5000")
    print("=======================================================\n")
    app.run(host='127.0.0.1', port=5000, debug=True)
