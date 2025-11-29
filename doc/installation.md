# Installation

## Version Compatibility

| Plugin Version | Minimum Firebot Version |
| --- | --- |
| 0.0.1+ | 5.65 |

## Installation: Plugin

1. Enable custom scripts in Firebot (Settings > Scripts) if you have not already done so.
2. From the latest [Release](https://github.com/TheStaticMage/firebot-openai/releases), download `firebot-openai-<version>.js` into your Firebot scripts directory (File > Open Data Folder, then select the "scripts" directory).
3. Go to Settings > Scripts > Manage Startup Scripts > Add New Script and add the `firebot-openai-<version>.js` script.
4. Restart Firebot. (The plugin will not be loaded until you actually restart Firebot.)

## Configuration

You will need an OpenAI API key to use this plugin. Obtain your API key from [OpenAI's API platform](https://platform.openai.com/api-keys).

1. In Firebot, go to **Settings > Integrations > OpenAI**.
2. Paste your API key.
3. Save. No restart is needed.

After installing the plugin and configuring the integration, add the **OpenAI: Run Prompt** effect to an event, channel reward, preset effect list, etc.:

- Set **Model** to the OpenAI model you want to use (defaults to `gpt-4o`).
- Set **Prompt ID** to your Playground prompt cache ID.
- (Optional) Set **Prompt Version** to pin a saved version; leave blank to use the latest.
- Add **Input Mappings** with key-value pairs to send to your prompt.
- (Optional) Set **Maximum Input Length** to 0 for unlimited or a positive number to fail early if exceeded.

For prompt creation and caching steps, see the [OpenAI Setup Guide](/doc/openai-setup.md).

### Verify installation

Run a quick test effect with a known prompt ID. If `$effectOutput[openaiError]` is blank and `$effectOutput[openaiResponse]` contains JSON, the plugin loaded and the integration credentials are working.
