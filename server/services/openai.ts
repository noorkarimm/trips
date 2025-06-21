import OpenAI from "openai";
import type { GenerateTripRequest, TripItinerary } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export async function generateTripItinerary(request: GenerateTripRequest): Promise<{
  title: string;
  destination: string;
  duration: number;
  budget?: number;
  itinerary: TripItinerary;
}> {
  try {
    const { description, preferences } = request;
    
    const systemPrompt = `You are an expert travel planner. Create detailed, personalized trip itineraries based on user descriptions. 
    
    Return your response as a JSON object with the following structure:
    {
      "title": "Trip title (e.g., 'Food-Focused Weekend in Chicago')",
      "destination": "Main destination city/location",
      "duration": number_of_days,
      "budget": estimated_total_budget_in_dollars,
      "itinerary": {
        "days": [
          {
            "day": 1,
            "title": "Day description (e.g., 'Arrival & Deep Dish')",
            "activities": [
              {
                "time": "2:00 PM",
                "title": "Activity name",
                "description": "Detailed description",
                "location": "Specific location/address",
                "cost": estimated_cost_in_dollars,
                "category": "food|accommodation|activity|transport"
              }
            ]
          }
        ],
        "summary": {
          "totalDistance": "Total walking/travel distance",
          "highlights": ["Key experience 1", "Key experience 2"],
          "recommendations": ["Tip 1", "Tip 2"]
        }
      }
    }
    
    Make the itinerary detailed, realistic, and personalized. Include specific restaurant names, attractions, and practical information like timing and costs.`;

    const userPrompt = `Create a trip itinerary for: "${description}"
    
    ${preferences ? `Additional preferences:
    - Budget: ${preferences.budget ? `$${preferences.budget}` : 'flexible'}
    - Duration: ${preferences.duration ? `${preferences.duration} days` : 'flexible'}
    - Travel style: ${preferences.travelStyle || 'not specified'}
    - Accommodation preference: ${preferences.accommodation || 'not specified'}` : ''}
    
    Focus on creating a realistic, detailed itinerary with specific recommendations, timing, and estimated costs.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate the structure
    if (!result.title || !result.destination || !result.duration || !result.itinerary) {
      throw new Error("Invalid response structure from OpenAI");
    }

    return result;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate trip itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
