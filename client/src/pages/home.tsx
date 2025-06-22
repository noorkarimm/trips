import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverPreview } from "@/components/ui/hover-preview";
import { Logo } from "@/components/ui/logo";
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

const categoryIcons = {
  food: Utensils,
  accommodation: Bed,
  transport: Car,
  activity: Camera,
  default: Star
};

const getDemoImage = (category?: string, title?: string): string => {
  // Demo images using Unsplash with travel-related themes
  const demoImages = {
    food: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&crop=center", // Restaurant interior
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&crop=center", // Fine dining
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&crop=center", // Cafe
      "https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&h=600&fit=crop&crop=center", // Bistro
    ],
    accommodation: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&crop=center", // Luxury hotel
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=center", // Boutique hotel
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&crop=center", // Hotel room
      "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?w=800&h=600&fit=crop&crop=center", // Hotel lobby
    ],
    activity: [
      "https://images.unsplash.com/photo-1539650116574-75c0c6d73273?w=800&h=600&fit=crop&crop=center", // Museum
      "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=600&fit=crop&crop=center", // Landmark
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop&crop=center", // City tour
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop&crop=center", // Architecture
    ],
    transport: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&crop=center", // Airport
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop&crop=center", // Travel
    ]
  };

  const categoryImages = demoImages[category as keyof typeof demoImages] || demoImages.activity;
  
  // Use a simple hash of the title to consistently pick the same image for the same activity
  const hash = title ? title.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0) : 0;
  
  return categoryImages[Math.abs(hash) % categoryImages.length];
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
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{trip.title}</h3>
        <p className="text-white/80">
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
                {day.activities.map((activity, activityIndex) => {
                  const hasImage = activity.imageUrl || activity.category === 'food' || activity.category === 'accommodation' || activity.category === 'activity';
                  const imageUrl = activity.imageUrl || getDemoImage(activity.category, activity.title);
                  
                  const ActivityContent = (
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
                          {hasImage && (
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
                    </div>
                  );

                  return (
                    <div key={activityIndex}>
                      {hasImage ? (
                        <HoverPreview
                          imageUrl={imageUrl}
                          title={activity.title}
                          description={`${activity.location ? activity.location + ' • ' : ''}${activity.description}`}
                          previewWidth={400}
                          previewHeight={300}
                        >
                          {ActivityContent}
                        </HoverPreview>
                      ) : (
                        ActivityContent
                      )}
                    </div>
                  );
                })}
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
        <Button variant="outline" className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-8 py-3 rounded-xl font-medium">
          Customize Itinerary
        </Button>
        <Button variant="ghost" className="text-white hover:bg-white/10 px-8 py-3 rounded-xl font-medium" onClick={() => window.location.reload()}>
          Plan Another Trip
        </Button>
      </div>
    </div>
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [generatedTrip, setGeneratedTrip] = useState<GeneratedTrip | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConversationMode, setIsConversationMode] = useState(false);

  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; conversationId?: string }) => {
      const response = await apiRequest("POST", "/api/chat", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        setConversationId(data.conversationId);
        
        if (data.isComplete && data.trip) {
          setGeneratedTrip(data.trip);
          setIsConversationMode(false);
        }
      }
    },
  });

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

  const handleSend = (message: string, files?: File[]) => {
    if (message.trim().length === 0) return;
    
    // Extract the actual message from special formats
    let actualMessage = message;
    let messageType = 'normal';
    
    if (message.startsWith('[Search: ') && message.endsWith(']')) {
      actualMessage = message.slice(9, -1);
      messageType = 'search';
    } else if (message.startsWith('[Think: ') && message.endsWith(']')) {
      actualMessage = message.slice(8, -1);
      messageType = 'think';
    } else if (message.startsWith('[Canvas: ') && message.endsWith(']')) {
      actualMessage = message.slice(9, -1);
      messageType = 'canvas';
    }
    
    if (isConversationMode) {
      // Add user message to chat
      setChatMessages(prev => [...prev, { role: 'user', content: actualMessage }]);
      
      chatMutation.mutate({
        message: actualMessage,
        conversationId: conversationId || undefined
      });
    } else {
      // Check if this looks like a complex request that should use conversation mode
      const complexKeywords = ['family', 'adventure', 'budget', 'weeks', 'months', 'activities', 'preferences'];
      const shouldUseConversation = complexKeywords.some(keyword => 
        actualMessage.toLowerCase().includes(keyword)
      );

      if (shouldUseConversation) {
        setIsConversationMode(true);
        setChatMessages([{ role: 'user', content: actualMessage }]);
        
        chatMutation.mutate({
          message: actualMessage
        });
      } else {
        // Simple trip generation
        generateTripMutation.mutate({
          description: actualMessage,
          preferences: {}
        });
      }
    }
  };

  const resetChat = () => {
    setChatMessages([]);
    setConversationId(null);
    setIsConversationMode(false);
    setGeneratedTrip(null);
  };

  const isLoading = generateTripMutation.isPending || chatMutation.isPending;
  const error = generateTripMutation.error || chatMutation.error;

  return (
    <div className="min-h-screen bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]">
      {!generatedTrip ? (
        <div className="min-h-screen flex flex-col">
          {/* Header for landing page */}
          <header className="relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-2">
                  <Logo className="text-white" size={24} />
                  <h1 className="text-xl font-bold text-white">Trips</h1>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
            <div className="text-center mb-12 max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Plan your perfect trip with{" "}
                <span className="text-white/90">AI</span>
              </h2>
            </div>

            {/* Chat Messages */}
            {isConversationMode && chatMessages.length > 0 && (
              <div className="w-full max-w-2xl mb-8">
                <div className="bg-transparent border-none rounded-2xl p-6 max-h-96 overflow-y-auto">
                  <div className="space-y-4">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-white/20 backdrop-blur-sm text-white shadow-lg border border-white/20' 
                            : 'bg-white/90 backdrop-blur-sm text-text-primary shadow-lg border border-white/20'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Button 
                    variant="ghost" 
                    onClick={resetChat}
                    className="text-white hover:bg-white/10 text-sm bg-white/10 backdrop-blur-sm rounded-full px-6"
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            )}

            {/* AI Prompt Input */}
            <div className="w-full max-w-2xl relative">
              <PromptInputBox
                onSend={handleSend}
                isLoading={isLoading}
                placeholder={isConversationMode 
                  ? "Type your answer..." 
                  : "Describe your ideal trip... (e.g., 'I want a romantic weekend in Paris with my partner, focusing on art and wine')"
                }
                className="bg-white/10 backdrop-blur-md border-white/20 shadow-lg"
              />
              
              {isLoading && <TypingIndicator />}
              
              {error && (
                <div className="mt-4 p-4 bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-lg">
                  <p className="text-white text-sm">
                    {error instanceof Error ? error.message : "An error occurred"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen pt-8">
          {/* Header when showing results */}
          <header className="relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-2">
                  <Logo className="text-white" size={24} />
                  <h1 className="text-xl font-bold text-white">Trips</h1>
                </div>
                
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 font-medium"
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