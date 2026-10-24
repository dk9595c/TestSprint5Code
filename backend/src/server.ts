import express, { Express } from "express";
import { employmentHandler } from "./fbi/peHandler.js";
import cors from "cors";
import { registerCSVHandler } from "./activity-parser/activityParserHandler.js";
import { registerWeatherCSVHandler } from "./weather-parser/weatherParserHandler.js";
import { fetchWeatherInBoundingBox } from "./weather-parser/fetchWeatherServices.js";
import { fetchActivityDataFromGoogleSheet } from "./activity-parser/activityDataFetcher.js";
import { registerInitLocationHandler } from "./initial-loc-parser/InitialLocParserHandler.js";
import { registerTileManagerHandler } from "./tile-manager/tileManagerHandler.js";
import { registerHighlightRedliningHandler } from "./red-linning/redLinningHandler.js";
import { registerFilterHandler } from "./filter/filterHandler.js";
import { registerFindPathHandler } from "./street-graph/bestRouteHandler.js";
import { routeThroughStops } from "./street-graph/MultiStopAStar.js";
import { makeAcsHandler } from "./acs/acsHandler.js";
import { fetchACSData } from "./acs/acsFetcher.js";
import { arrestsHandler } from "./fbi/fbiHandler.js";
import { csvHandler } from "./csv/csvHandler.js";

// Prevent unhandled async rejections and uncaught exceptions from terminating the Node process
process.on("unhandledRejection", (reason, promise) => {
  console.warn("Unhandled Rejection detected (prevented crash):", reason);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
});

process.on("uncaughtException", (error) => {
  console.warn("Uncaught Exception detected (prevented crash):", error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
});

/**
 * Class representing the backend server application.
 */
export class ServerApp {
  public app: Express;
  private port: number;

  /**
   * Creates a new ServerApp instance.
   *
   * @param port The port number the server listens on (default 3001).
   */
  constructor(port: number = 3001) {
    this.app = express();
    this.port = port;
    this.configureMiddleware();
    this.registerHandlers();
  }

  /**
   * Configures global middleware for the Express app.
   */
  private configureMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: "5mb" }));

    // Task Y Mitigation: In-Memory Rate Limiter
    const rateLimitMap = new Map<string, number[]>();
    const WINDOW_MS = 10000; // 10 seconds
    const MAX_REQUESTS = 50;

    this.app.use((req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      
      const requests = rateLimitMap.get(ip) || [];
      // Filter out requests older than the 10-second window
      const recentRequests = requests.filter(timestamp => now - timestamp < WINDOW_MS);
      
      if (recentRequests.length >= MAX_REQUESTS) {
        res.status(429).json({
          result: "error_rate_limit",
          message: "Too many requests. Please slow down."
        });
        return;
      }
      
      recentRequests.push(now);
      rateLimitMap.set(ip, recentRequests);
      next();
    });
  }

  /**
   * Registers all route handlers for the server.
   */
  private registerHandlers() {
    registerCSVHandler(this.app, fetchActivityDataFromGoogleSheet);
    registerWeatherCSVHandler(this.app, fetchWeatherInBoundingBox);
    registerInitLocationHandler(this.app);
    registerTileManagerHandler(this.app);
    registerHighlightRedliningHandler(this.app);
    registerFilterHandler(this.app);
    registerFindPathHandler(this.app, routeThroughStops);
    this.app.get("/acs", makeAcsHandler(fetchACSData));
    this.app.get("/arrests", arrestsHandler);
    this.app.get("/getcsv", csvHandler);
    this.app.get("/employment", employmentHandler);
  }

  /**
   * Starts the Express server on the configured port.
   */
  public start() {
    this.app.listen(this.port, () => {
      console.log(`Backend running at http://localhost:${this.port}`);
    });
  }

  /**
   * Returns the underlying Express app instance.
   *
   * @returns The Express application.
   */
  public getApp(): Express {
    return this.app;
  }
}

/**
 * Starts the server if this module is run directly.
 */
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const server = new ServerApp();
  server.start();
}
