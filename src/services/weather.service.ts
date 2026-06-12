import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDegree: number;
  visibility: number;
  cloudiness: number;
  rainfall1h?: number;
  conditions: WeatherCondition[];
  sunrise: number;
  sunset: number;
  fetchedAt: Date;
}

export interface ForecastItem {
  datetime: Date;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  rainfall3h?: number;
  cloudiness: number;
  conditions: WeatherCondition[];
  pop: number;
}

export interface WeatherForecast {
  current: CurrentWeather;
  forecast: ForecastItem[];
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
}

// ─────────────────────────────────────────────────────────
// OpenWeather API Helper
// ─────────────────────────────────────────────────────────

const fetchFromOpenWeather = async (
  endpoint: string,
  params: Record<string, string>
): Promise<any> => {
  const url = new URL(
    `${env.OPENWEATHER_BASE_URL}/${endpoint}`
  );

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  url.searchParams.set(
    "appid",
    env.OPENWEATHER_API_KEY
  );

  url.searchParams.set("units", "metric");

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 401) {
      throw new AppError(
        "Weather service API key is invalid",
        500
      );
    }

    if (response.status === 404) {
      throw new AppError(
        "Location not found in weather service",
        404
      );
    }

    if (response.status === 429) {
      throw new AppError(
        "Weather service rate limit reached. Please try again later.",
        429
      );
    }

    throw new AppError(
      "Weather service is temporarily unavailable",
      503
    );
  }

  return response.json();
};

// ─────────────────────────────────────────────────────────
// Current Weather
// ─────────────────────────────────────────────────────────

export const getCurrentWeather = async (
  lat: number,
  lon: number
): Promise<CurrentWeather> => {
  const data = await fetchFromOpenWeather(
    "weather",
    {
      lat: lat.toString(),
      lon: lon.toString(),
    }
  );

  return {
    temperature:
      Math.round(data.main.temp * 10) / 10,
    feelsLike:
      Math.round(data.main.feels_like * 10) / 10,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
    windDegree: data.wind.deg ?? 0,
    visibility: data.visibility ?? 10000,
    cloudiness: data.clouds.all,
    rainfall1h: data.rain?.["1h"],
    conditions: data.weather,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    fetchedAt: new Date(),
  };
};

// ─────────────────────────────────────────────────────────
// Forecast
// ─────────────────────────────────────────────────────────

export const getWeatherForecast = async (
  lat: number,
  lon: number
): Promise<WeatherForecast> => {
  const [currentData, forecastData] =
    await Promise.all([
      fetchFromOpenWeather("weather", {
        lat: lat.toString(),
        lon: lon.toString(),
      }),
      fetchFromOpenWeather("forecast", {
        lat: lat.toString(),
        lon: lon.toString(),
      }),
    ]);

  const current: CurrentWeather = {
    temperature:
      Math.round(currentData.main.temp * 10) / 10,
    feelsLike:
      Math.round(
        currentData.main.feels_like * 10
      ) / 10,
    humidity: currentData.main.humidity,
    windSpeed: currentData.wind.speed,
    windDegree: currentData.wind.deg ?? 0,
    visibility: currentData.visibility ?? 10000,
    cloudiness: currentData.clouds.all,
    rainfall1h: currentData.rain?.["1h"],
    conditions: currentData.weather,
    sunrise: currentData.sys.sunrise,
    sunset: currentData.sys.sunset,
    fetchedAt: new Date(),
  };

  const forecast: ForecastItem[] =
    forecastData.list.map((item: any) => ({
      datetime: new Date(item.dt * 1000),
      temperature:
        Math.round(item.main.temp * 10) / 10,
      feelsLike:
        Math.round(
          item.main.feels_like * 10
        ) / 10,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed,
      rainfall3h: item.rain?.["3h"],
      cloudiness: item.clouds.all,
      conditions: item.weather,
      pop: item.pop ?? 0,
    }));

  return {
    current,
    forecast,
    location: {
      name: forecastData.city.name,
      country: forecastData.city.country,
      lat: forecastData.city.coord.lat,
      lon: forecastData.city.coord.lon,
    },
  };
};

const weatherService = {
  getCurrentWeather,
  getWeatherForecast,
};

export default weatherService;