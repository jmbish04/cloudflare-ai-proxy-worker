<!m-- model: gpt-4o -->

# Copilot Task: Core Endpoints

This task implements the core features for the Cloudflare Worker AI Proxy spec. Fully implement endpoints and framework to route to Cloudflare, OpenAI, and Gemini models, as requested.

Start with a new file `src/ai-gateway.ts` or break into sections if you need to. Export the main service interfaces from here.

Task Requirements:

- [] Implement the following endpoints in `src/index.ts`
  - /v1/chat/completions
  - /v1/completions
  - /v1/tokenize
  - /v1/model-options
  - /v1/route-check
- [] Add model registry in ai-gateway.ts
- [] Implement token estimation endpoint
- [] Object to support injecting cookie/header based session tracking
- [] Secure endpoints using X-AUTH-TOKEN <or CORS mechanism

## Testing

- [] Create unit tests with mocked requests to each endpoint
- [] Verify model routing, session storage, and post-logging is working as expected
