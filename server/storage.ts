import { users, trips, type User, type InsertUser, type Trip, type InsertTrip, type ConversationState } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripsByUser(userId: number): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip | undefined>;
  getAllTrips(): Promise<Trip[]>;
  getConversation(id: string): Promise<ConversationState | undefined>;
  saveConversation(conversation: ConversationState): Promise<ConversationState>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private conversations: Map<string, ConversationState>;
  private currentUserId: number;
  private currentTripId: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.conversations = new Map();
    this.currentUserId = 1;
    this.currentTripId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.currentTripId++;
    const trip: Trip = { 
      ...insertTrip, 
      id,
      userId: insertTrip.userId ?? null,
      budget: insertTrip.budget ?? null,
      preferences: insertTrip.preferences ?? null,
      createdAt: new Date()
    };
    this.trips.set(id, trip);
    return trip;
  }

  async getTripsByUser(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.userId === userId,
    );
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getAllTrips(): Promise<Trip[]> {
    return Array.from(this.trips.values());
  }

  async getConversation(id: string): Promise<ConversationState | undefined> {
    return this.conversations.get(id);
  }

  async saveConversation(conversation: ConversationState): Promise<ConversationState> {
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }
}

export const storage = new MemStorage();
