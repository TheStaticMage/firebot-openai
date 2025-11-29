# Text-to-Speech (OpenAI)

## Basic Setup

1. Confirm your OpenAI API key is configured under **Settings > Integrations > OpenAI**.
2. Add the **Text-To-Speech (OpenAI)** effect to a button, command, or other trigger.
3. Pick a model and voice, enter the text to speak, and choose where the audio should play.
4. Save and run the trigger to verify you hear audio at the expected volume and speed.

## Field Reference

- **Model**: One of `tts-1`, `tts-1-hd`, or `gpt-4o-mini-tts`. Use `gpt-4o-mini-tts` only when you need style instructions.
- **Voice**: Select the voice to render. Matches the list provided by OpenAI.
- **Prompt (Optional)**: Additional speaking instructions for `gpt-4o-mini-tts`. Use static guidance only; do not include untrusted user input.
- **Text to Speak**: The message to read aloud. Supports Firebot variable replacement.
- **Playback Speed**: Slider from `0.25` to `4.0`. Lower numbers slow playback; higher numbers speed it up.
- **Volume**: Slider from `1` (quiet) to `10` (loud). This scales the audio Firebot plays.
- **Wait until TTS is done**: When enabled, the effect waits for playback to finish before the next effect runs.
- **Audio Output Device**: Choose system default, a specific device, or the overlay. If overlay is selected, pick an overlay instance.

## OpenAI Voice Guidance

- Official docs: <https://platform.openai.com/docs/guides/text-to-speech>. It includes pricing notes and curl/Playground examples.
- Try the voices: <https://www.openai.fm/> has quick demos to hear each voice before you pick one in Firebot.
- Pricing: check the OpenAI pricing page linked from those docs; `tts-1` is the lower-cost/fast default, `tts-1-hd` is higher quality at higher cost, and `gpt-4o-mini-tts` focuses on lightweight style control.
- Model choice: start with `tts-1` for most use cases. Use `tts-1-hd` when audio polish matters (e.g., prerecorded lines). Use `gpt-4o-mini-tts` when you need to add short speaking instructions in the Prompt field.
- Hearing samples: open the OpenAI Playground, switch to the Audio (Text to Speech) mode, and play each voice to hear it before selecting it in Firebot.
- Voice character (based on OpenAI samples):
  - alloy: balanced, neutral female
  - ash: male
  - ballad: calm narrator, mid male
  - coral: bright, energetic female
  - echo: deep baritone male
  - fable: storyteller, mid-range female
  - nova: clear, assertive female
  - onyx: rich, lower male
  - sage: warm, relaxed female
  - shimmer: light, playful female
  - verse: male
- Keep prompts short and avoid untrusted input. Put viewer or chat text in **Text to Speak**, not in **Prompt**.

## Tips and Tricks

- Keep the prompt concise. A short style instruction (for example, "speak calmly and clearly") works well.
- Avoid passing viewer messages or other untrusted text into the prompt field. Put untrusted text in **Text to Speak** instead.
- If you need fast sequencing, uncheck **Wait until TTS is done** so later effects run immediately.
