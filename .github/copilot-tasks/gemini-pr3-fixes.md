## Copilot Task: Fix Gemini Review comments on PR #3

Apply the following changes to the branch `core-ai-proxy` to resolve flags raised by Gemini.

Tasks:
1. **Token Estimation** - Replace current logic with `tiktoken` library
2. **Security** - Move apikey from URL to header: `x-goog-api-key`.
3. **Broken Tests** - Add tests for `/v1/chat/completions` and `/v1/completions`.
4. **Undefined HTML**
    - Replace /message, /random with valid endpoints.
5. **Fragile Bash parsing**
    - Use `--json` with `wrangler`
    - Parse with `jq`.
6. **Bash USER name**
    - Replace `${USER}` with a constant value.
7. **Model Detection**
    - Replace `idexOf( of gpt-) ` with `startsWith('`gpt-')``.
8. **TypeScript Safety** - Replace `any` with appropriate types.
9. **User Prompt**
    - Replace bare string with `genimia_system_prompt`
    - Require specific prompt input.
