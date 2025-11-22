# Firebot Plugin: OpenAI Prompts Integration

## Security

**CRITICAL**: Never log the OpenAI API key. Logging API keys is a critical security vulnerability that could expose user credentials. This includes:

- Never log `getApiKey()` results or the `apiKey` setting value
- Never include API keys in error messages or debug output
- Never serialize/stringify the entire settings object if it contains the API key

When working with the API key, ensure it is only used for direct API calls and never exposed in logs, error messages, or frontend output.
