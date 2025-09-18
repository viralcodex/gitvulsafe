import { GoogleGenAI } from '@google/genai';

import { Vulnerability } from '../constants/constants';
import { prompts } from '../prompts/prompts';
import inlineaiSummarySchema from '../prompts/schemas/inlineai-summary-schema.json';
import vulnerabilitySummarySchema from '../prompts/schemas/vulnerability-summary-schema.json';
import { parseAiResponseParts } from '../utils/utils';

class AiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async generateVulnerabilitySummary(
    vulnerabilities: Vulnerability[],
  ): Promise<string> {
    const prompt = prompts.VULNERABILITIES_SUMMARIZATION;
    const finalPrompt = `System:${JSON.stringify(prompt.system)}\n\nConstraints:${JSON.stringify(prompt.constraints.join('\n'))}\n\nExamples:${JSON.stringify(prompt.examples)}`;
    console.log('Final Prompt:', finalPrompt);

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt.template.replace(
        '{{vulnerabilities}}',
        JSON.stringify(vulnerabilities),
      ),
      config: {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        systemInstruction: finalPrompt,
        responseSchema: vulnerabilitySummarySchema,
        responseMimeType: 'application/json',
      },
    });

    if (!response?.candidates?.[0]?.content?.parts) {
      throw new Error('No response from AI model');
    }

    console.log('AI Response:', response.candidates[0].content);

    // Analyze response parts structure
    const parts = response.candidates[0].content.parts;

    return parseAiResponseParts(parts);
  }

  async generateInlineResponse(
    prompt: string,
    context: string,
    selectedText: string,
  ): Promise<string> {
    if (!prompt || !selectedText || !context) {
      throw new Error('Missing required fields for inline AI response');
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${prompts.INLINE_AI_RESPONSE.template.replace('{{selectedText}}', selectedText)}\n\nContext: ${prompts.INLINE_AI_RESPONSE.context.replace('{{context}}', context)}`,
      config: {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        systemInstruction: prompts.INLINE_AI_RESPONSE.system,
        responseSchema: inlineaiSummarySchema,
        responseMimeType: 'application/json',
      },
    });

    if (!response?.candidates?.[0]?.content?.parts) {
      throw new Error('No response from AI model');
    }

    console.log('AI Response:', response.candidates[0].content);

    // Analyze response parts structure
    const parts = response.candidates[0].content.parts;

    return parseAiResponseParts(parts);
  }
}

export default AiService;
