import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  destination: text("destination").notNull(),
  duration: integer("duration").notNull(), // in days
  budget: integer("budget"), // in dollars
  itinerary: jsonb("itinerary").notNull(), // JSON structure for daily activities
  preferences: jsonb("preferences"), // user preferences used for this trip
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itineraryDay = z.object({
  day: z.number(),
  title: z.string(),
  date: z.string().optional(),
  activities: z.array(z.object({
    time: z.string(),
    title: z.string(),
    description: z.string(),
    location: z.string().optional(),
    cost: z.number().optional(),
    category: z.string().optional(),
    imagePrompt: z.string().optional(),
    imageUrl: z.string().optional(),
  })),
});

export const tripItinerary = z.object({
  days: z.array(itineraryDay),
  totalBudget: z.number().optional(),
  summary: z.object({
    totalDistance: z.string().optional(),
    highlights: z.array(z.string()),
    recommendations: z.array(z.string()).optional(),
  }).optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
});

export const generateTripSchema = z.object({
  description: z.string().min(10, "Please provide more details about your trip"),
  preferences: z.object({
    budget: z.number().optional(),
    duration: z.number().optional(),
    travelStyle: z.string().optional(),
    accommodation: z.string().optional(),
  }).optional(),
});

export const conversationSchema = z.object({
  message: z.string().min(1, "Please provide a message"),
  conversationId: z.string().optional(),
});

export const conversationState = z.object({
  id: z.string(),
  currentStep: z.enum(['chatting', 'completed']),
  responses: z.object({
    dates: z.string().optional(),
    vibe: z.string().optional(),
    stayStyle: z.string().optional(),
    activities: z.string().optional(),
  }),
  initialDescription: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
});

export type ConversationMessage = z.infer<typeof conversationSchema>;
export type ConversationState = z.infer<typeof conversationState>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type TripItinerary = z.infer<typeof tripItinerary>;
export type ItineraryDay = z.infer<typeof itineraryDay>;
export type GenerateTripRequest = z.infer<typeof generateTripSchema>;