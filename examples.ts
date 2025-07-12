/**
 * Example usage of the Cloudflare AI Proxy Worker
 * This demonstrates how to use the proxy with the OpenAI SDK
 */

// Example 1: Using with OpenAI SDK
import OpenAI from 'openai';

// Configure the OpenAI client to use your proxy
const openai = new OpenAI({
  baseURL: 'https://your-worker.workers.dev/v1',
  apiKey: 'your-auth-token', // Your proxy auth token, not OpenAI key
});

// Example 2: Chat completion with Cloudflare Workers AI (default)
async function chatWithCloudflare() {
  const response = await openai.chat.completions.create({
    model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  console.log(response.choices[0].message.content);
}

// Example 3: Chat completion with OpenAI (requires OPENAI_API_KEY configured)
async function chatWithOpenAI() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Write a haiku about programming.' },
    ],
    temperature: 0.8,
  });
  
  console.log(response.choices[0].message.content);
}

// Example 4: Chat completion with Gemini (requires GEMINI_API_KEY configured)
async function chatWithGemini() {
  const response = await openai.chat.completions.create({
    model: 'gemini-pro',
    messages: [
      { role: 'user', content: 'Explain the benefits of renewable energy.' },
    ],
    temperature: 0.6,
  });
  
  console.log(response.choices[0].message.content);
}

// Example 5: Direct fetch API usage
async function directFetchExample() {
  const response = await fetch('https://your-worker.workers.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-TOKEN': 'your-auth-token',
    },
    body: JSON.stringify({
      model: '@cf/meta/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'user', content: 'Hello, world!' },
      ],
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  console.log(data.choices[0].message.content);
}

// Example 6: Token estimation
async function estimateTokens() {
  const response = await fetch('https://your-worker.workers.dev/v1/tokenize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-TOKEN': 'your-auth-token',
    },
    body: JSON.stringify({
      input: 'This is a test message to estimate token count.',
      model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    }),
  });
  
  const data = await response.json();
  console.log(`Token count: ${data.tokens}`);
}

// Example 7: Get available models
async function getAvailableModels() {
  const response = await fetch('https://your-worker.workers.dev/v1/model-options', {
    headers: {
      'X-AUTH-TOKEN': 'your-auth-token',
    },
  });
  
  const data = await response.json();
  console.log('Available models:', data.data);
}

// Example 8: Check routing for a specific model
async function checkRouting() {
  const response = await fetch('https://your-worker.workers.dev/v1/route-check?model=gpt-4', {
    headers: {
      'X-AUTH-TOKEN': 'your-auth-token',
    },
  });
  
  const data = await response.json();
  console.log('Routing info:', data);
}

// Example 9: Health check
async function healthCheck() {
  const response = await fetch('https://your-worker.workers.dev/health');
  const data = await response.json();
  console.log('Health status:', data);
}

// Example 10: Using with streaming (when supported)
async function streamingExample() {
  const response = await openai.chat.completions.create({
    model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'user', content: 'Write a short story about a robot.' },
    ],
    stream: true,
  });
  
  for await (const chunk of response) {
    if (chunk.choices[0]?.delta?.content) {
      process.stdout.write(chunk.choices[0].delta.content);
    }
  }
}

// Example 11: Provider-specific configuration
async function providerSpecificExamples() {
  // Force use of specific provider
  const cloudflareResponse = await openai.chat.completions.create({
    model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    provider: 'cloudflare', // Explicit provider selection
    messages: [{ role: 'user', content: 'Hello from Cloudflare!' }],
  });
  
  // OpenAI with specific parameters
  const openaiResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello from OpenAI!' }],
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
  });
  
  // Gemini with specific parameters
  const geminiResponse = await openai.chat.completions.create({
    model: 'gemini-pro',
    messages: [{ role: 'user', content: 'Hello from Gemini!' }],
    top_p: 0.8,
  });
}

// Example 12: Error handling
async function errorHandlingExample() {
  try {
    const response = await openai.chat.completions.create({
      model: 'invalid-model',
      messages: [{ role: 'user', content: 'Test' }],
    });
  } catch (error) {
    if (error.status === 401) {
      console.error('Authentication failed - check your auth token');
    } else if (error.status === 400) {
      console.error('Invalid request:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Run examples
async function runExamples() {
  console.log('🤖 Cloudflare AI Proxy Examples\n');
  
  await healthCheck();
  await getAvailableModels();
  await checkRouting();
  await estimateTokens();
  
  // Uncomment to test actual AI calls (requires deployed worker)
  // await chatWithCloudflare();
  // await chatWithOpenAI();
  // await chatWithGemini();
}

// Export for use in other modules
export {
  chatWithCloudflare,
  chatWithOpenAI,
  chatWithGemini,
  directFetchExample,
  estimateTokens,
  getAvailableModels,
  checkRouting,
  healthCheck,
  streamingExample,
  providerSpecificExamples,
  errorHandlingExample,
};

// Run if this file is executed directly
if (import.meta.main) {
  runExamples().catch(console.error);
}