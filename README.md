# OpenCode Synthetic Plexus Plugin

An [OpenCode](https://opencode.ai) plugin that syncs AI models from [Synthetic](https://synthetic.new/) to OpenCode, with optional [Plexus](https://github.com/anomalyco/plexus) integration for model proxying.

## Features

- Syncs models from Synthetic to OpenCode on startup
- Optional Plexus integration for model proxying
- Dynamically updates OpenCode config with model metadata and pricing
- Syncs model list and pricing to Plexus when enabled
- Configurable provider name and URLs
- Environment variable substitution for secure credential handling
- Per-model options and custom variants support

## Prerequisites

- [OpenCode](https://opencode.ai) installed
- Access to a [Synthetic API](https://synthetic.new/) instance
- (Optional) Access to a [Plexus](https://github.com/anomalyco/plexus) server

## Installation

Add the plugin to your OpenCode configuration (`~/.config/opencode/opencode.json`):

```json
{
  "plugins": ["@fredizzimo/opencode-synthetic-plexus"]
}
```

### From Source

```bash
git clone <repository-url>
cd opencode-synthetic-plexus
npm install
npm run build
```

Add the plugin to your OpenCode configuration:

```json
{
  "plugins": ["/path/to/opencode-synthetic-plexus"]
}
```

## Configuration

Create a configuration file at `~/.config/opencode/synthetic-plexus.json`:

### Default (direct Synthetic API)

```json
{
  "openCodeSyntheticProviderName": "synthetic-direct",
  "syntheticApiKey": "your-synthetic-api-key"
}
```

Get your Synthetic API key from [synthetic.new](https://synthetic.new/).

### With Plexus

Set `plexusAdminKey` and `openCodePlexusProviderName` to enable Plexus mode:

```json
{
  "openCodePlexusProviderName": "synthetic-plexus",
  "plexusUrl": "http://localhost:8080",
  "syntheticApiKey": "your-synthetic-api-key",
  "plexusAdminKey": "your-plexus-admin-key"
}
```

You can also register both direct and Plexus providers simultaneously by setting both provider names:

```json
{
  "openCodeSyntheticProviderName": "synthetic-direct",
  "openCodePlexusProviderName": "synthetic-plexus",
  "plexusUrl": "http://localhost:8080",
  "syntheticApiKey": "your-synthetic-api-key",
  "plexusAdminKey": "your-plexus-admin-key"
}
```

- `openCodeSyntheticProviderName`: The name used to register the provider **in OpenCode** when connecting directly to Synthetic. Defaults to `"synthetic-direct"`. The name `"synthetic"` is not allowed because it collides with models.dev. This is the name you select when running `opencode provider login`.
- `openCodePlexusProviderName`: The name used to register the provider **in OpenCode** when connecting through Plexus. No default — must be set explicitly to enable the Plexus provider in OpenCode. This is the name you select when running `opencode provider login`.
- `plexusProviderName`: The name used to register the provider **inside Plexus**. Defaults to `"synthetic"`. This is an internal Plexus identifier and is separate from the OpenCode provider names above.
- `syntheticApiKey`: Your Synthetic API key from [synthetic.new](https://synthetic.new/)
- `plexusAdminKey`: Admin key for Plexus management API (see Plexus documentation)

You can also create a project-specific config at `.opencode/synthetic-plexus.json` which will override the global config.

## Configuration Options

| Option                          | Type   | Default                               | Description                                                                      |
| ------------------------------- | ------ | ------------------------------------- | -------------------------------------------------------------------------------- |
| `plexusUrl`                     | string | `http://localhost:8080`               | URL of the Plexus server (used when `plexusAdminKey` is set)                     |
| `syntheticApiUrl`               | string | `https://api.synthetic.new/openai/v1` | URL of the Synthetic API (used when `plexusAdminKey` is not set)                 |
| `openCodeSyntheticProviderName` | string | `synthetic-direct`                    | Name for the direct Synthetic provider in OpenCode (cannot be `"synthetic"`)     |
| `openCodePlexusProviderName`    | string | —                                     | Name for the Plexus provider in OpenCode (required to enable Plexus in OpenCode) |
| `plexusProviderName`            | string | `synthetic`                           | Name for the provider inside Plexus (only used in Plexus mode)                   |
| `syntheticApiKey`               | string | -                                     | API key for Synthetic API (required)                                             |
| `plexusAdminKey`                | string | -                                     | Admin key for Plexus management API (enables Plexus mode when set)               |
| `cacheDiscount`                 | number | `80`                                  | Cache read discount percentage (0–100) applied to the API price                  |
| `modelOptions`                  | object | `{}`                                  | Custom model config merged with generated config                                 |

### Cache Discount

The Synthetic API returns the full (non-discounted) cache read price. Synthetic plans include an **80% discount** on cache reads, so the plugin applies this discount by default. The `cacheDiscount` setting controls what percentage is subtracted from the API's listed cache read price.

> **Usage Based Billing:** If you are on a Usage Based Billing plan, there is no cache discount. Set `cacheDiscount` to `0` to use the full API price:
>
> ```json
> {
>   "cacheDiscount": 0
> }
> ```

### Environment Variables

You can use environment variable substitution in config values by placing `{env:VAR_NAME}` inside a quoted string:

```json
{
  "syntheticApiKey": "{env:SYNTHETIC_API_KEY}",
  "plexusAdminKey": "{env:PLEXUS_ADMIN_KEY}"
}
```

> **Security:** Avoid storing plaintext API keys in config files. Use the `{env:...}` syntax to reference environment variables instead.

### Model Options

You can customize model configuration and define variants by providing options that will be merged with the auto-generated config:

```json
{
  "modelOptions": {
    "claude-sonnet-4-20250514": {
      "options": { "temperature": 0.7 },
      "variants": {
        "thinking": {
          "reasoningEffort": "high",
          "textVerbosity": "low"
        },
        "fast": {
          "reasoningEffort": "low"
        }
      }
    }
  }
}
```

- **options**: Default options applied to the base model
- **variants**: Named configurations that can be selected in OpenCode

User-provided options are deep-merged with the generated configuration, so you can override any property.

See the [OpenCode models documentation](https://opencode.ai/docs/models/) for all available configuration options.

### Interleaved Thinking

Some reasoning models support **interleaved thinking**, where reasoning tokens are interleaved with the response. OpenCode supports this via the `interleaved` field, but the Synthetic API does not currently expose this information. To enable it for models that support it, set it manually via `modelOptions`:

```json
{
  "modelOptions": {
    "DeepSeek-R1": {
      "interleaved": { "field": "reasoning_content" }
    },
    "MiniMax-M2.5": {
      "interleaved": { "field": "reasoning_details" }
    }
  }
}
```

The `interleaved` field accepts three values:

- `true` — models with native interleaved thinking support (e.g., Anthropic Claude)
- `{ "field": "reasoning_content" }` — DeepSeek, Kimi, Qwen3, and similar models
- `{ "field": "reasoning_details" }` — Gemini 3.x, MiniMax M2.x, GLM 4.7+, and similar models

You can check [models.dev/api.json](https://models.dev/api.json) to see which `interleaved` value a model uses — search for the model name and look at its `interleaved` field.

## How It Works

1. On OpenCode startup, the plugin loads configuration from global and project config files
2. It fetches available models from the Synthetic API
3. If `openCodeSyntheticProviderName` is set (defaults to `"synthetic-direct"`), it registers a direct Synthetic provider in OpenCode
4. If `plexusAdminKey` is set:
   - It syncs those models to Plexus, creating/updating providers and aliases
   - If `openCodePlexusProviderName` is set, it registers a Plexus provider in OpenCode

## Connecting the Provider in OpenCode

After configuring the plugin, connect the provider in OpenCode:

1. Run `opencode provider login`
2. Scroll down and select `other`
3. Type the provider name matching your config (e.g., `synthetic-direct` for direct mode, or `synthetic-plexus` for Plexus mode — see `openCodeSyntheticProviderName` and `openCodePlexusProviderName`). Note: the name `synthetic` is not allowed as it collides with models.dev.
4. Enter the API key:
   - **Direct Synthetic**: Use the same Synthetic API key from your config
   - **Plexus**: Create an API key through the Plexus dashboard (Keys section) and use its secret

## Releasing & Publishing

Releases are automated via GitHub Actions. Pushing a `v*` tag triggers the release workflow, which runs checks, creates a GitHub Release, and publishes to npm.

### Creating a release

1. Bump the version in `package.json`
2. Commit and tag:
   ```bash
   git add package.json
   git commit -m "Release v1.2.3"
   git tag v1.2.3
   git push origin main --tags
   ```
3. The CI workflow will run checks, create a GitHub Release with auto-generated notes, and publish the package to npm.

### Re-publishing if npm publish fails

If the tag push succeeded but npm publishing failed, you can re-run just the publish step:

1. Go to **Actions** → **Release** workflow in GitHub
2. Click **Run workflow**
3. Enter the version number (e.g. `1.2.3`)
4. This checks out the corresponding tag and re-attempts the publish, skipping the GitHub Release step since it already exists.

### Trusted publishing

This package uses [npm trusted publishing](https://docs.npmjs.com/guides/publishing-a-package#publishing-from-github-actions) (OIDC) to publish from GitHub Actions without storing long-lived tokens. No `NPM_TOKEN` secret is required.

## License

MIT
