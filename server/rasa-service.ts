/**
 * Rasa Service Integration for SiteNest
 * Handles communication between SiteNest backend and Rasa chatbot
 */

import fetch from 'node-fetch';
import { log } from './utils/logger';
import { ChatbotAvailabilityService } from './chatbot-availability-service';

interface RasaMessage {
  sender: string;
  message: string;
  metadata?: any;
}

interface RasaResponse {
  recipient_id: string;
  text?: string;
  buttons?: Array<{
    title: string;
    payload: string;
  }>;
  custom?: any;
}

interface ChatbotResponse {
  response: string;
  quickActions?: string[];
  type?: string;
  data?: any;
}

class RasaService {
  private rasaUrl: string;
  private actionServerUrl: string;

  constructor() {
    this.rasaUrl = process.env.RASA_SERVER_URL || 'http://localhost:5005';
    this.actionServerUrl = process.env.RASA_ACTION_SERVER_URL || 'http://localhost:5055';
  }

  /**
   * Send message to Rasa and get response
   */
  async sendMessage(
    sessionId: string,
    message: string,
    availabilityData?: any,
    bookingData?: any,
    affiliateCode?: string
  ): Promise<ChatbotResponse> {
    try {
      // Prepare metadata for context
      const metadata = {
        availabilityData,
        bookingData,
        affiliateCode,
        timestamp: new Date().toISOString()
      };

      const rasaMessage: RasaMessage = {
        sender: sessionId,
        message: message,
        metadata: metadata
      };

      log.info('Sending message to Rasa', { sessionId, message: message.substring(0, 100) });

      const response = await fetch(`${this.rasaUrl}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rasaMessage),
      });

      if (!response.ok) {
        throw new Error(`Rasa server responded with status: ${response.status}`);
      }

      const rasaResponses: RasaResponse[] = await response.json();

      // Process Rasa responses
      return await this.processRasaResponses(rasaResponses);

    } catch (error) {
      log.error('Rasa service error', error, { sessionId });

      // Fallback to basic response
      return await this.getFallbackResponse(message);
    }
  }

  /**
   * Process multiple Rasa responses into a single chatbot response
   */
  private async processRasaResponses(rasaResponses: RasaResponse[]): Promise<ChatbotResponse> {
    if (!rasaResponses || rasaResponses.length === 0) {
      return await this.getFallbackResponse();
    }

    // Combine all text responses
    const textResponses = rasaResponses
      .filter(r => r.text)
      .map(r => r.text)
      .join('\n\n');

    // Extract buttons and convert to quick actions
    const buttons = rasaResponses
      .filter(r => r.buttons)
      .flatMap(r => r.buttons || []);

    const quickActions = buttons.map(btn => btn.title.toLowerCase().replace(/\s+/g, '_'));

    // Check for custom data (visual components)
    const customResponse = rasaResponses.find(r => r.custom);
    
    if (customResponse?.custom) {
      return {
        response: textResponses || customResponse.custom.text || 'I can help you with that.',
        quickActions,
        type: customResponse.custom.type,
        data: customResponse.custom.data
      };
    }

    // Handle buttons as quick actions
    if (buttons.length > 0) {
      return {
        response: textResponses || 'Please choose an option:',
        quickActions,
        type: 'buttons',
        data: buttons
      };
    }

    return {
      response: textResponses || 'I understand. How can I help you further?',
      quickActions: this.getDefaultQuickActions()
    };
  }

  /**
   * Get fallback response when Rasa is unavailable
   */
  private async getFallbackResponse(message?: string): Promise<ChatbotResponse> {
    // Check for availability queries first
    if (message) {
      const availabilityResult = await this.handleAvailabilityQuery(message);
      if (availabilityResult) {
        return availabilityResult;
      }
    }

    // Analyze message for basic intent detection
    if (message) {
      const lowerMessage = message.toLowerCase();

      // Greeting responses
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.trim() === 'hello') {
        return {
          response: "Hello! Welcome to SiteNest! 🏠 I'm your booking assistant. I can help you with room availability, pricing, and bookings. For immediate assistance, contact us on WhatsApp at 0311-5197087.",
          quickActions: ['open_whatsapp', 'check_availability', 'pricing']
        };
      }

      if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
        return {
          response: "I'd be happy to help you with booking! For immediate assistance with room reservations, please contact us on WhatsApp at 0311-5197087.",
          quickActions: ['open_whatsapp', 'check_availability', 'contact_support']
        };
      }

      if (lowerMessage.includes('price') || lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('rate') || lowerMessage.includes('pricing options')) {
        return {
          response: "Our rooms range from PKR 15,000 to PKR 35,000 per night depending on the room type and season. For current pricing and any available discounts, please contact us at 0311-5197087.",
          quickActions: ['open_whatsapp', 'check_availability', 'contact_support']
        };
      }

      if (lowerMessage.includes('available') || lowerMessage.includes('availability') || lowerMessage.includes('vacancy') || lowerMessage.includes('check room') || lowerMessage.includes('check availability')) {
        return {
          response: "To check room availability for your dates, please contact us directly at 0311-5197087 for real-time information.",
          quickActions: ['open_whatsapp', 'contact_support']
        };
      }

      if (lowerMessage.includes('location') || lowerMessage.includes('address')) {
        return {
          response: "SiteNest is located at Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad. Contact: 0311-5197087",
          quickActions: ['open_whatsapp', 'contact_support']
        };
      }

      if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('whatsapp')) {
        return {
          response: "You can reach us at:\n📞 Phone/WhatsApp: 0311-5197087\n📍 Location: Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad\n💳 Payments: Easypaisa to 0311-5197087",
          quickActions: ['open_whatsapp', 'check_availability', 'pricing']
        };
      }

      if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('easypaisa')) {
        return {
          response: "For booking confirmation, please send PKR 500-2000 via Easypaisa to 0311-5197087, then share the payment screenshot on our WhatsApp. Contact us at 0311-5197087 to start the booking process!",
          quickActions: ['open_whatsapp', 'contact_support']
        };
      }
    }

    // Default greeting for first interaction
    return {
      response: "Hello! Welcome to SiteNest! 🏠 I'm your booking assistant. I can help you with room availability, pricing, and bookings. For immediate assistance, contact us on WhatsApp at 0311-5197087.",
      quickActions: ['open_whatsapp', 'check_availability', 'pricing']
    };
  }

  /**
   * Get default quick actions
   */
  private getDefaultQuickActions(): string[] {
    return ['check_availability', 'pricing', 'contact_support'];
  }

  /**
   * Handle availability queries with real-time calendar integration
   */
  private async handleAvailabilityQuery(message: string): Promise<ChatbotResponse | null> {
    const lowerMessage = message.toLowerCase();

    // Check for availability-related keywords
    const availabilityKeywords = [
      'available', 'availability', 'check availability', 'room available',
      'free', 'vacant', 'book', 'reserve', 'dates', 'check-in', 'checkout'
    ];

    const hasAvailabilityKeyword = availabilityKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Extract dates from message (basic pattern matching)
    const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})\b/g;
    const dates = message.match(datePattern);

    // Extract room numbers
    const roomPattern = /\b(room\s*)?(\d{3})\b/gi;
    const roomMatches = message.match(roomPattern);
    const roomNumber = roomMatches ? roomMatches[0].replace(/\D/g, '') : undefined;

    // Extract guest count
    const guestPattern = /\b(\d+)\s*(guest|person|people)\b/i;
    const guestMatch = message.match(guestPattern);
    const guestCount = guestMatch ? parseInt(guestMatch[1]) : undefined;

    if (hasAvailabilityKeyword || dates || roomNumber) {
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
        log.error('Error handling availability query in Rasa service:', error);
        return {
          response: "I'm having trouble checking availability right now. Please contact us directly at 0311-5197087 for immediate assistance.",
          quickActions: ['open_whatsapp', 'contact_support']
        };
      }
    }

    return null; // Not an availability query
  }

  /**
   * Parse date string to YYYY-MM-DD format
   */
  private parseDate(dateStr: string): string {
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
      log.error('Error parsing date:', dateStr, { error: error instanceof Error ? error.message : String(error) });
      return new Date().toISOString().split('T')[0]; // Return today as fallback
    }
  }

  /**
   * Create a new conversation session
   */
  async createSession(): Promise<string> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Initialize session with Rasa
      await fetch(`${this.rasaUrl}/conversations/${sessionId}/tracker/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'session_started',
          timestamp: Date.now() / 1000
        }),
      });

      log.info('Created new Rasa session', { sessionId });
      return sessionId;
      
    } catch (error) {
      log.error('Failed to create Rasa session', error);
      // Return a fallback session ID
      return `fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.rasaUrl}/conversations/${sessionId}/tracker`);
      
      if (!response.ok) {
        throw new Error(`Failed to get conversation history: ${response.status}`);
      }

      const tracker = await response.json();
      return tracker.events || [];
      
    } catch (error) {
      log.error('Failed to get conversation history', error, { sessionId });
      return [];
    }
  }

  /**
   * Check if Rasa server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.rasaUrl}/status`, {
        method: 'GET',
        timeout: 5000
      });
      
      return response.ok;
      
    } catch (error) {
      log.warn('Rasa health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Train Rasa model (for development)
   */
  async trainModel(): Promise<boolean> {
    try {
      log.info('Starting Rasa model training');
      
      const response = await fetch(`${this.rasaUrl}/model/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force_training: true
        }),
      });

      if (response.ok) {
        log.info('Rasa model training completed successfully');
        return true;
      } else {
        throw new Error(`Training failed with status: ${response.status}`);
      }
      
    } catch (error) {
      log.error('Rasa model training failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const rasaService = new RasaService();
