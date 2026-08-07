/**
 * GET http://localhost:3000/api/measurements
 * GET http://localhost:3000/api/measurements?limit=50
 * GET http://localhost:3000/api/measurements?tagId=1
 * GET http://localhost:3000/api/measurements?plcId=1
 * GET http://localhost:3000/api/measurements/latest?tagId=1
 */

import { Router } from "express";
import {
  getMeasurementsForRange,
  getMeasurements,
} from "../repositories/measurementRepository";

export const measurementRouter = Router();

function parseDate(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  return value;
}

function parseOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

measurementRouter.get("/report", async (request, response) => {
  try {
    const dateFrom = parseDate(request.query.from, "from");
    const dateTo = parseDate(request.query.to, "to");
    if (dateFrom > dateTo) {
      response
        .status(400)
        .json({ message: "from must be before or equal to to" });
      return;
    }
    const measurements = await getMeasurementsForRange(dateFrom, dateTo);
    response.json({ count: measurements.length, data: measurements });
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});

measurementRouter.get("/", async (request, response) => {
  try {
    const tagId = parseOptionalPositiveInteger(request.query.tagId, "tagId");

    const plcId = parseOptionalPositiveInteger(request.query.plcId, "plcId");

    const parsedLimit = request.query.limit ? Number(request.query.limit) : 100;
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      response.status(400).json({
        message: "limit must be a positive integer",
      });
      return;
    }
    const limit = Math.min(parsedLimit, 1000);
    const measurements = await getMeasurements({
      tagId,
      plcId,
      limit,
    });

    response.json({
      count: measurements.length,
      data: measurements,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    response.status(400).json({
      message,
    });
  }
});

measurementRouter.get("/latest", async (request, response) => {
  try {
    const tagId = parseOptionalPositiveInteger(request.query.tagId, "tagId");
    if (!tagId) {
      response.status(400).json({
        message: "tagId query parameter is required",
      });
      return;
    }
    const measurements = await getMeasurements({
      tagId,
      limit: 1,
    });
    if (measurements.length === 0) {
      response.status(404).json({
        message: "No measurement found for this tag",
      });
      return;
    }
    response.json(measurements[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({
      message,
    });
  }
});
