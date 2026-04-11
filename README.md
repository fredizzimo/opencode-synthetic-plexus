# OpenCode Synthetic Plexus Plugin

An OpenCode plugin that syncs AI models from the Synthetic API to Plexus (a model proxy server) and dynamically updates OpenCode configuration with those models.

## Features

- Syncs models from Synthetic API to Plexus on OpenCode startup (optional)
- Dynamically updates OpenCode config with model metadata
- Can operate without Plexus, using Synthetic API directly
- Configurable provider name and URLs
- Environment variable substitution for secure credential handling
- Per-model options and custom variants support
- Verbose logging option for debugging

## Prerequisites

- [OpenCode](https://opencode.ai) installed
- Access to a [Synthetic API](https://github.com/anomalyco/synthetic) instance
- (Optional) Access to a [Plexus](https://github.com/anomalyco/plexus) server

## Installation

### From npm (Recommended)

```bash
npm install opencode-synthetic-plexus
```

Add the plugin to your OpenCode configuration (`~/.config/opencode/opencode.json`):

```json
{
  "plugins": [
    "opencode-synthetic-plexus"
  ]
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
  "plugins": [
    "/path/to/opencode-synthetic-plexus"
  ]
}
```

## Configuration

Create a configuration file at `~/.config/opencode/synthetic-plexus.json`:

### Default (direct Synthetic API)

```json
{
  "providerName": "synthetic",
  "syntheticApiKey": "your-synthetic-api-key",
  "syncEnabled": true,
  "verbose": false
}
```

### With Plexus

Set `plexusAdminKey` to enable Plexus mode:

```json
{
  "providerName": "synthetic-plexus",
  "plexusUrl": "http://localhost:8080",
  "syntheticApiKey": "your-synthetic-api-key",
  "plexusAdminKey": "your-plexus-admin-key",
  "syncEnabled": true,
  "verbose": false
}
```

You can also create a project-specific config at `.opencode/synthetic-plexus.json` which will override the global config.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `plexusUrl` | string | `http://localhost:8080` | URL of the Plexus server (used when `plexusAdminKey` is set) |
| `syntheticApiUrl` | string | `https://api.synthetic.new/openai/v1` | URL of the Synthetic API (used when `plexusAdminKey` is not set) |
| `providerName` | string | `synthetic` (or `synthetic-plexus` with Plexus) | Name for the provider in OpenCode config |
| `syntheticApiKey` | string | - | API key for Synthetic API (required) |
| `plexusAdminKey` | string | - | Admin key for Plexus management API (enables Plexus mode when set) |
| `syncEnabled` | boolean | `true` | Enable/disable model syncing |
| `verbose` | boolean | `false` | Enable verbose logging |
| `modelOptions` | object | `{}` | Custom model config merged with generated config |

### Environment Variables

You can use environment variable substitution in the config file using the `{env:VAR_NAME}` syntax:

```json
{
  "syntheticApiKey": "{env:SYNTHETIC_API_KEY}",
  "plexusAdminKey": "{env:PLEXUS_ADMIN_KEY}"
}
```

Environment variables can also be used as fallbacks:
- `SYNTHETIC_API_KEY` - Falls back if `syntheticApiKey` not set in config
- `PLEXUS_ADMIN_KEY` - Falls back if `plexusAdminKey` not set in config
- `PLEXUS_URL` - Falls back if `plexusUrl` not set in config
- `SYNTHETIC_API_URL` - Falls back if `syntheticApiUrl` not set in config

### Model Options

You can customize model configuration by providing additional options that will be merged with the auto-generated config:

```json
{
  "modelOptions": {
    "GLM-5": {
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

User-provided options are deep-merged with the generated configuration, so you can override any property. To use a variant, select it in OpenCode by cycling through variants or specifying it in the model name: `synthetic-plexus/GLM-5:thinking`.

See the [OpenCode models documentation](https://opencode.ai/docs/models/) for all available configuration options.

## How It Works

1. On OpenCode startup, the plugin loads configuration from global and project config files
2. It fetches available models from the Synthetic API
3. If `plexusAdminKey` is set:
   - It syncs those models to Plexus, creating/updating providers and aliases
   - It updates OpenCode's in-memory configuration with Plexus as the provider URL
4. If `plexusAdminKey` is not set (default):
   - It updates OpenCode's in-memory configuration with Synthetic API as the provider URL directly

## Publishing

To publish a new version to npm:

```bash
npm login
npm run build
npm publish
```

## Connecting the Provider in OpenCode

After configuring the plugin, you need to connect the provider in OpenCode:

1. Run `opencode provider login`
2. Scroll down and select `other`
3. Type the provider name (e.g., `synthetic` or `synthetic-plexus` depending on your config)
4. Enter the API key (see below for how to obtain it)

### Getting an API Key

#### Without Plexus (Direct Synthetic API)

Use your Synthetic API key directly. This is the same key configured in `syntheticApiKey` in your plugin config.

#### With Plexus

Plexus requires API keys for authentication. Configure keys through the Admin UI:

1. Open the Plexus dashboard (default: `http://localhost:4000`)
2. Navigate to the **Keys** section
3. Add a new key with a secret (e.g., `sk-plexus-my-key`)

Use the `secret` value as the API key when connecting the provider in OpenCode.

## License

MIT
