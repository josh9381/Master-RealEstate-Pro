import OpenAI from 'openai';

/**
 * OpenAI Service
 * Handles all AI features: chatbot, lead scoring, message enhancement
 * Phase 1 implementation
 */

// Tone system for AI assistant personality
export const ASSISTANT_TONES = {
  PROFESSIONAL: {
    name: 'Professional',
    description: 'Formal, business-like, corporate language',
    temperature: 0.5,
    systemAddition: 'Maintain a formal, business-professional tone. Use corporate language.',
  },
  FRIENDLY: {
    name: 'Friendly',
    description: 'Warm, approachable, conversational',
    temperature: 0.7,
    systemAddition: 'Be warm and approachable. Use conversational language and show empathy.',
  },
  DIRECT: {
    name: 'Direct',
    description: 'No-nonsense, straight to the point, brief',
    temperature: 0.4,
    systemAddition: 'Be extremely concise and direct. Get straight to the point without pleasantries.',
  },
  COACHING: {
    name: 'Coaching',
    description: 'Mentor-style, educational, encouraging',
    temperature: 0.7,
    systemAddition: 'Act as a mentor and coach. Explain concepts, share best practices, and encourage growth.',
  },
  CASUAL: {
    name: 'Casual',
    description: 'Relaxed, informal, buddy-style',
    temperature: 0.8,
    systemAddition: 'Be relaxed and casual like talking to a friend. Use informal language.',
  },
};

