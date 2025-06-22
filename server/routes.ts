import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTripSchema, insertTripSchema, conversationSchema, type ConversationState } from "@shared/schema";
import { 
  generateTripItinerary, 
  generateActivityImages, 
  generateConversationalResponse 
} from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Natural AI conversation endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationId } = conversationSchema.parse(req.body);
      
      let conversation: ConversationState;
      
      if (conversationId) {
        const existing = await storage.getConversation(conversationId);
        if (!existing) {
          return res.status(404).json({
            success: false,
            error: "Conversation not found"
          });
        }
        conversation = existing;
      } else {
        // New conversation
        conversation = {
          id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          currentStep: 'chatting',
          responses: {},
          initialDescription: message,
          conversationHistory: []
        };
      }

      // Get AI response
      const conversationHistory = conversation.conversationHistory || [];
      const aiResponse = await generateConversationalResponse(conversationHistory, message);

      // Update conversation history
      conversation.conversationHistory = [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse.response }
      ];

      if (aiResponse.shouldGenerateItinerary && aiResponse.fullTripDescription) {
        // Generate the final itinerary
        const result = await generateTripItinerary({ 
          description: aiResponse.fullTripDescription,
          preferences: {}
        });
        
        const trip = await storage.createTrip({
          userId: null,
          title: result.title,
          description: aiResponse.fullTripDescription,
          destination: result.destination,
          duration: result.duration,
          budget: result.budget,
          itinerary: result.itinerary,
          preferences: null,
        });

        conversation.currentStep = 'completed';
        await storage.saveConversation(conversation);

        return res.json({
          success: true,
          response: aiResponse.response,
          conversationId: conversation.id,
          isComplete: true,
          trip: {
            id: trip.id,
            title: trip.title,
            destination: trip.destination,
            duration: trip.duration,
            budget: trip.budget,
            itinerary: trip.itinerary,
          }
        });
      }

      await storage.saveConversation(conversation);

      res.json({
        success: true,
        response: aiResponse.response,
        conversationId: conversation.id,
        isComplete: false
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process message"
      });
    }
  });

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