import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChatInput, ChatInputTextArea, ChatInputSubmit } from "@/components/ui/chat-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateTripRequest, TripItinerary, ItineraryDay } from "@shared/schema";
import { MapPin, DollarSign, Clock, Star, Utensils, Bed, Car, Camera, Image } from "lucide-react";

interface GeneratedTrip {
  id: number;
  title: string;
  destination: string;
  duration: number;
  budget?: number;
  itinerary: TripItinerary;
}

const examplePrompts = [
  "Food-focused weekend in Chicago with my spouse",
  "Family beach vacation under $3K",
  "Adventure trip to New Zealand for 2 weeks",
  "Romantic getaway to Paris with wine tasting"
];

const categoryIcons = {
  food: Utensils,
  accommodation: Bed,
  transport: Car,
  activity: Camera,
  default: Star
};

function TypingIndicator() {
  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
        <span className="text-text-primary font-medium">AI is crafting your perfect trip...</span>
      </div>
    </div>
  );
}

function ItineraryResults({ trip }: { trip: GeneratedTrip }) {
  const getCategoryIcon = (category?: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || categoryIcons.default;
    return <IconComponent className="w-4 h-4" />;
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-600';
      case 'accommodation': return 'bg-blue-100 text-blue-600';
      case 'transport': return 'bg-green-100 text-green-600';
      case 'activity': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16 animate-[slideUp_0.5s_ease-out]">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">{trip.title}</h3>
        <p className="text-text-primary/70">
          {trip.duration} days • {trip.destination}
          {trip.budget && ` • Budget: $${trip.budget.toLocaleString()}`}
        </p>
      </div>

      <div className="space-y-6">
        {trip.itinerary.days.map((day: ItineraryDay, index: number) => (
          <Card 
            key={day.day} 
            className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-semibold text-text-primary">
                  Day {day.day}
                  {day.date && ` - ${day.date}`}
                </h4>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {day.title}
                </span>
              </div>
              
              <div className="space-y-3">
                {day.activities.map((activity, activityIndex) => (
                  <div key={activityIndex} className="group relative">
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50/50 transition-all duration-200 cursor-pointer">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getCategoryColor(activity.category)}`}>
                        {getCategoryIcon(activity.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-text-primary text-sm">{activity.time}</span>
                          <span className="text-text-primary/40">•</span>
                          <span className="font-semibold text-text-primary">{activity.title}</span>
                          {activity.cost && (
                            <>
                              <span className="text-text-primary/40">•</span>
                              <span className="text-sm text-green-600 font-medium">${activity.cost}</span>
                            </>
                          )}
                          {activity.imageUrl && (
                            <div className="ml-2 w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                              <Image className="w-2.5 h-2.5 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <p className="text-text-primary/70 text-sm">{activity.description}</p>
                        {activity.location && (
                          <div className="flex items-center mt-1 text-xs text-text-primary/60">
                            <MapPin className="w-3 h-3 mr-1" />
                            {activity.location}
                          </div>
                        )}
                      </div>
                      
                      {/* Image Preview on Hover */}
                      {activity.imageUrl && (
                        <div className="absolute left-full top-0 ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-none z-10">
                          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2 max-w-sm">
                            <img 
                              src={activity.imageUrl} 
                              alt={activity.title}
                              className="w-64 h-48 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="mt-2 p-2">
                              <h4 className="font-semibold text-sm text-text-primary">{activity.title}</h4>
                              <p className="text-xs text-text-primary/70 mt-1">{activity.location}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trip Summary */}
      {trip.itinerary.summary && (
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 text-center p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <h5 className="font-semibold text-text-primary mb-1">Total Budget</h5>
            <p className="text-text-primary/70">
              {trip.budget ? `$${trip.budget.toLocaleString()}` : 'Flexible'}
            </p>
          </Card>
          
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 text-center p-6">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-secondary" />
            </div>
            <h5 className="font-semibold text-text-primary mb-1">Distance</h5>
            <p className="text-text-primary/70">
              {trip.itinerary.summary.totalDistance || 'Moderate walking'}
            </p>
          </Card>
          
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 text-center p-6">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-accent" />
            </div>
            <h5 className="font-semibold text-text-primary mb-1">Highlights</h5>
            <p className="text-text-primary/70">
              {trip.itinerary.summary.highlights.length} experiences
            </p>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
        <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-medium">
          Save This Trip
        </Button>
        <Button variant="outline" className="border-primary/20 text-text-primary hover:text-primary px-8 py-3 rounded-xl font-medium">
          Customize Itinerary
        </Button>
        <Button variant="ghost" className="text-text-primary hover:text-primary px-8 py-3 rounded-xl font-medium" onClick={() => window.location.reload()}>
          Plan Another Trip
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [generatedTrip, setGeneratedTrip] = useState<GeneratedTrip | null>(null);

  const generateTripMutation = useMutation({
    mutationFn: async (request: GenerateTripRequest) => {
      const response = await apiRequest("POST", "/api/trips/generate", request);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedTrip(data.trip);
      }
    },
  });

  const handleSubmit = () => {
    if (inputValue.trim().length === 0) return;
    
    generateTripMutation.mutate({
      description: inputValue,
      preferences: {} // Could be expanded to collect user preferences
    });
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="min-h-screen bg-white dotted-background">
      {!generatedTrip ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center mb-12 max-w-3xl">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-text-primary">Trips</h1>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
              Plan your perfect trip with{" "}
              <span className="text-primary">AI</span>
            </h2>
            <p className="text-lg md:text-xl text-text-primary/70 mb-8 leading-relaxed">
              Just tell us what you want. No more browsing dozens of tabs or comparing endless options.
              Get personalized itineraries instantly.
            </p>
            
            {/* Example prompts */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className="bg-white/60 hover:bg-white/80 border border-gray-200 px-4 py-2 rounded-full text-sm text-text-primary hover:text-primary transition-all duration-200 hover:scale-105"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="w-full max-w-2xl relative">
            <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg p-3 transition-all duration-300 hover:shadow-xl">
              <ChatInput
                variant="default"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onSubmit={handleSubmit}
                loading={generateTripMutation.isPending}
                className="bg-transparent border-none shadow-none"
              >
                <ChatInputTextArea 
                  placeholder="Describe your ideal trip... (e.g., 'I want a romantic weekend in Paris with my partner, focusing on art and wine')"
                  className="bg-transparent border-none focus-visible:ring-0 shadow-none placeholder:text-text-primary/50"
                />
                <ChatInputSubmit className="bg-primary hover:bg-primary/90 text-white border-primary" />
              </ChatInput>
            </div>
            
            {generateTripMutation.isPending && <TypingIndicator />}
            
            {generateTripMutation.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">
                  {generateTripMutation.error instanceof Error ? generateTripMutation.error.message : "An error occurred"}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-screen pt-8">
          {/* Header when showing results */}
          <header className="relative z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-text-primary">Trips</h1>
                </div>
                
                <Button 
                  variant="ghost" 
                  className="text-text-primary hover:text-primary font-medium"
                  onClick={() => window.location.reload()}
                >
                  Plan New Trip
                </Button>
              </div>
            </div>
          </header>
          <ItineraryResults trip={generatedTrip} />
        </div>
      )}
    </div>
  );
}
