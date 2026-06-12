import {
  WeatherForecast,
  ForecastItem,
} from "./weather.service.js";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type AdvisoryType =
  | "IRRIGATION"
  | "DISEASE_RISK"
  | "FERTILIZER"
  | "HARVEST"
  | "PEST_RISK"
  | "GENERAL";

export type AdvisoryPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Advisory {
  type: AdvisoryType;
  priority: AdvisoryPriority;
  title: string;
  message: string;
  actionRequired: boolean;
}

export interface WeatherSummary {
  avgTempNext24h: number;
  maxTempNext24h: number;
  minTempNext24h: number;
  totalRainfallNext24h: number;
  totalRainfallNext72h: number;
  avgHumidityNext24h: number;
  maxWindSpeedNext24h: number;
  hasThunderstormNext24h: boolean;
  hasFrostRiskNext24h: boolean;
  precipitationProbabilityNext24h: number;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const safeMax = (arr: number[]) =>
  arr.length ? Math.max(...arr) : 0;

const safeMin = (arr: number[]) =>
  arr.length ? Math.min(...arr) : 0;

// ─────────────────────────────────────────────────────────
// Forecast summariser
// ─────────────────────────────────────────────────────────

const summariseForecast = (
  forecast: ForecastItem[]
): WeatherSummary => {
  const next24h = forecast.slice(0, 8);
  const next72h = forecast.slice(0, 24);

  const temps = next24h.map((f) => f.temperature);
  const humidities = next24h.map((f) => f.humidity);
  const windSpeeds = next24h.map((f) => f.windSpeed);

  const totalRainfallNext24h = next24h.reduce(
    (sum, f) => sum + (f.rainfall3h ?? 0),
    0
  );

  const totalRainfallNext72h = next72h.reduce(
    (sum, f) => sum + (f.rainfall3h ?? 0),
    0
  );

  const hasThunderstormNext24h = next24h.some((f) =>
    f.conditions?.some((c) => c.main === "Thunderstorm")
  );

  const maxPop = safeMax(next24h.map((f) => f.pop ?? 0));

  return {
    avgTempNext24h:
      Math.round(
        (temps.reduce((a, b) => a + b, 0) /
          temps.length) *
          10
      ) / 10 || 0,

    maxTempNext24h: safeMax(temps),
    minTempNext24h: safeMin(temps),

    totalRainfallNext24h: Math.round(totalRainfallNext24h * 10) / 10,
    totalRainfallNext72h: Math.round(totalRainfallNext72h * 10) / 10,

    avgHumidityNext24h: Math.round(
      humidities.reduce((a, b) => a + b, 0) /
        (humidities.length || 1)
    ),

    maxWindSpeedNext24h: safeMax(windSpeeds),

    hasThunderstormNext24h,
    hasFrostRiskNext24h: next24h.some(
      (f) => f.temperature < 2
    ),

    precipitationProbabilityNext24h: Math.round(
      maxPop * 100
    ),
  };
};

// ─────────────────────────────────────────────────────────
// Advisory rules
// ─────────────────────────────────────────────────────────

const checkIrrigation = (
  summary: WeatherSummary
): Advisory | null => {
  if (summary.totalRainfallNext24h >= 10) {
    return {
      type: "IRRIGATION",
      priority: "MEDIUM",
      title: "Skip Irrigation",
      message:
        `${summary.totalRainfallNext24h}mm rain expected. Avoid irrigation.`,
      actionRequired: false,
    };
  }

  if (
    summary.avgTempNext24h > 35 &&
    summary.avgHumidityNext24h < 40
  ) {
    return {
      type: "IRRIGATION",
      priority: "URGENT",
      title: "Immediate Irrigation Required",
      message:
        "High heat and low humidity detected. Irrigate immediately.",
      actionRequired: true,
    };
  }

  return null;
};

const checkDiseaseRisk = (
  summary: WeatherSummary,
  current: WeatherForecast["current"]
): Advisory | null => {
  if (
    summary.avgHumidityNext24h > 80 &&
    summary.avgTempNext24h >= 15 &&
    summary.avgTempNext24h <= 30
  ) {
    return {
      type: "DISEASE_RISK",
      priority: "HIGH",
      title: "High Fungal Disease Risk",
      message:
        "Warm + humid conditions favor fungal diseases.",
      actionRequired: false,
    };
  }

  return null;
};

const checkFertilizer = (
  summary: WeatherSummary
): Advisory | null => {
  if (summary.totalRainfallNext24h >= 15) {
    return {
      type: "FERTILIZER",
      priority: "HIGH",
      title: "Postpone Fertilizer",
      message:
        "Heavy rain expected. Fertilizer may wash away.",
      actionRequired: false,
    };
  }

  return null;
};

const checkHarvest = (
  summary: WeatherSummary
): Advisory | null => {
  if (summary.hasThunderstormNext24h) {
    return {
      type: "HARVEST",
      priority: "URGENT",
      title: "Thunderstorm Warning",
      message: "Secure or harvest crops immediately.",
      actionRequired: true,
    };
  }

  return null;
};

const checkPestRisk = (
  summary: WeatherSummary
): Advisory | null => {
  if (
    summary.avgHumidityNext24h > 70 &&
    summary.minTempNext24h > 18
  ) {
    return {
      type: "PEST_RISK",
      priority: "MEDIUM",
      title: "Elevated Pest Risk",
      message:
        "Warm humid conditions favor pest activity.",
      actionRequired: false,
    };
  }

  return null;
};

const checkFrost = (
  summary: WeatherSummary
): Advisory | null => {
  if (summary.hasFrostRiskNext24h) {
    return {
      type: "GENERAL",
      priority: "URGENT",
      title: "Frost Risk Warning",
      message:
        "Temperatures may drop below 2°C. Protect crops.",
      actionRequired: true,
    };
  }

  return null;
};

// ─────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────

export const generateAdvisories = (
  weatherData: WeatherForecast
): Advisory[] => {
  const summary = summariseForecast(
    weatherData.forecast
  );

  const results: (Advisory | null)[] = [
    checkFrost(summary),
    checkIrrigation(summary),
    checkDiseaseRisk(summary, weatherData.current),
    checkFertilizer(summary),
    checkHarvest(summary),
    checkPestRisk(summary),
  ];

  const advisories = results.filter(
    (a): a is Advisory => a !== null
  );

  const priorityOrder: Record<
    AdvisoryPriority,
    number
  > = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  return advisories.sort(
    (a, b) =>
      priorityOrder[a.priority] -
      priorityOrder[b.priority]
  );
};

// Export helper
export { summariseForecast };
