import OpenAI from 'openai';
import config from '../config.js';

if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY is required in .env file');
}

export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Call OpenAI Deep Research with Web Search enabled
 * @param {string} prompt - The research prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Research results with sources
 */
export async function deepResearch(prompt, options = {}) {
  const {
    model = config.openai.deepResearchModel,
    maxTokens = 4000,
    responseFormat = 'text',
  } = options;

  try {
    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      // Deep Research models automatically use web search
    };

    // IMPORTANT: Do not set response_format=json_object with web_search enabled models
    // Deep Research uses web_search, which is incompatible with json_object formatting.

    const response = await openai.chat.completions.create(requestBody);

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
      // Sources will be embedded in the response content
    };
  } catch (error) {
    console.error('Deep Research API Error:', error);
    throw error;
  }
}

/**
 * Call standard OpenAI model
 * @param {string} prompt - The prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Completion results
 */
export async function complete(prompt, options = {}) {
  const {
    model = config.openai.standardModel,
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = null,
  } = options;

  try {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

/**
 * Call OpenAI with JSON response format
 * @param {string} prompt - The prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} JSON parsed results
 */
export async function completeJSON(prompt, options = {}) {
  const {
    model = config.openai.standardModel,
    temperature = 0.7,
    systemPrompt = null,
  } = options;

  try {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    return {
      data: JSON.parse(content),
      usage: response.usage,
      model: response.model,
    };
  } catch (error) {
    console.error('OpenAI JSON API Error:', error);
    throw error;
  }
}

export default openai;
