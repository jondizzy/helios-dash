import cors from "cors";
import express from "express";
import "dotenv/config";

import {
  closeDatabaseConnection,
  testDatabaseConnection,
} from "./config/database";

import { startPlcPollingJob, stopPlcPollingJob } from "./jobs/plcPollingJob";
import { measurementRouter } from "./routes/measurementRoutes";
import { initializeMeasurementService } from "./services/measurementService";
import { disconnectAllPlcs } from "./services/plcService";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  }),
);

app.use(express.json());
app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/measurements", measurementRouter);

async function startServer(): Promise<void> {
  await testDatabaseConnection();
  await initializeMeasurementService();

  const server = app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
  });

  await startPlcPollingJob();
  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}. Shutting down..`);

    stopPlcPollingJob();

    server.close(async () => {
      try {
        await disconnectAllPlcs();
        await closeDatabaseConnection();

        console.log("shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("shutdown failed", error);
        process.exit(1);
      }
    });

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  }

  startServer().catch((error) => {
    console.error("Backend startup failed.", error);
    process.exit(1);
  });
}
