import OpenAI from 'openai';
import {
  getOpenAIClient as getOrgOpenAIClient,
  getModelForTask,
  calculateCost as calculateModelCost,
  buildSystemPrompt,
  AIConfig,
  MODEL_PRICING,
} from './ai-config.service';
import { withRetryAndFallback } from '../utils/ai-retry';
import { aiLogger } from '../utils/ai-logger';
import { buildCacheKey, getOrCompute } from './ai-cache.service';

/**
 * OpenAI Service
 * Handles all AI features: chatbot, lead scoring, message enhancement
 * Integrates with ai-config.service for org-level key/model resolution (Phase 3)
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

  /**
   * Resolve max_tokens: use the smaller of the per-method default and the
   * per-tier limit from the org's subscription (config.maxTokens).
   * Scoring/SMS have tiny per-method caps that should always win;
   * long-form content caps at the tier limit when it's lower.
   */
  private capTokens(perMethodDefault: number, config?: AIConfig): number {
    if (!config?.maxTokens) return perMethodDefault;
    return Math.min(perMethodDefault, config.maxTokens);
  }

  constructor() {
    // Platform key is optional — orgs may supply their own via ai-config.service
    const apiKey = process.env.OPENAI_API_KEY || 'placeholder-will-use-org-key';

    this.client = new OpenAI({
      apiKey,
      organization: process.env.OPENAI_ORG_ID,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Resolve the OpenAI client and model for a given organization.
   * Falls back to the default platform client if org resolution fails.
   */
  private async resolveClientForOrg(
    organizationId?: string,
    task?: 'chat' | 'compose' | 'content' | 'enhance' | 'sms' | 'score' | 'suggest' | 'deep_analysis' | 'premium'
  ): Promise<{ client: OpenAI; model: string; config?: AIConfig }> {
    if (organizationId) {
      try {
        const { client, config } = await getOrgOpenAIClient(organizationId);
        const model = task ? getModelForTask(task, config.model) : config.model;
        return { client, model, config };
      } catch (error) {
        console.warn('Failed to resolve org AI config, falling back to default:', error);
      }
    }
    return { client: this.client, model: this.model };
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
    const { startTime } = aiLogger.start({ method: 'chat', model: 'pending', organizationId: _organizationId, userId: _userId });
    try {
      const { client, model, config } = await this.resolveClientForOrg(_organizationId, 'chat');

      // Prepend org system prompt if configured
      const resolvedMessages = [...messages];
      if (config?.systemPrompt && resolvedMessages.length > 0 && resolvedMessages[0].role === 'system') {
        resolvedMessages[0] = {
          ...resolvedMessages[0],
          content: buildSystemPrompt(resolvedMessages[0].content || '', config),
        };
      }

      const { result: completion, modelUsed } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: resolvedMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: 0.7,
          max_tokens: this.capTokens(1000, config),
        }),
        client, model
      );

      const response = completion.choices[0]?.message?.content || '';
      const tokens = completion.usage?.total_tokens || 0;
      const cost = calculateModelCost(tokens, modelUsed);

      aiLogger.success({ method: 'chat', model, modelUsed, organizationId: _organizationId, userId: _userId, tokens, inputTokens: completion.usage?.prompt_tokens, outputTokens: completion.usage?.completion_tokens, cost, startTime });

      return { response, tokens, cost };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiLogger.error({ method: 'chat', model: 'unknown', organizationId: _organizationId, userId: _userId, error, startTime });
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
      const { client, model, config } = await this.resolveClientForOrg(_organizationId, 'chat');

      // Convert functions to tools format (OpenAI SDK v4+ requirement)
      const tools = functions.map((fn: any) => ({
        type: 'function' as const,
        function: fn,
      }));

      // Prepend org system prompt if configured
      const resolvedMessages = [...messages];
      if (config?.systemPrompt && resolvedMessages.length > 0 && resolvedMessages[0].role === 'system') {
        resolvedMessages[0] = {
          ...resolvedMessages[0],
          content: buildSystemPrompt(resolvedMessages[0].content || '', config),
        };
      }

      const { result: completion, modelUsed } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: resolvedMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: this.capTokens(1000, config),
        }),
        client, model
      );

      const choice = completion.choices[0];
      const tokens = completion.usage?.total_tokens || 0;
      const cost = calculateModelCost(tokens, modelUsed);

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
    const cacheKey = buildCacheKey('scoring', _organizationId, JSON.stringify(leadData));
    return getOrCompute<number>(cacheKey, 'scoring', async () => {
      try {
        const { client, model } = await this.resolveClientForOrg(_organizationId, 'score');

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

        const { result: completion } = await withRetryAndFallback(
          (c, m) => c.chat.completions.create({
            model: m,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 10,
          }),
          client, model
        );

        const scoreText = completion.choices[0]?.message?.content || '0';
        const score = parseInt(scoreText.trim(), 10);

        return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
      } catch (error: unknown) {
        console.error('OpenAI lead scoring error:', error);
        return 50; // Default to neutral score on error
      }
    });
  }

  /**
   * Enhance a message with a specific tone
   * @param text - Original message text
   * @param tone - Desired tone (professional, friendly, urgent, etc.)
   * @returns Enhanced message with token/cost info
   */
  async enhanceMessage(text: string, tone: string, organizationId?: string): Promise<EnhancedMessage> {
    try {
      const { client, model, config } = await this.resolveClientForOrg(organizationId, 'enhance');

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

      const { result: completion, modelUsed } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: this.capTokens(500, config),
        }),
        client, model
      );

      const enhanced = completion.choices[0]?.message?.content || text;
      const tokens = completion.usage?.total_tokens || 0;
      const cost = calculateModelCost(tokens, modelUsed);

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
    organizationId?: string;
  }): Promise<Array<{ subject: string; body: string; dayOffset: number }>> {
    const orgId = context.organizationId || 'platform';
    const cacheKey = buildCacheKey('content', orgId, 'email:' + JSON.stringify(context));
    return getOrCompute(cacheKey, 'content', async () => {
    try {
      const { leadName = 'there', propertyType = 'property', goal, tone = 'professional', sequenceLength = 5, organizationId } = context;
      const { client, model, config } = await this.resolveClientForOrg(organizationId, 'content');

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

      const { result: completion } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: this.capTokens(2000, config),
          response_format: { type: 'json_object' },
        }),
        client, model
      );

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);
      
      // Handle different response formats
      const emails = parsed.emails || parsed.sequence || [];
      
      return emails.map((email: { subject: string; body: string; dayOffset?: number }, index: number) => ({
        subject: email.subject,
        body: email.body,
        dayOffset: email.dayOffset ?? index * 3, // Prefer AI-generated offset
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI email sequence generation error:', error);
      throw new Error(`Email sequence generation failed: ${errorMessage}`);
    }
    }); // end getOrCompute
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
    organizationId?: string;
  }): Promise<string> {
    try {
      const { leadName = 'there', propertyType = 'property', goal, tone = 'friendly', organizationId } = context;
      const { client, model, config } = await this.resolveClientForOrg(organizationId, 'sms');

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

      const { result: completion } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: this.capTokens(100, config),
        }),
        client, model
      );

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
    organizationId?: string;
  }): Promise<string> {
    const orgId = propertyData.organizationId || 'platform';
    const cacheKey = buildCacheKey('content', orgId, JSON.stringify(propertyData));
    return getOrCompute<string>(cacheKey, 'content', async () => {
    try {
      const { address, propertyType, bedrooms, bathrooms, squareFeet, price, features = [], neighborhood, organizationId } = propertyData;
      const { client, model, config } = await this.resolveClientForOrg(organizationId, 'content');

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

      const { result: completion } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: this.capTokens(500, config),
        }),
        client, model
      );

      return completion.choices[0]?.message?.content || 'Beautiful property available.';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI property description generation error:', error);
      throw new Error(`Property description generation failed: ${errorMessage}`);
    }
    }); // end getOrCompute
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
    organizationId?: string;
  }): Promise<Record<string, string>> {
    const orgId = context.organizationId || 'platform';
    const cacheKey = buildCacheKey('content', orgId, 'social:' + JSON.stringify(context));
    return getOrCompute(cacheKey, 'content', async () => {
    try {
      const { topic, propertyAddress, platforms, tone = 'engaging', organizationId } = context;
      const { client, model, config } = await this.resolveClientForOrg(organizationId, 'content');

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

      const { result: completion } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: this.capTokens(1000, config),
          response_format: { type: 'json_object' },
        }),
        client, model
      );

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OpenAI social post generation error:', error);
      throw new Error(`Social post generation failed: ${errorMessage}`);
    }
    }); // end getOrCompute
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
    organizationId?: string;
  }): Promise<{
    introduction: string;
    marketAnalysis: string;
    pricingStrategy: string;
    marketingPlan: string;
    nextSteps: string;
  }> {
    const orgId = propertyData.organizationId || 'platform';
    const cacheKey = buildCacheKey('content', orgId, 'listing:' + JSON.stringify(propertyData));
    return getOrCompute(cacheKey, 'content', async () => {
    try {
      const { address, propertyType, estimatedValue, comparables = [], marketTrends, organizationId } = propertyData;
      const { client, model, config } = await this.resolveClientForOrg(organizationId, 'content');

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

      const { result: completion } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: this.capTokens(1500, config),
          response_format: { type: 'json_object' },
        }),
        client, model
      );

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
    }); // end getOrCompute
  }

  /**
   * Stream chat responses token by token
   * Uses org-specific client and model resolution (Phase 3)
   */
  async *chatStream(
    messages: ChatMessage[],
    _userId: string,
    _organizationId: string
  ): AsyncGenerator<string, void, unknown> {
    try {
      const { client, model, config } = await this.resolveClientForOrg(_organizationId, 'chat');

      // Prepend org system prompt if configured
      const resolvedMessages = [...messages];
      if (config?.systemPrompt && resolvedMessages.length > 0 && resolvedMessages[0].role === 'system') {
        resolvedMessages[0] = {
          ...resolvedMessages[0],
          content: buildSystemPrompt(resolvedMessages[0].content || '', config),
        };
      }

      const stream = await client.chat.completions.create({
        model,
        messages: resolvedMessages as OpenAI.Chat.ChatCompletionMessageParam[],
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
   * Uses org-specific client and model resolution (Phase 3)
   */
  async generateInsights(userData: Record<string, unknown>, organizationId: string): Promise<Record<string, unknown>[]> {
    const cacheKey = buildCacheKey('content', organizationId, 'insights:' + JSON.stringify(userData));
    return getOrCompute<Record<string, unknown>[]>(cacheKey, 'content', async () => {
    const { client, model, config } = await this.resolveClientForOrg(organizationId, 'suggest');

    const prompt = `Analyze this real estate agent's data and provide actionable insights:
${JSON.stringify(userData, null, 2)}

Return a JSON array of insight objects with: type, title, description, priority (high/medium/low), action.`;

    const { result: completion } = await withRetryAndFallback(
      (c, m) => c.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: this.capTokens(1500, config),
        response_format: { type: 'json_object' },
      }),
      client, model
    );

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    return parsed.insights || [];
    }); // end getOrCompute
  }

  /**
   * Calculate cost based on tokens used
   * Uses updated pricing from ai-config.service (Phase 3)
   */
  private calculateCost(tokens: number, model: string): number {
    return calculateModelCost(tokens, model);
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null;

export const getOpenAIService = (): OpenAIService => {
  if (!openAIService) {
    try {
      openAIService = new OpenAIService();
    } catch (error) {
      console.error('Failed to initialize OpenAIService:', error);
      throw error;
    }
  }
  return openAIService;
};

/**
 * Rotate the platform OpenAI key without downtime (Phase 5E).
 * Destroys the singleton so the next call re-creates it with the new env var.
 * Also clears the org-level client cache in ai-config.service.
 *
 * Usage: Set the new key in process.env.OPENAI_API_KEY, then call this.
 */
export const rotatePlatformKey = (newKey?: string): void => {
  if (newKey) {
    process.env.OPENAI_API_KEY = newKey;
  }
  openAIService = null;
  console.log('[Key Rotation] OpenAI platform key rotated, singleton reset');
};
