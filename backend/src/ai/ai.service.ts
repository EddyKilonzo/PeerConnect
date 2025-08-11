import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface SessionSummaryData {
  keyPoints: string[];
  emotionalTone: string;
  actionItems: string[];
  suggestedResources: string[];
}

export interface GroupSummaryData {
  topicsCovered: string[];
  groupSentiment: string;
  recommendedResources: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'OpenAI API key not found. AI summarization will not work.',
      );
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }
  /**
   * Generate a session summary using AI
   * @param messages - The messages to summarize
   * @returns The session summary
   */

  /**
   * Generate a session summary using AI
   * @param messages - The messages to summarize
   * @returns The session summary
   */
  async generateSessionSummary(
    messages: string[],
  ): Promise<SessionSummaryData> {
    try {
      if (!this.configService.get<string>('OPENAI_API_KEY')) {
        throw new Error('OpenAI API key not configured');
      }

      this.logger.log('Generating session summary using AI');

      const prompt = this.buildSessionSummaryPrompt(messages);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional counselor and therapist. Analyze the conversation and provide a structured summary focusing on key points, emotional tone, action items, and suggested resources. Be empathetic and professional in your analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const summary = this.parseSessionSummaryResponse(response);
      this.logger.log('Session summary generated successfully');

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate session summary:', errorMessage);
      throw new Error(`AI summarization failed: ${errorMessage}`);
    }
  }

  /**
   * Generate a group summary using AI
   * @param messages - The messages to summarize
   * @returns The group summary
   */
  async generateGroupSummary(messages: string[]): Promise<GroupSummaryData> {
    try {
      if (!this.configService.get<string>('OPENAI_API_KEY')) {
        throw new Error('OpenAI API key not configured');
      }

      this.logger.log('Generating group summary using AI');

      const prompt = this.buildGroupSummaryPrompt(messages);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional group facilitator and counselor. Analyze the group discussion and provide a structured summary focusing on topics covered, group sentiment, and recommended resources. Be supportive and constructive in your analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const summary = this.parseGroupSummaryResponse(response);
      this.logger.log('Group summary generated successfully');

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate group summary:', errorMessage);
      throw new Error(`AI summarization failed: ${errorMessage}`);
    }
  }

  /**
   * Build the prompt for session summary generation
   * @param messages - The conversation messages
   * @returns The formatted prompt for AI
   */
  private buildSessionSummaryPrompt(messages: string[]): string {
    const conversationText = messages.join('\n');

    return `Please analyze the following counseling session conversation and provide a structured summary in the following format:

KEY POINTS:
- [List 3-5 key points discussed]

EMOTIONAL TONE:
[Describe the overall emotional tone of the session - e.g., "The session had a supportive and hopeful tone, with moments of vulnerability and determination"]

ACTION ITEMS:
- [List specific action items or next steps discussed]

SUGGESTED RESOURCES:
- [List 2-3 relevant resources, articles, or tools that could be helpful]

Conversation:
${conversationText}

Please provide the summary in the exact format specified above.`;
  }

  /**
   * Build the prompt for group summary generation
   * @param messages - The conversation messages
   * @returns The formatted prompt for AI
   */
  private buildGroupSummaryPrompt(messages: string[]): string {
    const conversationText = messages.join('\n');

    return `Please analyze the following group discussion and provide a structured summary in the following format:

TOPICS COVERED:
- [List 3-5 main topics discussed]

GROUP SENTIMENT:
[Describe the overall mood and sentiment of the group - e.g., "The group showed strong support and engagement, with a collaborative and encouraging atmosphere"]

RECOMMENDED RESOURCES:
- [List 2-3 relevant resources, articles, or tools that could benefit the group]

Discussion:
${conversationText}

Please provide the summary in the exact format specified above.`;
  }

  /**
   * Parse the AI response for session summary
   * @param response - The raw AI response text
   * @returns Parsed session summary data
   */
  private parseSessionSummaryResponse(response: string): SessionSummaryData {
    try {
      const lines = response.split('\n').filter((line) => line.trim());

      const keyPoints: string[] = [];
      let emotionalTone = '';
      const actionItems: string[] = [];
      const suggestedResources: string[] = [];

      let currentSection = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('KEY POINTS:')) {
          currentSection = 'keyPoints';
        } else if (trimmedLine.startsWith('EMOTIONAL TONE:')) {
          currentSection = 'emotionalTone';
        } else if (trimmedLine.startsWith('ACTION ITEMS:')) {
          currentSection = 'actionItems';
        } else if (trimmedLine.startsWith('SUGGESTED RESOURCES:')) {
          currentSection = 'suggestedResources';
        } else if (trimmedLine.startsWith('-') && currentSection) {
          const content = trimmedLine.substring(1).trim();
          if (content) {
            switch (currentSection) {
              case 'keyPoints':
                keyPoints.push(content);
                break;
              case 'actionItems':
                actionItems.push(content);
                break;
              case 'suggestedResources':
                suggestedResources.push(content);
                break;
            }
          }
        } else if (
          currentSection === 'emotionalTone' &&
          trimmedLine &&
          !trimmedLine.startsWith('-')
        ) {
          emotionalTone = trimmedLine;
        }
      }

      // Fallback parsing if structured format fails
      if (
        !keyPoints.length ||
        !emotionalTone ||
        !actionItems.length ||
        !suggestedResources.length
      ) {
        this.logger.warn('Structured parsing failed, using fallback parsing');
        return this.fallbackSessionSummaryParsing(response);
      }

      return {
        keyPoints,
        emotionalTone,
        actionItems,
        suggestedResources,
      };
    } catch {
      this.logger.warn(
        'Failed to parse structured response, using fallback parsing',
      );
      return this.fallbackSessionSummaryParsing(response);
    }
  }

  /**
   * Parse the AI response for group summary
   * @param response - The raw AI response text
   * @returns Parsed group summary data
   */
  private parseGroupSummaryResponse(response: string): GroupSummaryData {
    try {
      const lines = response.split('\n').filter((line) => line.trim());

      const topicsCovered: string[] = [];
      let groupSentiment = '';
      const recommendedResources: string[] = [];

      let currentSection = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('TOPICS COVERED:')) {
          currentSection = 'topicsCovered';
        } else if (trimmedLine.startsWith('GROUP SENTIMENT:')) {
          currentSection = 'groupSentiment';
        } else if (trimmedLine.startsWith('RECOMMENDED RESOURCES:')) {
          currentSection = 'recommendedResources';
        } else if (trimmedLine.startsWith('-') && currentSection) {
          const content = trimmedLine.substring(1).trim();
          if (content) {
            switch (currentSection) {
              case 'topicsCovered':
                topicsCovered.push(content);
                break;
              case 'recommendedResources':
                recommendedResources.push(content);
                break;
            }
          }
        } else if (
          currentSection === 'groupSentiment' &&
          trimmedLine &&
          !trimmedLine.startsWith('-')
        ) {
          groupSentiment = trimmedLine;
        }
      }

      // Fallback parsing if structured format fails
      if (
        !topicsCovered.length ||
        !groupSentiment ||
        !recommendedResources.length
      ) {
        this.logger.warn('Structured parsing failed, using fallback parsing');
        return this.fallbackGroupSummaryParsing(response);
      }

      return {
        topicsCovered,
        groupSentiment,
        recommendedResources,
      };
    } catch {
      this.logger.warn(
        'Failed to parse structured response, using fallback parsing',
      );
      return this.fallbackGroupSummaryParsing(response);
    }
  }

  /**
   * Fallback parsing method for session summary when structured parsing fails
   * @param response - The raw AI response text
   * @returns Basic session summary data
   */
  private fallbackSessionSummaryParsing(response: string): SessionSummaryData {
    // Simple fallback parsing
    const lines = response.split('\n').filter((line) => line.trim());

    return {
      keyPoints: lines.slice(0, 3).map((line) => line.replace(/^[-•*]\s*/, '')),
      emotionalTone:
        'The session showed a supportive and constructive atmosphere',
      actionItems: lines
        .slice(3, 5)
        .map((line) => line.replace(/^[-•*]\s*/, '')),
      suggestedResources: lines
        .slice(5, 7)
        .map((line) => line.replace(/^[-•*]\s*/, '')),
    };
  }

  /**
   * Fallback parsing method for group summary when structured parsing fails
   * @param response - The raw AI response text
   * @returns Basic group summary data
   */
  private fallbackGroupSummaryParsing(response: string): GroupSummaryData {
    // Simple fallback parsing
    const lines = response.split('\n').filter((line) => line.trim());

    return {
      topicsCovered: lines
        .slice(0, 3)
        .map((line) => line.replace(/^[-•*]\s*/, '')),
      groupSentiment: 'The group showed positive engagement and mutual support',
      recommendedResources: lines
        .slice(3, 5)
        .map((line) => line.replace(/^[-•*]\s*/, '')),
    };
  }
}
