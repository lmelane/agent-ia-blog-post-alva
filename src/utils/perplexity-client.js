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

    // Try to parse, if it fails, attempt to repair truncated JSON
    let data;
    try {
      data = JSON.parse(jsonContent);
    } catch (initialError) {
      console.warn('Initial JSON parse failed, attempting repair...');
      data = repairAndParseJSON(jsonContent);
    }

    return {
      data,
      citations: result.citations,
      relatedQuestions: result.relatedQuestions,
      usage: result.usage,
      model: result.model,
    };
  } catch (parseError) {
    console.error('Failed to parse Perplexity JSON response:', parseError);
    console.error('Raw content (first 500 chars):', result.content.substring(0, 500));
    throw new Error(`Failed to parse JSON from Perplexity response: ${parseError.message}`);
  }
}

/**
 * Attempt to repair and parse truncated/malformed JSON
 * @param {string} jsonStr - Potentially malformed JSON string
 * @returns {Object} Parsed JSON object
 */
function repairAndParseJSON(jsonStr) {
  let repaired = jsonStr;
  
  // Remove trailing incomplete strings (e.g., truncated in the middle of a value)
  // Find the last complete property by looking for patterns
  const lastCompleteComma = repaired.lastIndexOf('",');
  const lastCompleteBrace = repaired.lastIndexOf('"},');
  const lastCompleteBracket = repaired.lastIndexOf('}],');
  
  const lastComplete = Math.max(lastCompleteComma, lastCompleteBrace, lastCompleteBracket);
  
  if (lastComplete > repaired.length * 0.5) {
    // Truncate at the last complete point
    repaired = repaired.substring(0, lastComplete + 1);
  }
  
  // Count open brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;
  
  for (const char of repaired) {
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }
  
  // Close any unclosed strings (if we're still in a string)
  if (inString) {
    repaired += '"';
  }
  
  // Close unclosed brackets and braces
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }
  
  // Try to parse the repaired JSON
  try {
    return JSON.parse(repaired);
  } catch (e) {
    // Last resort: try to extract just the topics array if it exists
    const topicsMatch = repaired.match(/"topics"\s*:\s*\[([\s\S]*)/);
    if (topicsMatch) {
      let topicsContent = topicsMatch[1];
      // Find complete topic objects
      const completeTopics = [];
      const topicRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      let match;
      while ((match = topicRegex.exec(topicsContent)) !== null) {
        try {
          completeTopics.push(JSON.parse(match[0]));
        } catch (e) {
          // Skip malformed topic
        }
      }
      if (completeTopics.length > 0) {
        console.warn(`Recovered ${completeTopics.length} topics from malformed JSON`);
        return { topics: completeTopics };
      }
    }
    throw new Error('Unable to repair JSON: ' + e.message);
  }
}

export default { perplexitySearch, perplexitySearchJSON };
