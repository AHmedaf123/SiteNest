import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Mic, MicOff, Volume2, Heart, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'carousel' | 'buttons' | 'pricing' | 'booking_summary' | 'voice';
  data?: any;
  quickActions?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'urgent';
  confidence?: number;
  isTyping?: boolean;
}

interface ConversationContext {
  lastMessageType?: string;
  lastBotResponse?: string;
  timestamp?: Date;
  [key: string]: any;
}

interface UserPreferences {
  [key: string]: any;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState<string[]>(['open_whatsapp', 'check_availability', 'pricing']);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userSatisfaction, setUserSatisfaction] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, user } = useRealAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Ensure quick actions are always available
  useEffect(() => {
    if (quickActions.length === 0) {
      setQuickActions(['open_whatsapp', 'check_availability', 'pricing']);
    }
  }, [quickActions]);

  useEffect(() => {
    // Listen for chatbot toggle events
    const handleOpenChatbot = () => {
      setIsOpen(true);
      // Always initialize chat when opening, regardless of message count
      if (!sessionId) {
        initializeChat();
      }
    };

    // Listen for booking request events
    const handleOpenChatbotWithBooking = (event: any) => {
      const { roomId, apartmentId, checkIn, checkOut, bookingRequestId, user: userData } = event.detail;

      // Check if user has completed two-step verification
      if (!userData.isEmailVerified || !userData.isPhoneVerified) {
        toast({
          title: "Two-Step Verification Required",
          description: "Please complete email and phone verification before booking.",
          variant: "destructive"
        });
        return;
      }

      setIsOpen(true);

      // Clear previous messages and start conversation flow
      setMessages([]);

      // Start the booking conversation flow
      setTimeout(async () => {
        const bookingData = {
          roomId,
          apartmentId,
          checkIn,
          checkOut,
          bookingRequestId,
          user: userData
        };

        // Initialize session first if not already done
        if (!sessionId) {
          try {
            console.log("🔄 Initializing chat session for booking...");
            const response = await apiRequest("POST", "/api/chat/session");
            const session = await response.json();
            setSessionId(session.sessionId);
            console.log("✅ Session created:", session.sessionId);

            // Send booking message directly without the general greeting
            console.log("📤 Sending booking message with data:", bookingData);
            await sendAIMessage(`I want to book Room ${roomId} from ${checkIn} to ${checkOut}`, session.sessionId, undefined, bookingData);
          } catch (error) {
            console.error("❌ Failed to initialize chat session:", error);
            // Fallback to direct message without session
            addMessage("Hello! I'm your SiteNest booking assistant. I see you want to book a room. Let me help you with that!", false);
            setQuickActions(['open_whatsapp', 'contact_info', 'pricing']);
          }
        } else {
          // Session already exists, send booking message
          console.log("📤 Using existing session, sending booking message:", sessionId);
          await sendAIMessage(`I want to book Room ${roomId} from ${checkIn} to ${checkOut}`, undefined, undefined, bookingData);
        }
      }, 500);
    };

    // Listen for room unavailability events
    const handleOpenChatbotWithUnavailability = (event: any) => {
      const { roomId, apartmentId, checkIn, checkOut, user: userData } = event.detail;

      setIsOpen(true);

      // Clear previous messages and start conversation flow
      setMessages([]);

      // Start the unavailability conversation flow
      setTimeout(async () => {
        const unavailabilityData = {
          roomId,
          apartmentId,
          checkIn,
          checkOut,
          user: userData,
          isUnavailable: true
        };

        // Initialize session first if not already done
        if (!sessionId) {
          try {
            console.log("🔄 Initializing chat session for unavailability...");
            const response = await apiRequest("POST", "/api/chat/session");
            const session = await response.json();
            setSessionId(session.sessionId);
            console.log("✅ Session created:", session.sessionId);

            // Send unavailability message to get alternatives
            console.log("📤 Sending unavailability message with data:", unavailabilityData);
            await sendAIMessage(`Room ${roomId} is not available from ${checkIn} to ${checkOut}. Please show me alternatives.`, session.sessionId, undefined, unavailabilityData);
          } catch (error) {
            console.error("❌ Failed to initialize chat session:", error);
            // Fallback to direct message without session
            addMessage(`I'm sorry, Room ${roomId} is not available for the selected dates. Let me help you find alternatives!`, false);
            setQuickActions(['check_availability', 'open_whatsapp', 'contact_info']);
          }
        } else {
          // Session already exists, send unavailability message
          console.log("📤 Using existing session, sending unavailability message:", sessionId);
          await sendAIMessage(`Room ${roomId} is not available from ${checkIn} to ${checkOut}. Please show me alternatives.`, undefined, undefined, unavailabilityData);
        }
      }, 500);
    };

    window.addEventListener('openChatbot', handleOpenChatbot);
    window.addEventListener('openChatbotWithBooking', handleOpenChatbotWithBooking);
    window.addEventListener('openChatbotWithUnavailability', handleOpenChatbotWithUnavailability);

    return () => {
      window.removeEventListener('openChatbot', handleOpenChatbot);
      window.removeEventListener('openChatbotWithBooking', handleOpenChatbotWithBooking);
      window.removeEventListener('openChatbotWithUnavailability', handleOpenChatbotWithUnavailability);
    };
  }, [messages.length, sessionId]);

  // Initialize session when chatbot is opened
  useEffect(() => {
    if (isOpen && !sessionId) {
      console.log("🔄 Chatbot opened without session, initializing...");
      initializeChat();
    }
  }, [isOpen, sessionId]);

  const initializeChat = async () => {
    try {
      const response = await apiRequest("POST", "/api/chat/session");
      const session = await response.json();
      setSessionId(session.sessionId);

      // Send initial AI greeting
      await sendAIMessage("Hello! I'm your SiteNest booking assistant. How can I help you today?", session.sessionId);

      // Ensure quick actions appear for initial greeting
      setTimeout(() => {
        if (quickActions.length === 0) {
          setQuickActions(['open_whatsapp', 'check_availability', 'pricing']);
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      addMessage("Hello! I'm your SiteNest booking assistant. For any booking inquiries, please contact us directly on WhatsApp at 0311-5197087. How can I help you today?", false);
      setQuickActions(['open_whatsapp', 'check_availability', 'pricing']);
    }
  };







  const addMessage = (text: string, isUser: boolean, type?: string, data?: any, quickActions?: string[], sentiment?: string, confidence?: number) => {
    const newMessage: Message = {
      id: Date.now() + Math.random(), // Ensure unique IDs
      text,
      isUser,
      timestamp: new Date(),
      type: type as any,
      data,
      quickActions,
      sentiment: sentiment as any,
      confidence
    };
    setMessages(prev => [...prev, newMessage]);

    // Auto-scroll to bottom with smooth animation
    setTimeout(() => scrollToBottom(), 100);

    // Update conversation context
    if (!isUser && type) {
      setConversationContext(prev => ({
        ...prev,
        lastMessageType: type,
        lastBotResponse: text,
        timestamp: new Date()
      }));
    }
  };

  const sendAIMessage = async (message: string, currentSessionId?: string, availabilityData?: any, bookingData?: any) => {
    console.log("🤖 sendAIMessage called with:", { message, currentSessionId, sessionId, hasBookingData: !!bookingData });

    if (!currentSessionId && !sessionId) {
      console.log("❌ No session ID available, returning early");
      return;
    }

    setIsLoading(true);
    setIsTyping(true);

    // Show typing indicator
    const typingMessage: Message = {
      id: Date.now() + Math.random(),
      text: "Assistant is thinking...",
      isUser: false,
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const requestData = {
        sessionId: currentSessionId || sessionId,
        message,
        availabilityData,
        bookingData,
        conversationContext,
        userPreferences,
        userInfo: user ? {
          id: user.id,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
          email: user.email,
          isAuthenticated
        } : null
      };

      console.log("📤 Sending enhanced AI request:", requestData);

      const response = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log("📥 AI response status:", response.status);
      const result = await response.json();
      console.log("📥 AI response data:", result);

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping));

      if (result.response) {
        addMessage(
          result.response,
          false,
          result.type,
          result.data,
          result.quickActions,
          result.sentiment,
          result.confidence
        );

        // Update conversation context
        if (result.context) {
          setConversationContext(prev => ({ ...prev, ...result.context }));
        }

        // Update user preferences
        if (result.userPreferences) {
          setUserPreferences(prev => ({ ...prev, ...result.userPreferences }));
        }

        // Update quick actions
        if (result.quickActions) {
          setQuickActions(result.quickActions);
        } else {
          setQuickActions(['open_whatsapp', 'check_availability', 'pricing']);
        }

        // Show satisfaction prompt after important interactions
        if (result.type === 'booking_summary' || result.type === 'pricing') {
          setTimeout(() => showSatisfactionPrompt(), 2000);
        }
      } else if (result.fallbackResponse) {
        addMessage(result.fallbackResponse, false, 'text', null, ['open_whatsapp', 'check_availability', 'pricing']);
      }
    } catch (error) {
      console.error('AI Message Error:', error);
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping));

      addMessage(
        "I'm sorry, I'm having technical difficulties. Please contact us directly at 0311-5197087 for immediate assistance.",
        false,
        'text',
        null,
        ['open_whatsapp', 'contact_info']
      );
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const showSatisfactionPrompt = () => {
    addMessage(
      "How was your experience with me today? Your feedback helps me improve! 😊",
      false,
      'buttons',
      [
        { title: "⭐ Excellent", payload: "satisfaction_5" },
        { title: "👍 Good", payload: "satisfaction_4" },
        { title: "👌 Okay", payload: "satisfaction_3" },
        { title: "👎 Poor", payload: "satisfaction_2" },
        { title: "😞 Terrible", payload: "satisfaction_1" }
      ]
    );
  };

  const handleSatisfactionRating = (rating: number) => {
    setUserSatisfaction(rating);
    const responses = {
      5: "Thank you! I'm thrilled I could help you perfectly! 🌟",
      4: "Great! I'm glad I could assist you well! 😊",
      3: "Thanks for the feedback! I'll keep improving! 👍",
      2: "I'm sorry I couldn't meet your expectations. I'll do better! 😔",
      1: "I apologize for the poor experience. Let me connect you with human support! 🙏"
    };

    addMessage(responses[rating as keyof typeof responses], false);

    if (rating <= 2) {
      setTimeout(() => {
        addMessage(
          "Let me connect you with our human support team for better assistance.",
          false,
          'text',
          null,
          ['open_whatsapp', 'contact_support']
        );
      }, 1000);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak now, I'm listening! 🎤"
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Voice input failed",
        description: "Please try again or type your message.",
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    addMessage(userMessage, true);
    setInputValue("");

    // Focus back to input for better UX
    setTimeout(() => inputRef.current?.focus(), 100);

    // Send all messages to AI for processing
    await sendAIMessage(userMessage);
  };







  const handleRoomSelection = (room: any) => {
    // Navigate to apartment detail page with the selected room highlighted
    const apartmentId = room.apartmentId || room.id;
    const roomNumber = room.roomNumber;
    
    // Close chatbot
    setIsOpen(false);
    
    // Navigate to apartment detail page
    if (apartmentId) {
      // Use React Router navigation if available, otherwise use window.location
      const apartmentUrl = `/apartment/${apartmentId}?room=${roomNumber}&highlight=true`;
      window.location.href = apartmentUrl;
    } else {
      // Fallback: navigate to apartments page
      window.location.href = '/apartments';
    }
    
    // Add a message to indicate the selection
    addMessage(`Great choice! Redirecting you to Room ${roomNumber} details...`, false);
  };

  const handleQuickAction = async (action: string, payload?: string) => {
    // Handle satisfaction ratings
    if (action.startsWith('satisfaction_')) {
      const rating = parseInt(action.split('_')[1]);
      handleSatisfactionRating(rating);
      return;
    }

    // Ensure session exists before processing any action
    if (!sessionId) {
      console.log("🔄 No session ID, creating session for quick action...");
      try {
        const response = await apiRequest("POST", "/api/chat/session");
        const session = await response.json();
        setSessionId(session.sessionId);
        console.log("✅ Session created for quick action:", session.sessionId);
      } catch (error) {
        console.error("❌ Failed to create session for quick action:", error);
        // Show error message and return
        addMessage("I'm having trouble connecting. Please try again or contact us directly at 0311-5197087.", false);
        return;
      }
    }

    // Handle payload-based actions (button clicks)
    if (payload) {
      addMessage(payload, true);
      await sendAIMessage(payload);
      return;
    }

    let message = "";

    switch (action) {
      case 'contact_whatsapp':
        message = "How can I contact you on WhatsApp?";
        break;
      case 'open_whatsapp':
        // Directly open WhatsApp with enhanced message
        const whatsappMessage = encodeURIComponent(
          `Hi! I'm interested in booking a room at SiteNest. ${conversationContext.lastBotResponse ? 'I was just chatting with your AI assistant.' : 'Can you help me with availability and pricing?'}`
        );
        window.open(`https://wa.me/+923115197087?text=${whatsappMessage}`, '_blank');
        addMessage("Opening WhatsApp...", true);
        addMessage(
          "Perfect! I've opened WhatsApp for you. Our human team will continue from where we left off! 🚀",
          false,
          'text',
          null,
          ['payment_info', 'location', 'pricing']
        );
        return;
      case 'check_availability':
        message = "I want to check room availability";
        break;
      case 'pricing':
        message = "What are your pricing options?";
        break;
      case 'payment_info':
        message = "How do I make the payment confirmation?";
        break;
      case 'payment_steps':
        message = "What are the payment steps?";
        break;
      case 'contact_info':
        message = "What is your contact information?";
        break;
      case 'location':
        message = "Where is SiteNest located?";
        break;
      case 'book_now':
        message = "I want to book a room now";
        break;
      case 'voice_mode':
        setIsVoiceMode(!isVoiceMode);
        toast({
          title: isVoiceMode ? "Voice mode disabled" : "Voice mode enabled",
          description: isVoiceMode ? "Switched back to text input" : "You can now use voice input! 🎤"
        });
        return;

      // Enhanced guest count responses
      case '1_person':
        message = "I need accommodation for 1 person";
        break;
      case '2_people':
        message = "I need accommodation for 2 people";
        break;
      case '3_people':
        message = "I need accommodation for 3 people";
        break;
      case '4_people':
        message = "I need accommodation for 4 people";
        break;
      case 'more_than_4':
        message = "I need accommodation for more than 4 people";
        break;

      // Enhanced payment responses
      case 'what_procedure':
        message = "What's the booking procedure?";
        break;
      case 'no_pay_first':
        message = "I don't want to pay in advance";
        break;
      case 'why_necessary':
        message = "Why is advance payment necessary?";
        break;
      case 'done_payment':
        message = "I have completed the payment";
        break;
      case 'will_do_payment':
        message = "I will make the payment";
        break;
      case 'contact_support':
        message = "I need to contact human support";
        break;

      // New qualification questions
      case 'yes_parking':
        message = "Yes, I need parking space";
        break;
      case 'no_parking':
        message = "No, I don't need parking";
        break;
      case 'not_sure':
        message = "I'm not sure about parking";
        break;
      case 'yes_refreshments':
        message = "Yes, please arrange refreshments";
        break;
      case 'no_refreshments':
        message = "No refreshments needed";
        break;
      case 'tell_me_more':
        message = "Tell me more about refreshment options";
        break;
      case 'no_requests':
        message = "No special requests";
        break;
      case 'early_checkin':
        message = "I need early check-in";
        break;
      case 'late_checkout':
        message = "I need late check-out";
        break;
      case 'extra_amenities':
        message = "I need extra amenities";
        break;
      case 'payment_done':
        message = "I have completed the payment";
        break;
      case 'payment_questions':
        message = "I have questions about payment";
        break;
      case 'need_help':
        message = "I need help with the process";
        break;
      case 'contact_team':
        message = "I want to contact your team";
        break;
      case 'more_questions':
        message = "I have more questions";
        break;
      case 'booking_confirmed':
        message = "Thank you for confirming my booking";
        break;

      // Additional quick actions for better coverage
      case '1_guest':
        message = "I need accommodation for 1 guest";
        break;
      case '2_guests':
        message = "I need accommodation for 2 guests";
        break;
      case '3_guests':
        message = "I need accommodation for 3 guests";
        break;
      case '4_guests':
        message = "I need accommodation for 4 guests";
        break;
      case 'special_requests':
        message = "I have special requests";
        break;

      default:
        message = action.replace(/_/g, ' ');
    }

    if (message) {
      addMessage(message, true);
      await sendAIMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderRichMessage = (message: Message) => {
    const isUser = message.isUser;

    // Typing indicator
    if (message.isTyping) {
      return (
        <div key={message.id} className="flex items-start space-x-3 mb-4">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-sitenest-primary rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="text-white text-xs animate-pulse" />
          </div>
          <div className="bg-sitenest-background border border-sitenest-secondary rounded-lg p-2 sm:p-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-sitenest-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-sitenest-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-sitenest-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex items-start space-x-3 mb-4 ${isUser ? 'justify-end' : ''}`}>
        {isUser ? (
          <>
            <div className="bg-sitenest-primary text-white rounded-lg p-2 sm:p-3 max-w-[200px] sm:max-w-xs shadow-lg">
              <div className="text-xs sm:text-sm">{message.text}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-sitenest-secondary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="text-sitenest-primary text-xs" />
            </div>
          </>
        ) : (
          <>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-sitenest-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="text-white text-xs" />
            </div>
            <div className="bg-sitenest-background border border-sitenest-secondary rounded-lg p-2 sm:p-3 max-w-[250px] sm:max-w-sm shadow-lg">
              <div className="text-xs sm:text-sm text-sitenest-text">{message.text}</div>

              {/* Render special message types */}
              {(message.type === 'carousel' || message.data?.type === 'pricing_carousel' || message.data?.type === 'availability_carousel') && message.data && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {(message.data.apartments || message.data).map((room: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-sitenest-primary">Room {room.roomNumber}</h4>
                            {room.bedrooms && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{room.bedrooms} bed</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 truncate">{room.title}</div>
                          {room.amenities && room.amenities.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {room.amenities.slice(0, 3).join(' • ')}
                              {room.amenities.length > 3 && ' +more'}
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="font-bold text-sitenest-primary">PKR {room.price?.toLocaleString()}/night</div>
                            {room.originalPrice && room.originalPrice > room.price && (
                              <span className="text-xs text-gray-500 line-through">PKR {room.originalPrice?.toLocaleString()}</span>
                            )}
                            {room.discount && (
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">{room.discount}% off</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col ml-2">
                          <Button
                            size="sm"
                            onClick={() => handleRoomSelection(room)}
                            className="bg-sitenest-primary hover:bg-sitenest-secondary text-xs px-2 py-1"
                          >
                            Select Room
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render pricing breakdown */}
              {message.type === 'pricing' && message.data && (
                <div className="mt-3 p-3 bg-white rounded border shadow-sm">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span>PKR {message.data.basePrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nights:</span>
                      <span>{message.data.nights}</span>
                    </div>
                    {message.data.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-PKR {message.data.discount?.toLocaleString()}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold text-sitenest-primary">
                      <span>Total:</span>
                      <span>PKR {message.data.total?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Render buttons */}
              {message.type === 'buttons' && message.data && (
                <div className="mt-3 space-y-2">
                  {message.data.map((button: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start hover:bg-sitenest-primary hover:text-white transition-all duration-300"
                      onClick={() => handleQuickAction(button.title, button.payload)}
                    >
                      {button.title}
                    </Button>
                  ))}
                </div>
              )}

              {/* Sentiment indicator */}
              {message.sentiment && message.sentiment !== 'neutral' && (
                <div className="mt-2 flex items-center space-x-1">
                  {message.sentiment === 'positive' && <Heart className="w-3 h-3 text-red-500" />}
                  {message.sentiment === 'urgent' && <Sparkles className="w-3 h-3 text-orange-500" />}
                  <span className="text-xs text-gray-500">
                    {message.sentiment} {message.confidence && `(${Math.round(message.confidence * 100)}%)`}
                  </span>
                </div>
              )}

              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const getQuickActionLabel = (action: string): string => {
    const labels: { [key: string]: string } = {
      'contact_whatsapp': '📱 WhatsApp Contact',
      'open_whatsapp': '💬 Open WhatsApp',
      'check_availability': '🏠 Check Availability',
      'pricing': '💰 View Pricing',
      'payment_info': '💳 Payment Info',
      'payment_steps': '📋 Payment Steps',
      'contact_info': '📞 Contact Info',
      'location': '📍 Location',
      'book_now': '🏨 Book Now',
      'voice_mode': isVoiceMode ? '🔇 Disable Voice' : '🎤 Voice Mode',

      // Guest count options
      '1_person': '👤 1 Person',
      '2_people': '👥 2 People',
      '3_people': '👨‍👩‍👦 3 People',
      '4_people': '👨‍👩‍👧‍👦 4 People',
      'more_than_4': '👨‍👩‍👧‍👦+ More than 4',

      // Alternative guest count options (for backend compatibility)
      '1_guest': '👤 1 Guest',
      '2_guests': '👥 2 Guests',
      '3_guests': '👨‍👩‍👦 3 Guests',
      '4_guests': '👨‍👩‍👧‍👦 4 Guests',
      // Payment options
      'what_procedure': '❓ What\'s the procedure?',
      'no_pay_first': '❌ Don\'t want to pay first',
      'why_necessary': '🤔 Why is it necessary?',
      'done_payment': '✅ Payment Done',
      'will_do_payment': '⏳ Will do payment',
      'contact_support': '📞 Contact Support',

      // Qualification questions
      'yes_parking': '🚗 Yes, need parking',
      'no_parking': '🚫 No parking needed',
      'not_sure': '🤷 Not sure',
      'yes_refreshments': '🍽️ Yes, arrange refreshments',
      'no_refreshments': '🚫 No refreshments',
      'tell_me_more': 'ℹ️ Tell me more',
      'no_requests': '✅ No special requests',
      'early_checkin': '🕐 Early check-in',
      'late_checkout': '🕕 Late check-out',
      'extra_amenities': '🛎️ Extra amenities',
      'payment_questions': '❓ Payment questions',
      'need_help': '🆘 Need help',
      'contact_team': '👥 Contact team',
      'more_questions': '❓ More questions',
      'booking_confirmed': '✅ Booking confirmed',
      'special_requests': '✨ Special requests'
    };
    return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chatbot Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-bounce-subtle ${
          isOpen ? 'bg-gray-600 hover:bg-gray-700' : 'bg-sitenest-primary hover:bg-sitenest-secondary text-white'
        }`}
      >
        {isOpen ? <X className="text-2xl" /> : <MessageCircle className="text-2xl" />}
      </Button>

      {/* Enhanced Chatbot Modal */}
      {isOpen && (
        <div className="fixed bottom-4 sm:bottom-20 right-2 sm:right-4 w-[calc(100vw-1rem)] sm:w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 duration-300 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-6rem)] flex flex-col">
          {/* Enhanced Chat Header */}
          <div className="bg-gradient-to-r from-sitenest-primary to-sitenest-secondary text-white p-3 sm:p-4 rounded-t-xl flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center animate-pulse">
                <Bot className="text-xs sm:text-sm" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base flex items-center space-x-1">
                  <span>SiteNest AI Assistant</span>
                  <Sparkles className="w-3 h-3" />
                </h3>
                <div className="text-xs opacity-90 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Online • AI-Powered</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {userSatisfaction && (
                <div className="flex items-center space-x-1 mr-2">
                  <Star className="w-3 h-3 text-yellow-300" />
                  <span className="text-xs">{userSatisfaction}/5</span>
                </div>
              )}
              <Button
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                variant="ghost"
                size="sm"
                className="text-white hover:text-gray-200 hover:bg-white/10 p-1"
                title={isVoiceMode ? "Disable voice mode" : "Enable voice mode"}
              >
                {isVoiceMode ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:text-gray-200 hover:bg-white/10 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white min-h-0 max-h-[50vh] sm:max-h-[60vh]">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8 animate-in fade-in duration-500">
                <Bot className="w-12 h-12 mx-auto mb-4 text-sitenest-primary animate-bounce" />
                <p className="font-semibold">Welcome to SiteNest! 🏠</p>
                <p className="text-sm mt-1">I'm your AI booking assistant. How can I help you find the perfect room today?</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-sitenest-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-sitenest-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-sitenest-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}

            {messages.map(renderRichMessage)}
            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Chat Input */}
          <div className="p-3 sm:p-4 border-t bg-white">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isVoiceMode ? "Speak or type your message..." : "Type your message..."}
                  className="text-sm pr-10 border-sitenest-secondary focus:border-sitenest-primary transition-colors"
                  disabled={isLoading || isListening}
                />
                {isVoiceMode && (
                  <Button
                    onClick={handleVoiceInput}
                    variant="ghost"
                    size="sm"
                    className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-1 ${isListening ? 'text-red-500 animate-pulse' : 'text-sitenest-primary'}`}
                    disabled={isLoading}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-sitenest-primary to-sitenest-secondary hover:from-sitenest-secondary hover:to-sitenest-primary text-white p-2 transition-all duration-300 transform hover:scale-105"
                disabled={isLoading || !inputValue.trim() || isListening}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
              </Button>
            </div>

            {/* Character count and status */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>{inputValue.length}/500</span>
              {isListening && (
                <span className="text-red-500 animate-pulse">🎤 Listening...</span>
              )}
              {conversationContext.lastMessageType && (
                <span className="text-sitenest-primary">Context: {conversationContext.lastMessageType}</span>
              )}
            </div>
          </div>

          {/* Enhanced Dynamic Quick Actions */}
          {!isLoading && quickActions.length > 0 && (
            <div className="p-3 sm:p-4 border-t bg-gradient-to-r from-sitenest-background to-gray-50 rounded-b-xl">
              <div className="text-xs text-sitenest-text mb-2 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Quick actions:</span>
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1 border-sitenest-primary text-sitenest-primary hover:bg-sitenest-primary hover:text-white transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                  >
                    {getQuickActionLabel(action)}
                  </Button>
                ))}

                {/* Always show voice mode toggle */}
                <Button
                  onClick={() => handleQuickAction('voice_mode')}
                  variant="outline"
                  size="sm"
                  className={`text-xs px-2 py-1 transition-all duration-300 transform hover:scale-105 ${
                    isVoiceMode
                      ? 'bg-sitenest-primary text-white border-sitenest-primary'
                      : 'border-sitenest-primary text-sitenest-primary hover:bg-sitenest-primary hover:text-white'
                  }`}
                >
                  {getQuickActionLabel('voice_mode')}
                </Button>
              </div>

              {/* Conversation stats */}
              <div className="mt-2 text-xs text-gray-400 flex justify-between items-center">
                <span>{messages.filter(m => !m.isUser).length} responses • {messages.filter(m => m.isUser).length} messages</span>
                {userSatisfaction && (
                  <span className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span>Rated {userSatisfaction}/5</span>
                  </span>
                )}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