export type AssistantTone = keyof typeof ASSISTANT_TONES;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface ChatResponse {
  response: string;
  tokens: number;
  cost: number;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface EnhancedMessage {
  enhanced: string;
  tokens: number;
  cost: number;
}

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  /**
   * Chat with AI assistant (for chatbot feature)
   * @param messages - Conversation history
   * @param _userId - User ID for tracking
   * @param _organizationId - Organization ID for tracking
   * @returns AI response with token/cost info
   */
  async chat(
    messages: ChatMessage[],
    _userId: string,
    _organizationId: string
  ): Promise<ChatResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || '';
      const tokens = completion.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, this.model);

      return { response, tokens, cost };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI chat error:', error);
      throw new Error(`AI chat failed: ${errorMessage}`);
    }
  }

  /**
   * Chat with function calling support
   * @param messages - Conversation history
   * @param functions - Available functions
   * @param _userId - User ID
   * @param _organizationId - Organization ID
   * @returns AI response, possibly with function call
   */
  async chatWithFunctions(
    messages: ChatMessage[],
    functions: unknown[],
    _userId: string,
    _organizationId: string
  ): Promise<ChatResponse> {
    try {
      // Convert functions to tools format (OpenAI SDK v4+ requirement)
      const tools = functions.map((fn: any) => ({
        type: 'function' as const,
        function: fn,
      }));

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      const choice = completion.choices[0];
      const tokens = completion.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, this.model);

      // Check if AI wants to call a function (tool_calls is the new format)
      if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        
        // Type guard to ensure it's a function tool call
        if (toolCall.type === 'function') {
          const functionCall = toolCall.function;
          const functionArgs = JSON.parse(functionCall.arguments || '{}');

          console.log(`🤖 AI wants to call function: ${functionCall.name}`, functionArgs);

          return {
            response: '',
            tokens,
            cost,
            functionCall: {
              name: functionCall.name || '',
              arguments: functionArgs,
            },
          };
        }
      }

      // Regular response
      const response = choice?.message?.content || '';
      return { response, tokens, cost };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI chat with functions error:', error);
      throw new Error(`AI chat with functions failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze lead data and return a score (0-100)
   * @param leadData - Lead information
   * @param _organizationId - Organization ID
   * @returns Lead score (0-100)
   */
  async analyzeLeadScore(leadData: Record<string, unknown>, _organizationId: string): Promise<number> {
    try {
      const prompt = `Analyze this real estate lead and provide a score from 0-100 based on conversion likelihood.
      
Lead Data:
${JSON.stringify(leadData, null, 2)}

Consider:
- Recent activity and engagement
- Budget/value alignment
- Timeline urgency
- Source quality
- Communication responsiveness

Return only a number between 0-100.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 10,
      });

      const scoreText = completion.choices[0]?.message?.content || '0';
      const score = parseInt(scoreText.trim(), 10);

      return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
    } catch (error: unknown) {
      console.error('OpenAI lead scoring error:', error);
      return 50; // Default to neutral score on error
    }
  }

  /**
   * Enhance a message with a specific tone
   * @param text - Original message text
   * @param tone - Desired tone (professional, friendly, urgent, etc.)
   * @returns Enhanced message with token/cost info
   */
  async enhanceMessage(text: string, tone: string): Promise<EnhancedMessage> {
    try {
      const tonePrompts: Record<string, string> = {
        professional:
          'Rewrite this message in a professional, business-appropriate tone:',
        friendly: 'Rewrite this message in a warm, friendly, and approachable tone:',
        urgent: 'Rewrite this message with a sense of urgency and importance:',
        casual: 'Rewrite this message in a casual, conversational tone:',
        persuasive:
          'Rewrite this message to be more persuasive and compelling:',
        formal: 'Rewrite this message in a formal, polished tone:',
      };

      const prompt = `${tonePrompts[tone] || tonePrompts.professional}

Original message:
${text}

Return only the enhanced message, no explanations.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const enhanced = completion.choices[0]?.message?.content || text;
      const tokens = completion.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, this.model);

      return { enhanced, tokens, cost };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI message enhancement error:', error);
      throw new Error(`Message enhancement failed: ${errorMessage}`);
    }
  }

  /**
   * Generate an email sequence (3-5 emails)
   * @param context - Context for the sequence (lead info, campaign goal, etc.)
   * @returns Array of email objects with subject and body
   */
  async generateEmailSequence(context: {
    leadName?: string;
    propertyType?: string;
    goal: string;
    tone?: string;
    sequenceLength?: number;
  }): Promise<Array<{ subject: string; body: string; dayOffset: number }>> {
    try {
      const { leadName = 'there', propertyType = 'property', goal, tone = 'professional', sequenceLength = 5 } = context;

      const prompt = `Generate a ${sequenceLength}-email nurture sequence for a real estate ${goal} campaign.

Context:
- Lead name: ${leadName}
- Property type: ${propertyType}
- Tone: ${tone}
- Goal: ${goal}

Create ${sequenceLength} emails with:
1. Compelling subject lines (under 60 characters)
2. Engaging body copy (100-200 words each)
3. Clear call-to-action in each email
4. Progressive value delivery (build relationship over time)

Return as JSON array:
[
  {
    "subject": "Email 1 subject",
    "body": "Email 1 body with personalization and CTA",
    "dayOffset": 0
  },
  ...
]`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);
      
      // Handle different response formats
      const emails = parsed.emails || parsed.sequence || [];
      
      return emails.map((email: { subject: string; body: string }, index: number) => ({
        subject: email.subject,
        body: email.body,
        dayOffset: index * 3, // Default: 3 days between emails
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI email sequence generation error:', error);
      throw new Error(`Email sequence generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate SMS campaign message
   * @param context - Campaign context
   * @returns SMS message (max 160 characters)
   */
  async generateSMS(context: {
    leadName?: string;
    propertyType?: string;
    goal: string;
    tone?: string;
  }): Promise<string> {
    try {
      const { leadName = 'there', propertyType = 'property', goal, tone = 'friendly' } = context;

      const prompt = `Generate a short SMS message (max 160 characters) for a real estate ${goal} campaign.

Context:
- Lead name: ${leadName}
- Property type: ${propertyType}
- Tone: ${tone}
- Goal: ${goal}

Requirements:
- Under 160 characters
- Include clear call-to-action
- Personalized and engaging
- No emojis (some carriers don't support them)

Return only the SMS text, no quotes or explanations.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 100,
      });

      const sms = completion.choices[0]?.message?.content || '';
      // Truncate to 160 characters if needed
      return sms.trim().substring(0, 160);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI SMS generation error:', error);
      throw new Error(`SMS generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate property description
   * @param propertyData - Property details
   * @returns Engaging property description
   */
  async generatePropertyDescription(propertyData: {
    address: string;
    propertyType: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    price?: number;
    features?: string[];
    neighborhood?: string;
  }): Promise<string> {
    try {
      const { address, propertyType, bedrooms, bathrooms, squareFeet, price, features = [], neighborhood } = propertyData;

      const prompt = `Generate a compelling property listing description for:

Property Details:
- Address: ${address}
- Type: ${propertyType}
- Bedrooms: ${bedrooms || 'N/A'}
- Bathrooms: ${bathrooms || 'N/A'}
- Square Feet: ${squareFeet || 'N/A'}
- Price: ${price ? `$${price.toLocaleString()}` : 'N/A'}
- Features: ${features.join(', ') || 'None listed'}
- Neighborhood: ${neighborhood || 'N/A'}

Create a 150-250 word description that:
1. Opens with an attention-grabbing hook
2. Highlights unique selling points
3. Paints a lifestyle picture
4. Mentions key features naturally
5. Ends with a call-to-action

Use vivid, descriptive language that helps buyers visualize living there.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 'Beautiful property available.';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI property description generation error:', error);
      throw new Error(`Property description generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate social media posts
   * @param context - Post context
   * @returns Social media posts for different platforms
   */
  async generateSocialPosts(context: {
    topic: string;
    propertyAddress?: string;
    platforms: string[];
    tone?: string;
  }): Promise<Record<string, string>> {
    try {
      const { topic, propertyAddress, platforms, tone = 'engaging' } = context;

      const platformSpecs: Record<string, string> = {
        facebook: '150-200 words, conversational, can include emojis',
        instagram: '100-150 words, visual-focused, hashtags encouraged (5-10)',
        twitter: 'Under 280 characters, punchy, 1-2 hashtags max',
        linkedin: '200-300 words, professional tone, industry insights',
      };

      const prompt = `Generate social media posts for a real estate ${topic}.

Context:
${propertyAddress ? `- Property: ${propertyAddress}` : ''}
- Platforms: ${platforms.join(', ')}
- Tone: ${tone}

For each platform, follow these guidelines:
${platforms.map(p => `${p}: ${platformSpecs[p] || 'Standard social post'}`).join('\n')}

Return as JSON:
{
  "facebook": "Facebook post text...",
  "instagram": "Instagram post text...",
  ...
}`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI social post generation error:', error);
      throw new Error(`Social post generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate listing presentation outline
   * @param propertyData - Property and market data
   * @returns Presentation outline with key points
   */
  async generateListingPresentation(propertyData: {
    address: string;
    propertyType: string;
    estimatedValue?: number;
    comparables?: Array<{ address: string; soldPrice: number; soldDate: string }>;
    marketTrends?: string;
  }): Promise<{
    introduction: string;
    marketAnalysis: string;
    pricingStrategy: string;
    marketingPlan: string;
    nextSteps: string;
  }> {
    try {
      const { address, propertyType, estimatedValue, comparables = [], marketTrends } = propertyData;

      const prompt = `Generate a professional listing presentation outline for:

Property: ${address}
Type: ${propertyType}
Estimated Value: ${estimatedValue ? `$${estimatedValue.toLocaleString()}` : 'To be determined'}

${comparables.length > 0 ? `Recent Comparables:
${comparables.map(c => `- ${c.address}: $${c.soldPrice.toLocaleString()} (${c.soldDate})`).join('\n')}` : ''}

${marketTrends ? `Market Trends: ${marketTrends}` : ''}

Create a presentation outline with these sections:
1. Introduction (opening statement, why choose you)
2. Market Analysis (current market conditions, comparable sales)
3. Pricing Strategy (recommended price, justification)
4. Marketing Plan (how you'll market the property)
5. Next Steps (timeline, what to expect)

Return as JSON:
{
  "introduction": "...",
  "marketAnalysis": "...",
  "pricingStrategy": "...",
  "marketingPlan": "...",
  "nextSteps": "..."
}`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);
      
      return {
        introduction: parsed.introduction || '',
        marketAnalysis: parsed.marketAnalysis || parsed.market_analysis || '',
        pricingStrategy: parsed.pricingStrategy || parsed.pricing_strategy || '',
        marketingPlan: parsed.marketingPlan || parsed.marketing_plan || '',
        nextSteps: parsed.nextSteps || parsed.next_steps || '',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI listing presentation generation error:', error);
      throw new Error(`Listing presentation generation failed: ${errorMessage}`);
    }
  }

  /**
   * Stream chat responses token by token (Phase 3)
   * @param messages - Conversation history
   * @param _userId - User ID for tracking
   * @param _organizationId - Organization ID for tracking
   * @returns Async generator yielding tokens
   */
  async *chatStream(
    messages: ChatMessage[],
    _userId: string,
    _organizationId: string
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: 0.7,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error: unknown) {
      const err = error as Error
      console.error('OpenAI streaming error:', err.message)
      throw new Error(`OpenAI streaming failed: ${err.message}`)
    }
  }

  /**
   * Generate insights and recommendations (for Intelligence Hub)
   * Phase 3 implementation
   */
  async generateInsights(_userData: Record<string, unknown>, _organizationId: string): Promise<Record<string, unknown>[]> {
    // TODO: Implement in Phase 3
    throw new Error('Not implemented yet - Phase 3');
  }

  /**
   * Calculate cost based on tokens used
   * Prices as of Nov 2024 (update as needed)
   * @param tokens - Number of tokens used
   * @param model - Model name
   * @returns Cost in USD
   */
  private calculateCost(tokens: number, model: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4-turbo-preview'];
    // Approximate: assume 50/50 split between input and output
    const avgCost = (modelPricing.input + modelPricing.output) / 2;

    return tokens * avgCost;
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null;

export const getOpenAIService = (): OpenAIService => {
  if (!openAIService) {
    openAIService = new OpenAIService();
  }
  return openAIService;
};
