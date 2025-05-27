import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [chatData, setChatData] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatFlow = [
    "Hello! I'm here to help you with your booking. May I have your name?",
    "Nice to meet you! Could you please provide your phone number?",
    "Great! Now I need your CNIC number for verification.",
    "Perfect! Let me send you a 6-digit PIN for verification. Please check your phone.",
    "Please enter the 6-digit PIN you received:",
    "Thank you! Which room are you interested in? (e.g., Room 714)",
    "Let me check availability for that room...",
    "Great news! The room is available. Would you like to proceed with booking?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for chatbot toggle events
    const handleOpenChatbot = () => {
      setIsOpen(true);
      if (messages.length === 0) {
        initializeChat();
      }
    };

    window.addEventListener('openChatbot', handleOpenChatbot);
    return () => window.removeEventListener('openChatbot', handleOpenChatbot);
  }, [messages.length]);

  const initializeChat = async () => {
    try {
      const response = await apiRequest("POST", "/api/chat/session");
      const session = await response.json();
      setSessionId(session.sessionId);
      
      addMessage(chatFlow[0], false);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addMessage(userMessage, true);
    setInputValue("");

    // Process user input based on current step
    await processUserInput(userMessage);
  };

  const processUserInput = async (input: string) => {
    let nextStep = currentStep + 1;
    let updatedData = { ...chatData };

    switch (currentStep) {
      case 0: // Name
        updatedData.name = input;
        break;
      case 1: // Phone
        updatedData.phone = input;
        break;
      case 2: // CNIC
        updatedData.cnic = input;
        // Create customer and send PIN
        try {
          const customerResponse = await apiRequest("POST", "/api/customers", updatedData);
          const customer = await customerResponse.json();
          updatedData.customerId = customer.id;
          
          // Send PIN
          await apiRequest("POST", `/api/customers/${customer.id}/send-pin`);
        } catch (error) {
          console.error("Failed to create customer:", error);
        }
        break;
      case 3: // PIN prompt - just show PIN input
        break;
      case 4: // PIN verification
        try {
          const verifyResponse = await apiRequest("POST", `/api/customers/${updatedData.customerId}/verify`, {
            pin: input
          });
          const result = await verifyResponse.json();
          
          if (!result.verified) {
            addMessage("Invalid PIN. Please try again.", false);
            nextStep = currentStep; // Stay on same step
            return;
          }
        } catch (error) {
          addMessage("Error verifying PIN. Please try again.", false);
          nextStep = currentStep;
          return;
        }
        break;
      case 5: // Room interest
        updatedData.roomInterest = input;
        // Check availability
        try {
          // For demo, we'll just simulate availability check
          setTimeout(() => {
            addMessage("Checking availability...", false);
            setTimeout(() => {
              addMessage(chatFlow[6], false);
              setTimeout(() => {
                addMessage(chatFlow[7], false);
              }, 1000);
            }, 1500);
          }, 500);
          return; // Don't proceed to next step immediately
        } catch (error) {
          console.error("Failed to check availability:", error);
        }
        return;
      case 6: // Availability check
        return;
      case 7: // Booking confirmation
        if (input.toLowerCase().includes('yes')) {
          addMessage("Excellent! I'll transfer you to our booking system to complete your reservation.", false);
          setTimeout(() => {
            const event = new CustomEvent('openBookingModal', { 
              detail: { roomId: updatedData.roomInterest }
            });
            window.dispatchEvent(event);
          }, 1000);
        } else {
          addMessage("No problem! Feel free to ask if you have any other questions.", false);
        }
        return;
    }

    setChatData(updatedData);
    setCurrentStep(nextStep);

    // Update session
    try {
      await apiRequest("PUT", `/api/chat/session/${sessionId}`, {
        currentStep: nextStep,
        data: updatedData
      });
    } catch (error) {
      console.error("Failed to update session:", error);
    }

    // Show next message
    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addMessage(chatFlow[nextStep], false);
      }, 1000);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'check_availability':
        setInputValue("I want to check room availability");
        break;
      case 'pricing':
        setInputValue("What are your pricing options?");
        break;
      case 'contact':
        setInputValue("I need to contact support");
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chatbot Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-bounce-subtle ${
          isOpen ? 'bg-gray-600 hover:bg-gray-700' : 'bg-brand-coral hover:bg-red-600'
        }`}
      >
        {isOpen ? <X className="text-2xl" /> : <MessageCircle className="text-2xl" />}
      </Button>
      
      {/* Chatbot Modal */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 bg-white rounded-xl shadow-2xl border border-gray-200">
          {/* Chat Header */}
          <div className="bg-brand-coral text-white p-4 rounded-t-xl flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Bot className="text-sm" />
              </div>
              <div>
                <h3 className="font-semibold">Side Nest Assistant</h3>
                <p className="text-xs opacity-90">Online now</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-200 hover:bg-white/10"
            >
              <X />
            </Button>
          </div>
          
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${message.isUser ? 'justify-end' : ''}`}
              >
                {message.isUser ? (
                  <>
                    <div className="bg-brand-coral text-white rounded-lg p-3 max-w-xs">
                      <p className="text-sm">{message.text}</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-gray-600 text-xs" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-brand-coral rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="text-white text-xs" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage} className="bg-brand-coral hover:bg-red-600">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-600 mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleQuickAction('check_availability')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Check Availability
              </Button>
              <Button
                onClick={() => handleQuickAction('pricing')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                View Pricing
              </Button>
              <Button
                onClick={() => handleQuickAction('contact')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
