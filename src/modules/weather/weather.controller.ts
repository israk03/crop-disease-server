import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { getWeatherForecast } from "../../services/weather.service.js";
import {
  generateAdvisories,
  summariseForecast,
} from "../../services/advisory.service.js";
import Farm from "../../models/farm.model.js";
import Crop from "../../models/crop.model.js";
import AppError from "../../utils/AppError.js";
import sendResponse from "../../utils/sendResponse.js";

// ─────────────────────────────────────────────────────────
// Weather + advisories for a specific farm
// ─────────────────────────────────────────────────────────

const getWeatherForFarm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { farmId } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const farm = await Farm.findOne({
      _id: farmId,
      owner: userId,
      isActive: true,
    });

    if (!farm) {
      throw new AppError("Farm not found", 404);
    }

    if (
      !farm.location?.coordinates ||
      !Array.isArray(farm.location.coordinates)
    ) {
      throw new AppError(
        "This farm does not have GPS coordinates. Please update farm location.",
        400
      );
    }

    const [lon, lat] = farm.location.coordinates;

    const weatherData = await getWeatherForecast(lat, lon);

    const crops = await Crop.find({
      farm: farmId,
      status: "GROWING",
    }).select("name");

    const cropTypes = crops.map((c) => c.name);

    const advisories = generateAdvisories(
      weatherData,
      cropTypes
    );

    const summary = summariseForecast(
      weatherData.forecast
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message:
        "Weather and advisories retrieved successfully",
      data: {
        farm: {
          id: farm._id,
          name: farm.name,
          region: farm.region,
        },
        location: weatherData.location,
        current: weatherData.current,
        summary,
        forecast: weatherData.forecast,
        advisories,
        cropTypes,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// Weather + advisories for arbitrary coordinates
// ─────────────────────────────────────────────────────────

const getWeatherByLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      throw new AppError(
        "Valid latitude and longitude required (e.g. ?lat=23.8&lon=90.4)",
        400
      );
    }

    if (
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      throw new AppError(
        "Coordinates are out of valid range",
        400
      );
    }

    const weatherData = await getWeatherForecast(
      lat,
      lon
    );

    const advisories = generateAdvisories(weatherData);
    const summary = summariseForecast(
      weatherData.forecast
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message:
        "Weather and advisories retrieved successfully",
      data: {
        location: weatherData.location,
        current: weatherData.current,
        summary,
        forecast: weatherData.forecast,
        advisories,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────

const weatherController = {
  getWeatherForFarm,
  getWeatherByLocation,
};

export default weatherController;