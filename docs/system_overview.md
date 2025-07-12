

🧠 Prompt: Build a Cloudflare AI Proxy Worker (OpenAI-Compatible)

You are building a TypeScript-based Cloudflare Worker that serves as an OpenAI-compatible AI proxy with the following specifications:

⸻

✅ Purpose
	•	Serve OpenAI-compatible endpoints like /v1/chat/completions, /v1/completions, /v1/tokenize
	•	Default to Cloudflare Workers AI, using Meta LLaMA 4 Scout (@cf/meta/llama-4-scout-17b-16e-instruct)
	•	Optionally offload to OpenAI or Gemini using an AI Gateway pattern
	•	Allow specifying the provider and model via JSON payload (e.g., provider, model)
	•	Hide differences from the client — return OpenAI-compatible responses regardless of backend

⸻

⚙️ Core Features
	•	Provider Registry: Central config for available models per provider
	•	Default behavior: Cloudflare AI + LLaMA 4
	•	AI Gateway: Logic to route to OpenAI or Gemini if requested
	•	No context chunking required for Workers AI (LLaMA 4 has 131k token window)
	•	Token estimation endpoint (/v1/tokenize) using tiktoken or fast fallback
	•	Logging layer (optional): D1-based audit trail of requests
	•	Session support: Accept session ID via cookies or headers for request tracking
	•	Secure by default: Requires X-AUTH-TOKEN or uses CORS/key-based policy

⸻

🔌 Input Schema (for /v1/chat/completions)

Accepts:

{
  "model": "@cf/meta/llama-4-scout-17b-16e-instruct",
  "provider": "cloudflare", // or "openai", "gemini"
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Summarize this page." }
  ],
  "temperature": 0.7,
  "stream": false
}


⸻

🧩 Model Registry

const MODEL_REGISTRY = {
  cloudflare: {
    default: "@cf/meta/llama-4-scout-17b-16e-instruct",
    llama4: "@cf/meta/llama-4-scout-17b-16e-instruct",
  },
  openai: {
    default: "gpt-4",
    gpt4: "gpt-4",
    gpt3: "gpt-3.5-turbo",
  },
  gemini: {
    default: "gemini-pro",
  }
};


⸻

📦 Endpoints

Endpoint	Description
/v1/chat/completions	OpenAI-style chat interface (all providers)
/v1/completions	Optional legacy support (Codex-style)
/v1/tokenize	Estimates tokens (via tiktoken or fallback)
/v1/model-options	Returns supported models & metadata
/v1/route-check	Returns active route + model (debug endpoint)


⸻

🛡️ Notes
	•	This Worker will not scrape or violate ToS — it’s used for AI routing only.
	•	Designed to be called by other Workers or services (e.g., your price tracker VM)
	•	AI gateway should cleanly handle rate limits, retries, and provider fallbacks

⸻

Would you like me to:
	•	Generate a full wrangler.toml
	•	Scaffold the src/index.ts
	•	Add d1.ts and ai-router.ts
	•	Include a CLI test harness (curl + run.sh)
	•	Auto-deploy preview URL for testing?

Let me know and I’ll push the complete project structure for you.