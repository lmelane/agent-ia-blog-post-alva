import fetch from 'node-fetch';
import config from '../config.js';

if (!config.gemini?.apiKey) {
  console.warn('GEMINI_API_KEY not configured - Gemini generation will not be available');
}

/**
 * Call Google Gemini API for text generation
 * @param {string} prompt - The prompt
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Generation results
 */
export async function geminiComplete(prompt, options = {}) {
  const {
    model = config.gemini?.model || 'gemini-2.0-flash',
    temperature = 0.7,
    maxTokens = 8000,
    systemPrompt = null,
  } = options;

  if (!config.gemini?.apiKey) {
    throw new Error('GEMINI_API_KEY is required in .env file');
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.gemini.apiKey}`;

    const contents = [];

    // Add system instruction if provided
    const systemInstruction = systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined;

    // Add user message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const candidate = data.candidates[0];
    const content = candidate.content?.parts?.map(p => p.text).join('') || '';

    return {
      content,
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
      model,
      finishReason: candidate.finishReason,
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

/**
 * Call Gemini API and parse JSON response
 * @param {string} prompt - The prompt (should request JSON output)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Parsed JSON data with metadata
 */
export async function geminiCompleteJSON(prompt, options = {}) {
  const result = await geminiComplete(prompt, {
    ...options,
    systemPrompt: options.systemPrompt || 'You are an AI assistant that returns structured JSON data. Always respond with valid JSON only, no markdown formatting or code blocks.',
  });

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonContent = result.content;
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const data = JSON.parse(jsonContent);

    return {
      data,
      usage: result.usage,
      model: result.model,
    };
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON response:', parseError);
    console.error('Raw content:', result.content);
    throw new Error(`Failed to parse JSON from Gemini response: ${parseError.message}`);
  }
}

export default { geminiComplete, geminiCompleteJSON };
