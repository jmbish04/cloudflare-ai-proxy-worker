/**
 * Example usage of the new /gemini endpoint
 */

// Example 1: Simple text generation
const simpleExample = {
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Write a short poem about TypeScript"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1000
  }
};

// Example 2: With system instruction and model specification
const advancedExample = {
  "model": "gemini-1.5-pro",
  "systemInstruction": {
    "parts": [
      {
        "text": "You are a helpful programming assistant. Always provide clear, concise explanations with code examples when relevant."
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Explain how to implement a simple REST API in Node.js"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 2048,
    "topP": 0.8
  }
};

// Example 3: Multi-turn conversation
const conversationExample = {
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "What is the capital of France?"
        }
      ]
    },
    {
      "role": "model",
      "parts": [
        {
          "text": "The capital of France is Paris."
        }
      ]
    },
    {
      "role": "user",
      "parts": [
        {
          "text": "What is the population of that city?"
        }
      ]
    }
  ]
};

// Example usage:
// curl -X POST https://your-worker.your-subdomain.workers.dev/gemini \
//   -H "Content-Type: application/json" \
//   -H "X-AUTH-TOKEN: your-auth-token" \
//   -d '{"contents":[{"role":"user","parts":[{"text":"Hello, Gemini!"}]}]}'

export { simpleExample, advancedExample, conversationExample };