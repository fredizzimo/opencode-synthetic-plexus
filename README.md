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
  "verbose": false
}
```

Get your Synthetic API key from [synthetic.new](https://synthetic.new/).

### With Plexus

Set `plexusAdminKey` to enable Plexus mode:

```json
{
  "providerName": "synthetic-plexus",
  "plexusUrl": "http://localhost:8080",
  "syntheticApiKey": "your-synthetic-api-key",
  "plexusAdminKey": "your-plexus-admin-key",
  "verbose": false
}
```

- `syntheticApiKey`: Your Synthetic API key from [synthetic.new](https://synthetic.new/)
- `plexusAdminKey`: Admin key for Plexus management API (see Plexus documentation)

You can also create a project-specific config at `.opencode/synthetic-plexus.json` which will override the global config.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `plexusUrl` | string | `http://localhost:8080` | URL of the Plexus server (used when `plexusAdminKey` is set) |
| `syntheticApiUrl` | string | `https://api.synthetic.new/openai/v1` | URL of the Synthetic API (used when `plexusAdminKey` is not set) |
| `providerName` | string | `synthetic` (or `synthetic-plexus` with Plexus) | Name for the provider in OpenCode config |
| `syntheticApiKey` | string | - | API key for Synthetic API (required) |
| `plexusAdminKey` | string | - | Admin key for Plexus management API (enables Plexus mode when set) |
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

## How It Works

1. On OpenCode startup, the plugin loads configuration from global and project config files
2. It fetches available models from the Synthetic API
3. It updates OpenCode's in-memory configuration with Synthetic API as the provider URL directly
4. If `plexusAdminKey` is set:
   - It syncs those models to Plexus, creating/updating providers and aliases
   - It updates OpenCode's in-memory configuration with Plexus as the provider URL

## Connecting the Provider in OpenCode

After configuring the plugin, connect the provider in OpenCode:

1. Run `opencode provider login`
2. Scroll down and select `other`
3. Type the provider name (e.g., `synthetic` or `synthetic-plexus` depending on your config)
4. Enter the API key:
   - **Direct Synthetic**: Use the same Synthetic API key from your config
   - **Plexus**: Create an API key through the Plexus dashboard (Keys section) and use its secret

## Publishing

To publish a new version to npm:

```bash
npm login
npm run build
npm publish
```


## License

MIT
