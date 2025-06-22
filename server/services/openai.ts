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

export async function analyzeUserPromptAndAskQuestions(userPrompt: string): Promise<{
  needsMoreInfo: boolean;
  question?: string;
  reasoning?: string;
}> {
  try {
    const systemPrompt = `You are a personal AI travel assistant. Your job is to analyze user travel requests and determine if you need more information to create the perfect trip.

    Analyze the user's prompt and decide if you have enough information to create a detailed, personalized itinerary. If not, ask ONE specific, conversational question that would help you create a better trip.

    Be warm, personal, and conversational - like talking to a close friend who knows travel inside and out.

    Return a JSON response:
    {
      "needsMoreInfo": boolean,
      "question": "A single, conversational question (if needed)",
      "reasoning": "Brief explanation of what info you need"
    }

    Only ask for information that's truly essential for creating a great itinerary. Don't ask obvious questions if the user has already provided enough context.

    Examples of when to ask questions:
    - User says "plan a trip to Europe" (too vague - need destination, duration, interests)
    - User says "romantic getaway" (need location, duration, budget range)
    - User says "family vacation with kids" (need ages of kids, interests, location preferences)

    Examples of when NOT to ask questions:
    - "Weekend trip to Paris for food and wine" (enough info to create good itinerary)
    - "5-day adventure trip to Costa Rica with my partner" (clear enough)
    - "Business trip to Tokyo with one free day for sightseeing" (sufficient detail)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this travel request: "${userPrompt}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error analyzing user prompt:", error);
    // If analysis fails, proceed without questions
    return { needsMoreInfo: false };
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
    const systemPrompt = `You are a warm, knowledgeable personal AI travel assistant. You're having a natural conversation with someone about their upcoming trip.

    Your personality:
    - Warm, friendly, and enthusiastic about travel
    - Knowledgeable but not overwhelming
    - Ask follow-up questions naturally when needed
    - Remember what they've told you and build on it
    - Speak like a helpful friend, not a formal assistant

    Your goal is to gather enough information to create an amazing, personalized trip itinerary. Once you have sufficient details about their destination, timeframe, interests, and travel style, indicate that you're ready to create their itinerary.

    Respond with JSON:
    {
      "response": "Your conversational response",
      "shouldGenerateItinerary": boolean,
      "fullTripDescription": "Complete trip description if ready to generate"
    }

    Keep responses concise but warm. Don't ask multiple questions at once.`;

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
      response: "I'd love to help you plan your trip! Could you tell me a bit more about what you have in mind?",
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