import OpenAI from 'openai';
import { ChatbotAvailabilityService } from './chatbot-availability-service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
});

// SiteNest business context and policies
const SITENEST_CONTEXT = `
You are a booking assistant for SiteNest, a premium short-term rental service located in Bahria Enclave, Islamabad, Pakistan.

BUSINESS INFORMATION:
- Location: Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad
- WhatsApp/Contact: 0311-5197087
- Payment: Easypaisa to 0311-5197087
- Confirmation amount: PKR 500-2000
- Currency: Pakistani Rupees (PKR)

YOUR PRIMARY ROLE:
- IMMEDIATELY direct ALL customers to WhatsApp contact (0311-5197087) for ANY booking inquiry
- NEVER collect personal information (name, phone, CNIC, dates, etc.)
- Guide customers through the payment confirmation process
- Explain that our team on WhatsApp will handle all booking details
- Filter out non-serious customers politely

CRITICAL RULES:
- NEVER ask for personal information like name, phone, CNIC, dates, room preferences
- ALWAYS respond to booking inquiries with: "For room availability and bookings, please contact us directly on WhatsApp at 0311-5197087"
- DO NOT engage in data collection conversations
- ONLY provide general information about location, payment process, and contact details
- If asked about unrelated topics, politely redirect to booking assistance

BOOKING PROCESS:
1. For ANY booking inquiry → Direct to WhatsApp immediately
2. Explain: "Our team on WhatsApp will check availability and help with your booking"
3. Mention payment confirmation process (PKR 500-2000 via EasyPaisa)
4. Provide WhatsApp number: 0311-5197087

EXAMPLE RESPONSES:
- Availability inquiry: "For room availability, please contact us directly on WhatsApp at 0311-5197087. Our team will check real-time availability for your preferred dates."
- Booking request: "Great! Please contact us on WhatsApp at 0311-5197087 to proceed with your booking. Our team will assist you with room selection and availability."
- Any personal data request: "I don't collect personal information. Please contact our team directly on WhatsApp at 0311-5197087 for all booking assistance."

RESPONSE STYLE:
- Friendly but professional
- Use Pakistani context (PKR, local references)
- Keep responses concise but helpful
- Always direct to WhatsApp for booking matters
- Focus on WhatsApp contact and payment confirmation
- Show enthusiasm for helping with bookings
`;

interface ConversationContext {
  sessionId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: Date;
  }>;
  currentStep: string;
  isBookingFlow: boolean;
}

// Store conversation contexts in memory (in production, use Redis or database)
const conversationContexts = new Map<string, ConversationContext>();

export class AIService {

  static async generateResponse(
    sessionId: string,
    userMessage: string,
    availabilityData?: any,
    bookingData?: any
  ): Promise<{
    response: string;
    quickActions?: string[];
  }> {
    try {
      // Get or create conversation context
      let context = conversationContexts.get(sessionId);
      if (!context) {
        context = {
          sessionId,
          messages: [{ role: 'system', content: SITENEST_CONTEXT }],
          currentStep: 'greeting',
          isBookingFlow: !!bookingData
        };
        conversationContexts.set(sessionId, context);
      }

      // Handle unavailability flow initialization
      if (bookingData && bookingData.isUnavailable && userMessage.includes("not available")) {
        const checkInDate = new Date(bookingData.checkIn).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        const checkOutDate = new Date(bookingData.checkOut).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        // Check for alternative rooms
        const availabilityService = new (await import('./chatbot-availability-service')).ChatbotAvailabilityService();
        const availabilityResult = await availabilityService.checkAvailability({
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          roomNumber: bookingData.roomId
        });

        if (availabilityResult.alternatives && availabilityResult.alternatives.length > 0) {
          const response = `I'm sorry, Room ${bookingData.roomId} is not available from ${checkInDate} to ${checkOutDate}. However, I found these other available options for you:`;
          
          context.messages.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
          });

          return {
            response,
            quickActions: ['open_whatsapp', 'check_other_dates', 'contact_support'],
            type: 'availability_carousel',
            data: {
              type: 'availability_carousel',
              apartments: availabilityResult.alternatives.map(room => ({
                ...room,
                apartmentId: room.id || room.apartmentId,
                roomNumber: room.roomNumber,
                title: room.title,
                price: room.price,
                bedrooms: room.bedrooms,
                imageUrl: room.imageUrl,
                description: room.description
              }))
            }
          };
        } else {
          const response = `I'm sorry, Room ${bookingData.roomId} is not available from ${checkInDate} to ${checkOutDate}, and we don't have any alternative rooms available for those dates. Please try different dates or contact our support team at 0311-5197087 for more options.`;
          
          context.messages.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
          });

