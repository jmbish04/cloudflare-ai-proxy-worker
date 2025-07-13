# Cloudflare AI Proxy Worker

An OpenAI-compatible AI proxy built on Cloudflare Workers that routes requests to multiple AI providers including Cloudflare Workers AI, OpenAI, and Google Gemini.

## Features

### 🤖 Multi-Provider Support
- **Cloudflare Workers AI** - Default provider with Meta LLaMA 4 Scout
- **OpenAI** - GPT-4, GPT-3.5-turbo support
- **Google Gemini** - Gemini Pro models

### 🔗 OpenAI-Compatible API
- `/v1/chat/completions` - Chat interface compatible with OpenAI
- `/v1/completions` - Legacy text completion support
- `/v1/tokenize` - Token estimation endpoint
- `/v1/model-options` - Available models and metadata
- `/v1/route-check` - Debug endpoint for routing verification

### 🛡️ Security Features
- `X-AUTH-TOKEN` authentication
- CORS support for web applications
- Session tracking via cookies or headers

### 📊 Optional Features
- D1 database logging for request tracking
- Token usage monitoring
- Provider availability checking
- Rate limiting support

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account with Workers AI enabled
- Wrangler CLI installed globally

### Installation

```bash
npm install
```

### Development

```bash
# Start development server
npm run dev

# The worker will be available at http://localhost:8787
```

### Configuration

#### Environment Variables
Set these via `wrangler secret put` for production:

```bash
# Optional API keys for external providers
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY

# Optional authentication token
wrangler secret put AUTH_TOKEN
```

#### Wrangler Configuration
The `wrangler.jsonc` file includes:
- AI binding for Cloudflare Workers AI
- Optional D1 database binding for logging
- Smart placement for optimal performance

## API Usage

### Health Check
```bash
curl http://localhost:8787/health
```

### Available Models
```bash
curl http://localhost:8787/v1/model-options
```

### Chat Completion
```bash
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-AUTH-TOKEN: your-token" \
  -d '{
    "model": "@cf/meta/llama-4-scout-17b-16e-instruct",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "temperature": 0.7
  }'
```

### Token Estimation
```bash
curl -X POST http://localhost:8787/v1/tokenize \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Count the tokens in this text",
    "model": "@cf/meta/llama-4-scout-17b-16e-instruct"
  }'
```

### Provider Routing
```bash
curl "http://localhost:8787/v1/route-check?model=gpt-4"
```

## Provider Configuration

### Cloudflare Workers AI (Default)
- Model: `@cf/meta/llama-4-scout-17b-16e-instruct`
- Context window: 131k tokens
- No API key required (uses Workers AI binding)

### OpenAI
- Models: `gpt-4`, `gpt-3.5-turbo`
- Requires `OPENAI_API_KEY` environment variable
- Automatic routing for models containing "gpt"

### Google Gemini
- Models: `gemini-pro`, `gemini-1.5-pro`
- Requires `GEMINI_API_KEY` environment variable
- Automatic routing for models containing "gemini"

## Request Schema

### Chat Completion Request
```typescript
{
  model: string;              // Model identifier
  provider?: "cloudflare" | "openai" | "gemini"; // Optional explicit provider
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;       // 0-2, default 0.7
  max_tokens?: number;       // Maximum response tokens
  stream?: boolean;          // Streaming support
  stop?: string | string[]; // Stop sequences
  top_p?: number;           // 0-1, nucleus sampling
  frequency_penalty?: number; // -2 to 2
  presence_penalty?: number;  // -2 to 2
}
```

### Response Format
OpenAI-compatible response format:
```typescript
{
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: "stop" | "length" | "content_filter" | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

## Model Registry

The proxy automatically routes requests based on model names:

| Model Pattern | Provider | Example |
|--------------|----------|---------|
| `@cf/*` | Cloudflare | `@cf/meta/llama-4-scout-17b-16e-instruct` |
| `gpt-*` | OpenAI | `gpt-4`, `gpt-3.5-turbo` |
| `*gemini*` | Gemini | `gemini-pro`, `gemini-1.5-pro` |

## Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Deploy with secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put AUTH_TOKEN
```

### Optional D1 Database Setup

1. Create D1 database:
```bash
wrangler d1 create ai-proxy-logs
```

2. Update `wrangler.jsonc` with your database ID:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ai-proxy-logs",
      "database_id": "your-database-id-here"
    }
  ]
}
```

3. The worker will automatically create the necessary tables.

## Security

### Authentication
- Set `AUTH_TOKEN` environment variable to require authentication
- Send token via `X-AUTH-TOKEN` header or `auth_token` query parameter
- If no token is configured, all requests are allowed

### CORS
- Configurable CORS origins in `src/config.ts`
- Default allows all origins (`*`)
- Supports preflight requests

### Session Tracking
- Optional session IDs via `X-SESSION-ID` header or `session_id` cookie
- Useful for request tracking and rate limiting

## Monitoring

### Logging
When D1 database is configured, the worker logs:
- Request method and path
- Provider and model used
- Session ID (if provided)
- Token usage
- Response time
- HTTP status

### Health Monitoring
- `/health` endpoint shows provider availability
- Provider status based on API key configuration
- Real-time availability checking

## Testing

```bash
# Run tests
npm test

# Type checking
npx tsc --noEmit
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Proxy Worker   │    │   AI Provider   │
│                 │    │                 │    │                 │
│  OpenAI SDK ────┼────┼─→ Router ───────┼────┼─→ Cloudflare AI │
│                 │    │  │              │    │   OpenAI        │
│                 │    │  ├─ Auth        │    │   Gemini        │
│                 │    │  ├─ Logging     │    │                 │
│                 │    │  └─ Tokens      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Development

### File Structure
```
src/
├── index.ts              # Main worker entry point
├── types.ts              # TypeScript definitions
├── config.ts             # Model registry and configuration
├── router.ts             # AI provider routing logic
├── providers/            # Provider implementations
│   ├── cloudflare.ts     # Cloudflare Workers AI
│   ├── openai.ts         # OpenAI API
│   └── gemini.ts         # Google Gemini API
└── utils/                # Utility functions
    ├── auth.ts           # Authentication helpers
    ├── logging.ts        # D1 logging utilities
    └── tokens.ts         # Token estimation
```

### Adding New Providers

1. Create provider implementation in `src/providers/`
2. Add provider to `AIProvider` type in `src/types.ts`
3. Update model registry in `src/config.ts`
4. Add routing logic in `src/router.ts`

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Google Gemini API Documentation](https://ai.google.dev/docs/)