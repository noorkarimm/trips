import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTripSchema, insertTripSchema } from "@shared/schema";
import { generateTripItinerary, generateActivityImages } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate trip itinerary
  app.post("/api/trips/generate", async (req, res) => {
    try {
      const validatedRequest = generateTripSchema.parse(req.body);
      console.log("Starting trip generation for:", validatedRequest.description);
      
      const result = await generateTripItinerary(validatedRequest);
      console.log("Trip itinerary generated successfully");
      
      // Save the generated trip first
      const trip = await storage.createTrip({
        userId: null, // For now, not requiring user auth
        title: result.title,
        description: validatedRequest.description,
        destination: result.destination,
        duration: result.duration,
        budget: result.budget,
        itinerary: result.itinerary,
        preferences: validatedRequest.preferences || null,
      });

      // Return immediately with the trip data
      res.json({
        success: true,
        trip: {
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          duration: trip.duration,
          budget: trip.budget,
          itinerary: trip.itinerary,
        }
      });

      // TODO: Add background image generation later
      // For now, skip images to ensure fast response
      
    } catch (error) {
      console.error("Trip generation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate trip"
      });
    }
  });

  // Get all trips
  app.get("/api/trips", async (req, res) => {
    try {
      const trips = await storage.getAllTrips();
      res.json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch trips"
      });
    }
  });

  // Get specific trip
  app.get("/api/trips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trip = await storage.getTrip(id);
      
      if (!trip) {
        return res.status(404).json({
          success: false,
          error: "Trip not found"
        });
      }

      res.json(trip);
    } catch (error) {
      console.error("Error fetching trip:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch trip"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
