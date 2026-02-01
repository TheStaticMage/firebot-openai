# firebot-openai

This is a [Firebot](https://firebot.app) plugin that allows you to run server-side prompts with OpenAI and use the results in Firebot.

Requirements: Firebot 5.65+, an OpenAI API key, and access to the OpenAI Prompt Caching API.

## Features

- Configure your OpenAI API key under **Settings > Integrations > OpenAI** before running any effects. See the [OpenAI Setup Guide](/doc/openai-setup.md) for details.
- Call the OpenAI Prompt Caching API directly from Firebot using saved Playground prompt IDs (with optional version pinning).
- Firebot effect **OpenAI: Run Prompt** accepts key-value input mappings, model selection (defaults to `gpt-5-nano` for cost efficiency; see [OpenAI models](https://platform.openai.com/docs/models) for all available options and [pricing](https://platform.openai.com/docs/pricing) to compare costs), and an optional max length guard, sends a structured JSON payload (system guard + custom fields), and calls your cached prompt. Consider your expected outcomes when selecting a model - higher capability models cost more per request.
  - Returns two outputs for downstream effects:
    - `$effectOutput[openaiError]` (blank on success)
    - `$effectOutput[openaiResponse]` (the raw JSON body, even when the model wraps it in ```json``` code fences).
  - You can use constructs like these to dig into the OpenAI response:
    - `$objectWalkPath[$effectOutput[openaiResponse], error_response]]` - A more detailed error message
    - `$objectWalkPath[$effectOutput[openaiResponse], some_field]]` - An output field defined in your prompt
  - Optional error handling: stop the effect list if the API request fails or if the response contains an error field. Optionally post a chat feed alert when errors occur.
- Firebot effect **Text-To-Speech (OpenAI)** converts text to audio using OpenAI's TTS API (`tts-1`, `tts-1-hd`, or `gpt-4o-mini-tts` models).
  - Choose from multiple voices (alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse).
  - Adjust playback speed (0.25 to 4.0) and volume (1-10).
  - Optionally provide speaking instructions (prompt) for the `gpt-4o-mini-tts` model.
  - Route audio to system default, overlay, or custom audio device.
  - Optionally wait for audio to finish before proceeding to the next effect.
- Firebot effect **OpenAI: Moderate Text** checks content for policy violations using OpenAI's Moderation API.
  - Optionally stops effect execution if content is flagged (useful for filtering inappropriate chat messages or commands).
  - Returns detailed moderation results including violation categories and confidence scores.
  - Uses fail-closed strategy (treats errors as flagged content) for safety.
- Replace variable **`$openaiModerationCheck[text]`** provides inline content moderation checks.
  - Returns `"true"` if content is flagged, `"false"` if clean.
  - Useful for conditional effects and simple moderation logic.
  - Follows fail-closed behavior (returns `"true"` on errors).

Example use cases:

- Poetry generator that personalizes quick rhymes to the chatter's username.
- Moderator helper that suggests a brief response for mods to paste.
- Chat filter that blocks messages containing policy violations before they appear on stream.

These also work well when combined:

- TTS spam filter that classifies a message with the Run Prompt effect and reads approved messages with the TTS effect.
- Joke generator that returns short, safe one-liners tailored to the viewer's name or topic and speaks them.
- Content moderator that checks messages with the Moderate Text effect, logs violations, and only processes clean content.

## Documentation

- [Installation](/doc/installation.md)
- [Upgrading](/doc/upgrading.md)
- [OpenAI Setup Guide](/doc/openai-setup.md)
- [Prompt Template](/doc/prompt-template.md)
- [Text-To-Speech Guide](/doc/tts.md)
- [Content Moderation Guide](/doc/moderation.md)

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
