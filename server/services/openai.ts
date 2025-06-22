import OpenAI from "openai";
import type { GenerateTripRequest, TripItinerary } from "@shared/schema";

// Load environment variables
import { config } from 'dotenv';
config();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export async function generateConversationalResponse(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<{
  response: string;
  shouldGenerateItinerary: boolean;
  fullTripDescription?: string;
}> {
  try {
    const systemPrompt = `You are a personal AI travel assistant having a natural conversation. You're intelligent, warm, and genuinely excited about helping plan amazing trips.

    Your personality:
    - Conversational and natural, like talking to a knowledgeable friend
    - Enthusiastic about travel without being overwhelming
    - Ask clarifying questions naturally when needed
    - Remember everything from the conversation
    - Speak in a modern, friendly tone

    Your goal: Gather enough information to create a personalized trip itinerary. Once you have sufficient details (destination, rough timeframe, travel style/interests), you can generate the itinerary.

    Guidelines:
    - Keep responses concise and conversational
    - Ask ONE follow-up question if needed, naturally woven into your response
    - Don't use formal language or structured questions
    - Build on what they've already told you
    - When ready, indicate you'll create their itinerary

    Respond with JSON:
    {
      "response": "Your natural, conversational response",
      "shouldGenerateItinerary": boolean,
      "fullTripDescription": "Complete description if ready to generate (include all details from conversation)"
    }`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error generating conversational response:", error);
    return {
      response: "Hey! I'd love to help you plan an amazing trip. What are you thinking?",
      shouldGenerateItinerary: false
    };
  }
}

export async function generateActivityImages(tripData: {
  title: string;
  destination: string;
  duration: number;
  budget?: number;
  itinerary: TripItinerary;
}): Promise<{
  title: string;
  destination: string;
  duration: number;
  budget?: number;
  itinerary: TripItinerary;
}> {
  try {
    const enhancedItinerary = { ...tripData.itinerary };
    
    // Only generate 1-2 images total to avoid long wait times
    let imageCount = 0;
    const maxImages = 2;
    
    // Generate images for select activities (very limited to avoid timeouts)
    for (const day of enhancedItinerary.days) {
      if (imageCount >= maxImages) break;
      
      for (let i = 0; i < day.activities.length && imageCount < maxImages; i++) {
        const activity = day.activities[i];
        
        // Only generate for the most important activities (food and accommodation)
        if (activity.imagePrompt && 
            (activity.category === 'food' || activity.category === 'accommodation')) {
          
          try {
            const imageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: `${activity.imagePrompt}, high quality, photorealistic, travel photography style`,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            });
            
            activity.imageUrl = imageResponse.data[0].url;
            imageCount++;
            console.log(`Generated image ${imageCount}/${maxImages} for: ${activity.title}`);
          } catch (imageError) {
            console.warn(`Failed to generate image for activity: ${activity.title}`, imageError);
            // Continue without image if generation fails
          }
        }
      }
    }
    
    return {
      ...tripData,
      itinerary: enhancedItinerary
    };
  } catch (error) {
    console.error("Error generating activity images:", error);
    // Return original data if image generation fails
    return tripData;
  }
}