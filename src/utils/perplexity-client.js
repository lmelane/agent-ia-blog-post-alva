import fetch from 'node-fetch';
import config from '../config.js';

if (!config.perplexity?.apiKey) {
  console.warn('PERPLEXITY_API_KEY not configured - Perplexity search will not be available');
}

/**
 * Call Perplexity API for web search with AI-powered responses
 * @param {string} prompt - The search/research prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results with sources
 */
export async function perplexitySearch(prompt, options = {}) {
  const {
    model = config.perplexity?.model || 'sonar-pro',
    temperature = 0.7,
    maxTokens = 4000,
    systemPrompt = null,
  } = options;

  if (!config.perplexity?.apiKey) {
    throw new Error('PERPLEXITY_API_KEY is required in .env file');
  }

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

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.perplexity.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        return_citations: true,
        return_related_questions: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      citations: data.citations || [],
      relatedQuestions: data.related_questions || [],
      usage: data.usage,
      model: data.model,
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    throw error;
  }
}

/**
 * Call Perplexity API and parse JSON response
 * @param {string} prompt - The prompt (should request JSON output)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Parsed JSON data with metadata
 */
export async function perplexitySearchJSON(prompt, options = {}) {
  const result = await perplexitySearch(prompt, {
    ...options,
    systemPrompt: options.systemPrompt || 'You are an AI research assistant that returns structured JSON data. Always respond with valid JSON only, no markdown formatting.',
  });

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonContent = result.content.trim();
    
    // Remove markdown code blocks if present (```json ... ``` or just ``` ... ```)
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    } else {
      // Sometimes models output text before/after the JSON without code blocks
      // Try to find the first '{' and last '}'
      const firstOpen = jsonContent.indexOf('{');
      const lastClose = jsonContent.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        jsonContent = jsonContent.substring(firstOpen, lastClose + 1);
      }
    }

    const data = JSON.parse(jsonContent);

    return {
      data,
      citations: result.citations,
      relatedQuestions: result.relatedQuestions,
      usage: result.usage,
      model: result.model,
    };
  } catch (parseError) {
    console.error('Failed to parse Perplexity JSON response:', parseError);
    console.error('Raw content:', result.content);
    throw new Error(`Failed to parse JSON from Perplexity response: ${parseError.message}`);
  }
}

export default { perplexitySearch, perplexitySearchJSON };
