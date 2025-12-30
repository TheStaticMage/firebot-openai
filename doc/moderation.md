# Content Moderation (OpenAI)

## Overview

The OpenAI moderation capabilities allow you to check text content for policy violations before processing chat messages, commands, or other user input. OpenAI's moderation API detects categories like harassment, hate speech, violence, sexual content, and self-harm.

The plugin provides two ways to moderate content:

1. **Moderate Text Effect**: A Firebot effect that checks text and optionally stops effect execution if content is flagged.
2. **Replace Variable**: An inline check that returns `"true"` or `"false"` for use in conditional effects or other logic.

Both approaches use OpenAI's moderation API and follow a fail-closed strategy (treating errors as flagged content to ensure safety).

:warning: **Important**: The OpenAI moderation API is **not** (necessarily) a profanity filter. It takes into account the full context of the message. Even harsh profanity can pass this moderation check if it is not directed at a person or protected class.

## Basic Setup

1. Confirm your OpenAI API key is configured under **Settings > Integrations > OpenAI**.
2. Choose either the effect or replace variable based on your needs:
   - Use the **effect** when you want detailed moderation results and execution control
   - Use the **replace variable** for simple inline checks within text fields

## Moderate Text Effect

### Field Reference

- **Text to Moderate**: The content to check for policy violations. Supports Firebot variable replacement, allowing you to moderate chat messages, command arguments, or any dynamic text.
- **Moderation Model**: Select either `omni-moderation-latest` (recommended) or `text-moderation-latest` (legacy). The omni model provides more accurate results and supports multiple languages.
- **Stop execution if flagged**: When enabled, this effect stops the effect chain if content violates policies. Use this to prevent processing of inappropriate content.
- **Bubble stop to parent effect list**: Only available when "Stop execution if flagged" is enabled. When both are enabled, stopping execution will also bubble to the parent effect list, halting execution at a higher level.

### Effect Outputs

The effect provides three output variables you can reference in subsequent effects:

- **`$effectOutput[moderationFlagged]`**: Boolean indicating if content was flagged (`true` = violation detected, `false` = clean)
- **`$effectOutput[moderationResult]`**: Full JSON response from OpenAI including category details and confidence scores
- **`$effectOutput[moderationError]`**: Error message if the API call failed (empty string on success)

### Example Workflows

**Chat Moderation:**

1. Add "Moderate Text" effect with text set to `$chatMessage`
2. Enable "Stop execution if flagged"
3. Add subsequent effects (like sending the message to chat) that only run if moderation passes

**Command Filtering with Logging:**

1. Add "Moderate Text" effect with text set to `$arg[all]`
2. Leave "Stop execution if flagged" disabled
3. Add conditional effect checking if `$effectOutput[moderationFlagged]` equals "true"
4. Log flagged content details using `$effectOutput[moderationResult]` for review
5. Continue or stop based on your moderation policy

**Multi-Check Workflow:**

1. Moderate username with one effect
2. Moderate message content with another effect
3. Use conditional logic to proceed only if both pass

## Moderation Check Replace Variable

### Usage

```text
$openaiModerationCheck[text to check]
```

### Returns

- `"true"` if content is flagged or an error occurs (fail-closed)
- `"false"` if content passes moderation

### Limitations

- **Single argument only**: The replace variable accepts only the text to moderate. It always uses `omni-moderation-latest`.
- **No detailed results**: Unlike the effect, the replace variable returns only flagged status (not categories or scores).
- **Fail-closed behavior**: API errors, empty text, or missing responses return `"true"` to ensure safety.

### Example Usage

**Conditional Effect:**

```text
Use a Conditional Effects wrapper:
- Condition: `$openaiModerationCheck[$chatMessage]` equals "false"
- Child effects: Process the clean message
```

**Text Substitution:**

```text
Set a variable based on moderation:
- If `$openaiModerationCheck[$arg[1]]` equals "true"
  - Set `$customVariable[status]` to "blocked"
- Else
  - Set `$customVariable[status]` to "allowed"
```

## Understanding Moderation Categories

OpenAI's [moderation API](https://platform.openai.com/docs/guides/moderation) checks content against these categories:

- **harassment**: Threatening or bullying language
- **harassment/threatening**: Content that includes violent threats
- **hate**: Content promoting hate based on identity
- **hate/threatening**: Hateful content that includes violence or serious harm
- **self-harm**: Content promoting or encouraging self-harm
- **self-harm/intent**: Content where someone expresses intent to self-harm
- **self-harm/instructions**: Content providing self-harm instructions
- **sexual**: Sexual content
- **sexual/minors**: Sexual content involving minors
- **violence**: Content depicting violence or celebrating suffering
- **violence/graphic**: Graphic violent content

The `moderationResult` output contains both boolean flags for each category and numerical confidence scores (0-1) indicating how strongly the content matches each category. Use Firebot's `$objectWalkPath` to extract specific fields.

## Error Handling and Fail-Closed Behavior

Both the effect and replace variable follow a fail-closed strategy:

- **Empty or whitespace-only text**: Treated as flagged
- **API errors** (rate limits, network issues, authentication): Treated as flagged
- **Missing or malformed responses**: Treated as flagged

This ensures that moderation failures do not allow unmoderated content through. However, it means temporary API issues will block all content until resolved.

:bulb: **Tip**: Monitor the `moderationError` output or check Firebot logs to distinguish between actual policy violations and technical errors.

## Tips and Tricks

- Use `omni-moderation-latest` for the best accuracy and language support. Only use `text-moderation-latest` if you need consistency with older implementations.
- For high-value moderation (like user input that will be read by TTS), use the effect with "Stop execution if flagged" enabled.
- For informational checks (like logging suspicious content), use the effect without stopping execution and review `moderationResult` details.
- The replace variable is convenient for simple checks but provides no error details.
- Parse the `moderationResult` JSON using Firebot's `$objectWalkPath` if you need to check specific categories (e.g., only block on `violence` or `hate`).
- The moderation endpoint is [free to use and does not count against quotas](https://help.openai.com/en/articles/4936833-is-the-moderation-endpoint-free-to-use). It is good for use as a pre-filter.
- Test your moderation logic with known clean and flagged examples before using live on your stream.

## OpenAI Documentation

- Moderation API overview: <https://platform.openai.com/docs/guides/moderation>
- API reference: <https://platform.openai.com/docs/api-reference/moderations>
