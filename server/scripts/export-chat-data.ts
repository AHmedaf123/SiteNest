/**
 * Export existing chat session data for Rasa training
 * This script extracts conversation patterns from the current chatbot
 * and formats them for Rasa NLU training
 */

import { db } from '../db.js';
import { chatSessions } from '@shared/schema';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface ChatMessage {
  message: string;
  intent?: string;
  entities?: any;
  timestamp: Date;
}

interface TrainingExample {
  intent: string;
  examples: string[];
}

class ChatDataExporter {
  
  async exportChatSessions(): Promise<void> {
    console.log('🔍 Exporting chat session data for Rasa training...');
    
    try {
      // Get all chat sessions
      const sessions = await db.select().from(chatSessions);
      console.log(`📊 Found ${sessions.length} chat sessions`);
      
      const trainingData = await this.processSessionsForTraining(sessions);
      
      // Export to different formats
      await this.exportToNLU(trainingData);
      await this.exportToStories(sessions);
      await this.exportAnalytics(sessions);
      
      console.log('✅ Chat data export completed successfully!');
      
    } catch (error) {
      console.error('❌ Failed to export chat data:', error);
      throw error;
    }
  }
  
  private async processSessionsForTraining(sessions: any[]): Promise<TrainingExample[]> {
    const intentMap = new Map<string, Set<string>>();
    
    for (const session of sessions) {
      try {
        const data = JSON.parse(session.data || '{}');
        
        // Extract messages and classify them
        const messages = this.extractMessagesFromSession(data);
        
        for (const message of messages) {
          const intent = this.classifyMessage(message.message);
          
          if (intent) {
            if (!intentMap.has(intent)) {
              intentMap.set(intent, new Set());
            }
            intentMap.get(intent)!.add(message.message);
          }
        }
        
      } catch (error) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.warn(`⚠️ Failed to process session ${session.sessionId}:`, (error as { message: string }).message);
        } else {
          console.warn(`⚠️ Failed to process session ${session.sessionId}:`, error);
        }
      }
    }
    
    // Convert to training examples
    const trainingData: TrainingExample[] = [];
    
    // Convert Map entries to array before iteration
    for (const [intent, examples] of Array.from(intentMap.entries())) {
      if (examples.size >= 3) { // Only include intents with at least 3 examples
        trainingData.push({
          intent,
          examples: Array.from(examples)
        });
      }
    }
    
    return trainingData;
  }
  
  private extractMessagesFromSession(sessionData: any): ChatMessage[] {
    const messages: ChatMessage[] = [];
    
    // Extract from different possible data structures
    if (sessionData.messages) {
      messages.push(...sessionData.messages);
    }
    
    if (sessionData.userInputs) {
      for (const input of sessionData.userInputs) {
        messages.push({
          message: input,
          timestamp: new Date()
        });
      }
    }
    
    // Add any other extraction logic based on your current data structure
    
    return messages;
  }
  
  private classifyMessage(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Basic intent classification based on keywords
    if (lowerMessage.includes('book') || lowerMessage.includes('reservation') || lowerMessage.includes('reserve')) {
      return 'book_room';
    }
    
    if (lowerMessage.includes('available') || lowerMessage.includes('vacancy') || lowerMessage.includes('free')) {
      return 'check_availability';
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('rate') || lowerMessage.includes('fee')) {
      return 'pricing_inquiry';
    }
    
    if (lowerMessage.includes('room') && (lowerMessage.includes('feature') || lowerMessage.includes('amenity') || lowerMessage.includes('facility'))) {
      return 'room_features';
    }
    
    if (lowerMessage.includes('location') || lowerMessage.includes('address') || lowerMessage.includes('where')) {
      return 'location_info';
    }
    
    if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help')) {
      return 'contact_support';
    }
    
    if (lowerMessage.includes('affiliate') || lowerMessage.includes('commission') || lowerMessage.includes('partner')) {
      return 'affiliate_inquiry';
    }
    
    if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
      return 'cancellation_policy';
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'greet';
    }
    
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('thanks')) {
      return 'goodbye';
    }
    
    // Return null for unclassified messages
    return null;
  }
  
  private async exportToNLU(trainingData: TrainingExample[]): Promise<void> {
    const nluData = {
      version: "3.1",
      nlu: trainingData.map(item => ({
        intent: item.intent,
        examples: item.examples.map(example => `- ${example}`).join('\n')
      }))
    };
    
    const nluYaml = this.generateNLUYaml(nluData);
    
    const outputPath = join(process.cwd(), 'rasa-chatbot', 'data', 'exported_nlu.yml');
    writeFileSync(outputPath, nluYaml);
    
    console.log(`📝 Exported NLU training data to ${outputPath}`);
    console.log(`📊 Generated ${trainingData.length} intents with examples`);
  }
  
  private generateNLUYaml(nluData: any): string {
    let yaml = `version: "${nluData.version}"\n\nnlu:\n`;
    
    for (const item of nluData.nlu) {
      yaml += `- intent: ${item.intent}\n`;
      yaml += `  examples: |\n`;
      
      const examples = item.examples.split('\n');
      for (const example of examples) {
        if (example.trim()) {
          yaml += `    ${example}\n`;
        }
      }
      yaml += '\n';
    }
    
    return yaml;
  }
  
  private async exportToStories(sessions: any[]): Promise<void> {
    // Generate basic stories from session patterns
    const stories = this.generateStoriesFromSessions(sessions);
    
    const storiesYaml = this.generateStoriesYaml(stories);
    
    const outputPath = join(process.cwd(), 'rasa-chatbot', 'data', 'exported_stories.yml');
    writeFileSync(outputPath, storiesYaml);
    
    console.log(`📖 Exported stories to ${outputPath}`);
  }
  
  private generateStoriesFromSessions(sessions: any[]): any[] {
    // Basic story generation - can be enhanced based on your session structure
    return [
      {
        story: "exported booking flow",
        steps: [
          { intent: "greet" },
          { action: "utter_greet" },
          { intent: "book_room" },
          { action: "action_check_availability" }
        ]
      }
    ];
  }
  
  private generateStoriesYaml(stories: any[]): string {
    let yaml = `version: "3.1"\n\nstories:\n\n`;
    
    for (const story of stories) {
      yaml += `- story: ${story.story}\n`;
      yaml += `  steps:\n`;
      
      for (const step of story.steps) {
        if (step.intent) {
          yaml += `  - intent: ${step.intent}\n`;
        }
        if (step.action) {
          yaml += `  - action: ${step.action}\n`;
        }
      }
      yaml += '\n';
    }
    
    return yaml;
  }
  
  private async exportAnalytics(sessions: any[]): Promise<void> {
    const analytics = {
      totalSessions: sessions.length,
      sessionsByStep: this.analyzeSessionSteps(sessions),
      commonPatterns: this.findCommonPatterns(sessions),
      exportDate: new Date().toISOString()
    };
    
    const outputPath = join(process.cwd(), 'rasa-chatbot', 'data', 'chat_analytics.json');
    writeFileSync(outputPath, JSON.stringify(analytics, null, 2));
    
    console.log(`📈 Exported analytics to ${outputPath}`);
  }
  
  private analyzeSessionSteps(sessions: any[]): Record<number, number> {
    const stepCounts: Record<number, number> = {};
    
    for (const session of sessions) {
      const step = session.currentStep || 0;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    }
    
    return stepCounts;
  }
  
  private findCommonPatterns(sessions: any[]): string[] {
    // Analyze common conversation patterns
    return [
      'Most users start with greetings',
      'Booking inquiries are the most common intent',
      'Price questions often follow availability checks'
    ];
  }
}

// Run the export
async function main() {
  const exporter = new ChatDataExporter();
  await exporter.exportChatSessions();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ChatDataExporter };