          return {
            response,
            quickActions: ['check_other_dates', 'open_whatsapp', 'contact_support']
          };
        }
      }

      // Handle booking flow initialization
      if (bookingData && userMessage === "Starting booking process") {
        const checkInDate = new Date(bookingData.checkIn).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        const checkOutDate = new Date(bookingData.checkOut).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        const response = `Hello ${bookingData.user.firstName || 'there'}! 👋 I see you want to book Room ${bookingData.roomId} from ${checkInDate} to ${checkOutDate}.

To complete your booking, please contact us directly on WhatsApp at 0311-5197087. Our team will:

✅ Confirm room availability for your dates
✅ Guide you through the payment process (PKR 500-2000 advance via EasyPaisa)
✅ Send you booking confirmation

Ready to proceed?`;

        context.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });

        return {
          response,
          quickActions: ['open_whatsapp', 'payment_info', 'contact_info']
        };
      }

      // Add user message to context
      context.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Check for availability queries first
      const availabilityResult = await this.handleAvailabilityQuery(userMessage, availabilityData);
      if (availabilityResult) {
        context.messages.push({
          role: 'assistant',
          content: availabilityResult.response,
          timestamp: new Date()
        });
        return availabilityResult;
      }

      // Check if this is a business-related query
      const isBusinessRelated = await this.isBusinessRelatedQuery(userMessage);

      if (!isBusinessRelated) {
        const redirectResponse = "I'm your booking assistant for SiteNest. I can only help with room bookings, availability, and related questions. Would you like to contact us on WhatsApp for booking assistance?";
        context.messages.push({
          role: 'assistant',
          content: redirectResponse,
          timestamp: new Date()
        });
        return {
          response: redirectResponse,
          quickActions: ['contact_whatsapp', 'check_availability', 'pricing']
        };
      }

      let aiResponse: string;

      // Try OpenAI first, fallback to rule-based system
      try {
        // Build enhanced prompt with context
        let enhancedPrompt = this.buildEnhancedPrompt(context, availabilityData, bookingData);

        // Generate AI response
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: 'system', content: enhancedPrompt },
            ...context.messages.slice(-10) // Keep last 10 messages for context
          ],
          max_tokens: 300,
          temperature: 0.7,
        });

        aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Could you please try again?";
      } catch (openaiError: any) {
        console.warn('OpenAI unavailable, using fallback system:', openaiError.code || openaiError.message);
        // Use intelligent fallback system
        const fallbackResult = this.generateFallbackResponse(context, userMessage, availabilityData, bookingData);
        aiResponse = fallbackResult.response;
        if (fallbackResult.quickActions) {
          return {
            response: aiResponse,
            quickActions: fallbackResult.quickActions
          };
        }
      }

      // Add AI response to context
      context.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });

      // Determine quick actions based on response content
      const quickActions = this.determineQuickActions(aiResponse);

      // Update conversation context
      conversationContexts.set(sessionId, context);

      return {
        response: aiResponse,
        quickActions
      };

    } catch (error) {
      // Note: We can't import log here due to circular dependency, so we'll use console.error
      // This should be the only remaining console.error in the codebase for this specific case
      console.error('AI Service Error:', error);
      return {
        response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or contact us directly at 0311-5197087.",
        quickActions: ['open_whatsapp', 'contact_info', 'pricing']
      };
    }
  }

  private static async isBusinessRelatedQuery(message: string): Promise<boolean> {
    const businessKeywords = [
      'book', 'booking', 'room', 'availability', 'check-in', 'checkout', 'price', 'cost',
      'reserve', 'reservation', 'stay', 'night', 'hotel', 'apartment', 'sitenest',
      'payment', 'confirm', 'whatsapp', 'easypaisa', 'cnic', 'phone', 'dates',
      'location', 'address', 'where', 'contact', 'pay', 'rate', 'rates', 'pricing',
      'located', 'place', 'islamabad', 'spend', 'looking for', 'available on'
    ];

    const lowerMessage = message.toLowerCase();

    // Check for business keywords
    const hasBusinessKeyword = businessKeywords.some(keyword => lowerMessage.includes(keyword));

    // Check for room numbers
    const hasRoomNumber = /\b(714|503|301|901|205|802)\b/.test(lowerMessage);

    // Check for phone numbers or CNIC patterns
    const hasPhoneOrCnic = /\d{4}-\d{7}-\d|\d{10,11}/.test(message);

    // Check for greetings or short responses (likely part of conversation)
    const isGreetingOrShort = lowerMessage.match(/^(hi|hello|hey|yes|no|ok|thanks)/) || message.length < 15;

    // Check for obvious non-business queries
    const nonBusinessPatterns = [
      /weather/, /joke/, /story/, /news/, /politics/, /sports/, /movie/, /music/,
      /recipe/, /game/, /math/, /science/, /history/, /geography/
    ];
    const isNonBusiness = nonBusinessPatterns.some(pattern => pattern.test(lowerMessage));

    // If it's clearly non-business, reject it
    if (isNonBusiness) return false;

    // If it has business keywords, room numbers, or contact info, accept it
    if (hasBusinessKeyword || hasRoomNumber || hasPhoneOrCnic) return true;

    // For greetings and short responses, accept them (part of conversation flow)
    if (isGreetingOrShort) return true;

    // For anything else that might be part of a booking conversation, be permissive
    return true;
  }

  private static determineQuickActions(response: string): string[] {
    const lowerResponse = response.toLowerCase();

    // Default quick actions for most responses
    let actions = ['open_whatsapp', 'check_availability', 'pricing'];

    // Greeting responses - provide main action buttons
    if (lowerResponse.includes('hello') || lowerResponse.includes('welcome') || lowerResponse.includes('assist')) {
      actions = ['open_whatsapp', 'check_availability', 'pricing'];
    }
    // Availability/booking responses - prioritize WhatsApp
    else if (lowerResponse.includes('available') || lowerResponse.includes('room') || lowerResponse.includes('booking') || lowerResponse.includes('book')) {
      actions = ['open_whatsapp', 'contact_info', 'payment_info'];
    }
    // WhatsApp/contact responses
    else if (lowerResponse.includes('whatsapp') || lowerResponse.includes('contact')) {
      actions = ['open_whatsapp', 'payment_info', 'location'];
    }
    // Payment responses
    else if (lowerResponse.includes('payment') || lowerResponse.includes('easypaisa')) {
      actions = ['open_whatsapp', 'payment_steps', 'contact_info'];
    }
    // Pricing responses
    else if (lowerResponse.includes('price') || lowerResponse.includes('cost')) {
      actions = ['open_whatsapp', 'contact_info', 'location'];
    }

    return actions;
  }

  private static buildEnhancedPrompt(context: ConversationContext, availabilityData?: any, bookingData?: any): string {
    let prompt = SITENEST_CONTEXT;

    if (availabilityData) {
      prompt += `\n\nAVAILABILITY DATA:\n${JSON.stringify(availabilityData, null, 2)}`;
    }

    if (bookingData) {
      prompt += `\n\nBOOKING REQUEST:\n${JSON.stringify(bookingData, null, 2)}`;
    }

    prompt += `\n\nCRITICAL INSTRUCTIONS:
- NEVER ask for personal information (name, phone, CNIC, dates, room numbers, etc.)
- IMMEDIATELY direct ALL booking inquiries to WhatsApp: 0311-5197087
- Say: "Our team on WhatsApp will handle all booking details"
- Focus on payment confirmation process (PKR 500-2000 via EasyPaisa)
- Keep responses under 100 words
- Use Pakistani context and PKR currency
- Be enthusiastic about helping with bookings
- Always provide relevant quick action buttons for customer responses
- If customer asks for availability/booking → Direct to WhatsApp immediately`;

    return prompt;
  }



  static getConversationContext(sessionId: string): ConversationContext | undefined {
    return conversationContexts.get(sessionId);
  }

  static clearConversationContext(sessionId: string): void {
    conversationContexts.delete(sessionId);
  }

  /**
   * Handle availability queries with real-time calendar integration
   */
  private static async handleAvailabilityQuery(userMessage: string, availabilityData?: any): Promise<any> {
    const lowerMessage = userMessage.toLowerCase();

    // Check for availability-related keywords
    const availabilityKeywords = [
      'available', 'availability', 'check availability', 'room available',
      'free', 'vacant', 'book', 'reserve', 'dates', 'check-in', 'checkout'
    ];

    const hasAvailabilityKeyword = availabilityKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Enhanced date extraction - handle natural language dates
    const dates = this.extractDatesFromMessage(userMessage);

    // Extract room numbers
    const roomPattern = /\b(room\s*)?(\d{3})\b/gi;
    const roomMatches = userMessage.match(roomPattern);
    const roomNumber = roomMatches ? roomMatches[0].replace(/\D/g, '') : undefined;

    // Extract guest count
    const guestPattern = /\b(\d+)\s*(guest|person|people)\b/i;
    const guestMatch = userMessage.match(guestPattern);
    const guestCount = guestMatch ? parseInt(guestMatch[1]) : undefined;

    if (hasAvailabilityKeyword || dates || roomNumber || availabilityData) {
      try {
        let checkIn: string | undefined;
        let checkOut: string | undefined;

        // Parse dates if found
        if (dates && dates.length >= 2) {
          checkIn = this.parseDate(dates[0]);
          checkOut = this.parseDate(dates[1]);
        } else if (dates && dates.length === 1) {
          checkIn = this.parseDate(dates[0]);
          // Default to 1 night stay
          const checkInDate = new Date(checkIn);
          checkInDate.setDate(checkInDate.getDate() + 1);
          checkOut = checkInDate.toISOString().split('T')[0];
        }

        // Use provided availability data if available
        if (availabilityData) {
          checkIn = availabilityData.checkIn || checkIn;
          checkOut = availabilityData.checkOut || checkOut;
        }

        const availabilityRequest = {
          checkIn,
          checkOut,
          roomNumber,
          guestCount
        };

        const result = await ChatbotAvailabilityService.checkAvailability(availabilityRequest);

        return {
          response: result.message,
          quickActions: result.quickActions,
          type: result.type,
          data: result.data
        };
      } catch (error) {
        console.error('Error handling availability query:', error);
        return {
          response: "I'm having trouble checking availability right now. Please contact us directly at 0311-5197087 for immediate assistance.",
          quickActions: ['open_whatsapp', 'contact_support']
        };
      }
    }

    return null; // Not an availability query
  }

  /**
   * Enhanced date extraction from natural language
   */
  private static extractDatesFromMessage(message: string): string[] {
    const dates: string[] = [];
    const lowerMessage = message.toLowerCase();
    const currentYear = new Date().getFullYear();

    // Standard date patterns
    const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})\b/g;
    const standardDates = message.match(datePattern);
    if (standardDates) {
      dates.push(...standardDates);
    }

    // Month names with day patterns (e.g., "June 12", "12 June", "12th June")
    const monthNames = {
      'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
      'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6,
      'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9,
      'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
    };

    // Pattern: "June 12", "12 June", "12th June"
    for (const [monthName, monthNum] of Object.entries(monthNames)) {
      const patterns = [
        new RegExp(`\\b${monthName}\\s+(\\d{1,2})(st|nd|rd|th)?\\b`, 'gi'),
        new RegExp(`\\b(\\d{1,2})(st|nd|rd|th)?\\s+${monthName}\\b`, 'gi')
      ];

      for (const pattern of patterns) {
        const matches = lowerMessage.match(pattern);
        if (matches) {
          for (const match of matches) {
            const dayMatch = match.match(/\d{1,2}/);
            if (dayMatch) {
              const day = parseInt(dayMatch[0]);
              if (day >= 1 && day <= 31) {
                const dateStr = `${currentYear}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                dates.push(dateStr);
              }
            }
          }
        }
      }
    }

    return dates;
  }

  /**
   * Parse date string to YYYY-MM-DD format
   */
  private static parseDate(dateStr: string): string {
    try {
      // Handle different date formats
      let date: Date;

      if (dateStr.includes('/')) {
        // MM/DD/YYYY or DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          // Assume MM/DD/YYYY for now
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else {
          date = new Date(dateStr);
        }
      } else if (dateStr.includes('-')) {
        // YYYY-MM-DD or DD-MM-YYYY format
        if (dateStr.length === 10 && dateStr.charAt(4) === '-') {
          // Already in YYYY-MM-DD format
          return dateStr;
        } else {
          // DD-MM-YYYY format
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
            date = new Date(dateStr);
          }
        }
      } else {
        date = new Date(dateStr);
      }

      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return new Date().toISOString().split('T')[0]; // Return today as fallback
    }
  }

  // Intelligent fallback system when OpenAI is unavailable
  private static generateFallbackResponse(context: ConversationContext, userMessage: string, availabilityData?: any, bookingData?: any): { response: string; quickActions?: string[] } {
    const lowerMessage = userMessage.toLowerCase();

    // Handle availability data responses
    if (availabilityData) {
      if (availabilityData.available) {
        return {
          response: `Great news! The room is available for your dates. To confirm your booking, please contact us on WhatsApp at 0311-5197087 and send a confirmation amount between PKR 500-2000 via Easypaisa. Then share the payment screenshot on WhatsApp for booking confirmation.`,
          quickActions: ['open_whatsapp', 'payment_info', 'contact_info']
        };
      } else if (availabilityData.alternatives && availabilityData.alternatives.length > 0) {
        const alternatives = availabilityData.alternatives.slice(0, 3).map((room: any) =>
          `Room ${room.roomNumber} - ${room.title} (PKR ${room.price}/night)`
        ).join(', ');
        return {
          response: `Sorry, that room is not available for your dates. However, I found these alternatives: ${alternatives}. Please contact us on WhatsApp at 0311-5197087 to book any of these rooms.`,
          quickActions: ['open_whatsapp', 'contact_info', 'pricing']
        };
      } else {
        return {
          response: `Unfortunately, no rooms are available for your selected dates. Please contact us at 0311-5197087 on WhatsApp for more options or different dates.`,
          quickActions: ['open_whatsapp', 'contact_info', 'check_availability']
        };
      }
    }

    // Handle booking flow with conversation
    if (bookingData) {
      return {
        response: `Hello! I'm SiteNest VA chatbot. I see you want to book Room ${bookingData.roomId} from ${new Date(bookingData.checkIn).toLocaleDateString()} to ${new Date(bookingData.checkOut).toLocaleDateString()}.

How many people will be staying?`,
        quickActions: ['1_person', '2_people', '3_people', '4_people', 'more_than_4']
      };
    }



    // Handle guest count responses - START BOOKING FLOW
    if (lowerMessage.includes('_guest') || lowerMessage.includes('_person') || lowerMessage.includes('_people') ||
        /^\d+\s*(guest|person|people)?\s*$/i.test(lowerMessage.trim()) ||
        /\b(\d+)\s*(guest|person|people)\b/i.test(lowerMessage)) {

      // Extract guest count
      const guestMatch = lowerMessage.match(/(\d+)/) || lowerMessage.match(/(\d+)\s*(guest|person|people)/i);
      const guestCount = guestMatch ? parseInt(guestMatch[1]) : null;

      if (guestCount && guestCount > 0 && guestCount <= 10) {
        return {
          response: `Perfect! ${guestCount} guest${guestCount > 1 ? 's' : ''} noted. Do you need parking space for your vehicle during your stay?`,
          quickActions: ['yes_parking', 'no_parking', 'not_sure']
        };
      } else {
        return {
          response: "How many guests will be staying? Please let me know the number of people.",
          quickActions: ['1_person', '2_people', '3_people', '4_people']
        };
      }
    }

    // Handle parking responses
    if (lowerMessage.includes('yes_parking') || lowerMessage.includes('no_parking') ||
        (lowerMessage.includes('parking') && (lowerMessage.includes('yes') || lowerMessage.includes('no')))) {
      const needsParking = lowerMessage.includes('yes') || lowerMessage.includes('yes_parking');
      const parkingText = needsParking ? "Great! Parking space noted." : "No parking needed, understood.";

      return {
        response: `${parkingText} Would you like us to arrange any refreshments or welcome amenities for your arrival? This service comes with an additional cost.`,
        quickActions: ['yes_refreshments', 'no_refreshments', 'tell_me_more']
      };
    }

    // Handle refreshments responses
    if (lowerMessage.includes('yes_refreshments') || lowerMessage.includes('no_refreshments') ||
        (lowerMessage.includes('refreshments') && (lowerMessage.includes('yes') || lowerMessage.includes('no')))) {
      const needsRefreshments = lowerMessage.includes('yes') || lowerMessage.includes('yes_refreshments');

      if (needsRefreshments) {
        return {
          response: `Excellent! Refreshments will be arranged for your arrival. The cost will be PKR 500-1000 depending on your preferences. Are you comfortable with this additional cost?`,
          quickActions: ['will_do_payment', 'no_refreshments', 'tell_me_more']
        };
      } else {
        return {
          response: `No refreshments needed, understood. Do you have any other special requests or requirements for your stay?`,
          quickActions: ['no_requests', 'early_checkin', 'late_checkout', 'extra_amenities']
        };
      }
    }

    // Handle final booking step - show payment details
    if (lowerMessage.includes('will_do_payment') || lowerMessage.includes('no_requests') ||
        lowerMessage.includes('early_checkin') || lowerMessage.includes('late_checkout') ||
        lowerMessage.includes('extra_amenities') || lowerMessage.includes('special_requests')) {
      return {
        response: `Perfect! I have all your requirements noted. To secure your booking, please send an advance payment:\n\n💳 **Payment Details:**\n• Account Title: Abdullah Sultan\n• Bank: EasyPaisa\n• Account Number: 0311-5197087\n• Amount: PKR 500-2000\n\nOnce you've made the payment, please take a screenshot and we'll provide you with our WhatsApp contact for confirmation.`,
        quickActions: ['payment_done', 'payment_questions', 'need_help']
      };
    }

    // Handle payment completion - show WhatsApp
    if (lowerMessage.includes('payment_done') || lowerMessage.includes('done_payment') ||
        lowerMessage.includes('paid') || lowerMessage.includes('sent payment')) {
      return {
        response: `Excellent! Thank you for the payment. Please share your payment screenshot on WhatsApp for verification:\n\n📱 **WhatsApp: 0311-5197087**\n\nOur team will verify your payment and confirm your booking within a few hours. You'll receive check-in details and any additional instructions via WhatsApp.`,
        quickActions: ['open_whatsapp', 'more_questions', 'booking_confirmed']
      };
    }

    // Handle booking procedure questions
    if (lowerMessage.includes('procedure') || lowerMessage.includes('process') ||
        lowerMessage.includes('steps') || lowerMessage.includes('how to book') ||
        lowerMessage.includes('booking process') || lowerMessage.includes('what_procedure')) {
      return {
        response: `📋 **SiteNest Booking Procedure:**

**Step 1:** Browse & Select Room
• View available apartments
• Choose your preferred room
• Check amenities and pricing

**Step 2:** Submit Booking Request
• Select check-in/check-out dates
• Fill booking form
• Submit request

**Step 3:** Qualification Questions
• Number of guests
• Parking requirements
• Refreshment preferences
• Special requests

**Step 4:** Advance Payment
• Send PKR 500-2000 via EasyPaisa
• Account: Abdullah Sultan (0311-5197087)
• Take payment screenshot

**Step 5:** WhatsApp Confirmation
• Share screenshot on WhatsApp: 0311-5197087
• Get booking confirmation
• Receive check-in details

Ready to start your booking?`,
        quickActions: ['check_availability', 'book_now', 'open_whatsapp', 'pricing']
      };
    }

    if (lowerMessage.includes('no_pay_first') || lowerMessage.includes("don't want to pay")) {
      return {
        response: "I understand your concern. However, advance payment is required to secure your booking and prevent no-shows. This is a standard practice in hospitality. The amount is adjustable against your final bill. Would you like to know the procedure?",
        quickActions: ['what_procedure', 'why_necessary', 'contact_support']
      };
    }

    if (lowerMessage.includes('why_necessary') || lowerMessage.includes('why is it necessary')) {
      return {
        response: "Advance payment is necessary because:\n\n• It secures your booking\n• Prevents room from being given to others\n• Reduces no-shows\n• Standard hospitality practice\n• Amount is adjustable in final bill\n\nWould you like to proceed with the payment?",
        quickActions: ['what_procedure', 'done_payment', 'will_do_payment']
      };
    }

    // Handle payment completion
    if (lowerMessage.includes('done_payment') || lowerMessage.includes('payment done')) {
      return {
        response: "Excellent! Please share the payment screenshot on WhatsApp: 0311-5197087\n\nOur team will verify and confirm your booking within a few hours. Thank you for choosing SiteNest!",
        quickActions: ['open_whatsapp', 'contact_info']
      };
    }

    if (lowerMessage.includes('will_do_payment') || lowerMessage.includes('will do it')) {
      return {
        response: "Perfect! Please send the advance payment to:\n\nEasyPaisa: 0311-5197087\nAmount: PKR 500-2000\n\nThen share screenshot on WhatsApp: 0311-5197087",
        quickActions: ['done_payment', 'open_whatsapp', 'contact_info']
      };
    }

    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.trim() === 'hello' || lowerMessage.includes('aaa hello')) {
      return {
        response: "Hello! Welcome to SiteNest! 🏠 I'm your booking assistant. I can help you with room availability, pricing, and bookings. For immediate assistance, contact us on WhatsApp at 0311-5197087. How can I assist you today?",
        quickActions: ['open_whatsapp', 'check_availability', 'pricing']
      };
    }

    // First message fallback
    if (context.messages.length <= 2) {
      return {
        response: "Hello! Welcome to SiteNest! 🏠 I'm your booking assistant. I can help you with room availability, pricing, and bookings. For immediate assistance, contact us on WhatsApp at 0311-5197087. How can I assist you today?",
        quickActions: ['open_whatsapp', 'check_availability', 'pricing']
      };
    }

    // Enhanced location handling
    if (lowerMessage.includes('location') || lowerMessage.includes('address') || lowerMessage.includes('where') ||
        lowerMessage.includes('located') || lowerMessage.includes('where are you')) {
      return {
        response: "🏢 SiteNest is located at:\n\n📍 Cube Apartments Tower 2\nBahria Enclave Sector A\nIslamabad, Pakistan\n\nWe're in a premium location with easy access to the city's main attractions. Contact us on WhatsApp at 0311-5197087 for bookings!",
        quickActions: ['open_whatsapp', 'contact_info', 'check_availability']
      };
    }

    // Booking intent
    if (lowerMessage.includes('book') || lowerMessage.includes('reserve') || lowerMessage.includes('room')) {
      return {
        response: "Great! For all booking inquiries, please contact us directly on WhatsApp at 0311-5197087. Our team will handle room selection, availability checking, and guide you through the payment confirmation process (PKR 500-2000 via Easypaisa). No need to share details here!",
        quickActions: ['open_whatsapp', 'payment_info', 'contact_info']
      };
    }

    // Enhanced availability check with date extraction
    if (lowerMessage.includes('available') || lowerMessage.includes('availability') || lowerMessage.includes('check')) {
      // Try to extract dates from the message
      const extractedDates = this.extractDatesFromMessage(userMessage);

      if (extractedDates.length > 0) {
        const dateStr = new Date(extractedDates[0]).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        return {
          response: `I'd be happy to help you check availability for ${dateStr}! For real-time room availability and booking, please contact us directly on WhatsApp at 0311-5197087. Our team will check all available rooms for your preferred date and assist with immediate booking.`,
          quickActions: ['open_whatsapp', 'contact_info', 'pricing']
        };
      } else {
        return {
          response: "For room availability, please contact us directly on WhatsApp at 0311-5197087. Our team will check real-time availability for your preferred dates and room type. No need to share personal details here - our WhatsApp team will handle everything!",
          quickActions: ['open_whatsapp', 'contact_info', 'pricing']
        };
      }
    }

    // Pricing questions
    if (lowerMessage.includes('price') || lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('rate') || lowerMessage.includes('pricing options')) {
      return {
        response: "Our room rates vary by type and season, generally ranging from PKR 15,000 to PKR 35,000 per night. For current pricing and any available discounts, please contact us on WhatsApp at 0311-5197087.",
        quickActions: ['open_whatsapp', 'contact_info', 'check_availability']
      };
    }

    // Contact information - only share WhatsApp if customer seems serious
    if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('whatsapp')) {
      // Check if customer has shown booking intent or provided details
      const hasBookingIntent = lowerMessage.includes('book') || lowerMessage.includes('reserve') ||
                              lowerMessage.includes('stay') || lowerMessage.includes('room') ||
                              availabilityData || bookingData;

      if (hasBookingIntent) {
        return {
          response: "You can reach us at:\n📞 Phone/WhatsApp: 0311-5197087\n📍 Location: Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad\n💳 Payments: Easypaisa to 0311-5197087\n\nContact us on WhatsApp for immediate booking assistance!",
          quickActions: ['open_whatsapp', 'location', 'payment_info']
        };
      } else {
        return {
          response: "I'd be happy to help you! Let me first understand what you're looking for. Are you interested in booking a room, checking availability, or learning about our services?",
          quickActions: ['check_availability', 'pricing', 'location']
        };
      }
    }

    // Payment questions
    if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('easypaisa')) {
      return {
        response: "💳 **Payment Details:**\n• Account Title: Abdullah Sultan\n• Bank: EasyPaisa\n• Account Number: 0311-5197087\n• Amount: PKR 500-2000\n\nAfter payment, please take a screenshot and contact us on WhatsApp to send it for booking confirmation!",
        quickActions: ['open_whatsapp', 'payment_steps', 'contact_info']
      };
    }

    // Location questions
    if (lowerMessage.includes('location') || lowerMessage.includes('address') || lowerMessage.includes('where')) {
      return {
        response: "SiteNest is located at Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad. We're in a premium location with easy access to the city's main attractions. Contact us on WhatsApp at 0311-5197087 for bookings!",
        quickActions: ['open_whatsapp', 'contact_info', 'check_availability']
      };
    }

    // Default helpful response
    return {
      response: "I'm here to help you with room bookings at SiteNest. For all booking inquiries, availability checks, and reservations, please contact us directly on WhatsApp at 0311-5197087. Our team will assist you with the complete booking process!",
      quickActions: ['open_whatsapp', 'check_availability', 'pricing']
    };
  }
}
