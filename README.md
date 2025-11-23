# firebot-openai

This is a [Firebot](https://firebot.app) plugin that allows you to run server-side prompts with OpenAI and use the results in Firebot.

Requirements: Firebot 5.65+, an OpenAI API key, and access to the OpenAI Prompt Caching API.

## Features

- Configure your OpenAI API key and preferred model (defaults to `gpt-4o`) under **Settings > Integrations > OpenAI** before running any effects. See the [OpenAI Setup Guide](/doc/openai-setup.md) for details.
- Call the OpenAI Prompt Caching API directly from Firebot using saved Playground prompt IDs (with optional version pinning).
- Firebot effect **OpenAI: Run Prompt** accepts input text and an optional max length guard, sends a structured JSON payload (system guard + user input + username), and calls your cached prompt.
- Returns two outputs for downstream effects:
  - `$effectOutput[openaiError]` (blank on success)
  - `$effectOutput[openaiResponse]` (the raw JSON body, even when the model wraps it in ```json``` code fences).

Example use cases:

- TTS spam filter that classifies a message, returns a verdict, and outputs a scrubbed string to speak.
- Poetry generator that personalizes quick rhymes to the chatter's username.
- Moderator helper that suggests a brief response for mods to paste.
- Joke generator that returns short, safe one-liners tailored to the viewer's name or topic.

## Documentation

- [Installation](/doc/installation.md)
- [OpenAI Setup Guide](/doc/openai-setup.md)
- [Upgrading](/doc/upgrading.md)

## Support

The best way to get help is in my Discord server. Join [The Static Discord](https://discord.gg/u64fJGh8pb) and visit the `#firebot-openai` channel.

- Please do not DM me on Discord.
- Please do not ask for help in my chat when I am streaming.

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/TheStaticMage/firebot-openai/issues).

## Contributing

Contributions are welcome via [Pull Requests](https://github.com/TheStaticMage/firebot-openai/pulls). I strongly suggest that you contact me before making significant changes. Please refer to the [Contribution Guidelines](/.github/contributing.md) for specifics.

## License

This script is released under the [GNU General Public License version 3](/LICENSE). That makes it free to use whether your stream is monetized or not.

If you use this on your stream, I would appreciate a shout-out. (Appreciated, but not required.)

- <https://www.twitch.tv/thestaticmage>
- <https://kick.com/thestaticmage>
- <https://youtube.com/@thestaticmagerisk>

This script may contain and/or bundle some code from [Firebot](https://github.com/crowbartools/Firebot) itself, which uses the same license.

## Disclaimer

This plugin is not associated with OpenAI. "OpenAI" and "ChatGPT" are trademarks of OpenAI, LP.
