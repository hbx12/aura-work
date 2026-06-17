# Model pricing overrides

Aura Work refreshes model prices from remote APIs when available, then falls back to repository pricing files.

Source order:

1. `apps/desktop/src-tauri/resources/pricing-v1.json` provides stable bundled defaults.
2. Curated remote pricing is fetched when the app can reach the configured pricing URL.
3. `apps/desktop/src-tauri/resources/pricing-overrides.json` fills gaps for models that remote sources do not return.
4. OpenRouter model pricing is fetched last and overrides repository entries for matching model IDs.

To add or correct a model price, edit `apps/desktop/src-tauri/resources/pricing-overrides.json`.

Each price is USD per one million tokens:

```json
{
  "providerId": "openai-compatible",
  "modelId": "provider/model-id",
  "displayName": "Model Name",
  "inputPerMillion": 0.5,
  "outputPerMillion": 2.0,
  "cacheReadPerMillion": 0.05,
  "cacheWritePerMillion": 0.625
}
```

`cacheReadPerMillion` and `cacheWritePerMillion` are optional. When a provider reports cached token usage, Aura Work uses these rates in the cost estimate. If a cache rate is missing, Aura Work falls back to the normal input token rate for that cache bucket.

Use the same `modelId` shown by the provider API. For generic OpenAI-compatible endpoints, keep `providerId` as `openai-compatible`. For built-in providers, use `deepseek`, `minimax`, `qwen`, `gemini`, `openai`, `anthropic`, `ollama`, or `lmstudio`.
