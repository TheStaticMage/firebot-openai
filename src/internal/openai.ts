import OpenAI from 'openai';
import { integration } from '../integration-singleton';
import { logger } from '../main';

export const AVAILABLE_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
export const AVAILABLE_TTS_MODELS = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
export const AVAILABLE_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

export interface MessageInput {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
}

export interface ContentBlock {
    type: string;
    text?: string;
    [key: string]: any;
}

export interface OpenAIResponse<T> {
    error: string;
    response: T | null;
}

let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!client) {
        const apiKey = integration.getApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        client = new OpenAI({ apiKey });
    }
    return client;
}

/**
 * Call the OpenAI Prompt Caching API with a given prompt and messages, marshalling the response to type T
 */
export async function callOpenAI<T>(
    promptId: string,
    promptVersion: string | undefined,
    message: string,
    modelId: string
): Promise<OpenAIResponse<T>> {
    try {
        const openaiClient = getOpenAIClient();
        const promptPayload: { id: string; version?: string } = {
            id: promptId
        };

        if (promptVersion) {
            promptPayload.version = promptVersion;
        }

        const response = await openaiClient.responses.create({
            prompt: promptPayload,
            input: message,
            model: modelId,
            max_output_tokens: 2048 // eslint-disable-line camelcase
        });

        const marshalled = marshalResponse<T>(response as Record<string, any>);

        return {
            error: '',
            response: marshalled
        };
    } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        logger.error(`OpenAI API call failed: ${errorMsg}`);
        return {
            error: errorMsg,
            response: null
        };
    }
}

/**
 * Marshal OpenAI responses API output to the expected type
 * Extracts JSON from code block wrapper (```json ... ```)
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function marshalResponse<T>(response: Record<string, any>): T {
    // Extract the message content from OpenAI's response structure
    const output = response.output;
    if (!output || !Array.isArray(output) || output.length === 0) {
        throw new Error('Invalid OpenAI response: no output');
    }

    const textContent = output.find((item: any) => item.type === 'message');
    if (!textContent) {
        throw new Error('Invalid OpenAI response: no message content');
    }

    const content = textContent.content;
    if (!content || !Array.isArray(content) || content.length === 0) {
        throw new Error('Invalid OpenAI response: no content in message');
    }

    const text = content[0]?.text;
    if (!text) {
        throw new Error('Invalid OpenAI response: no text content');
    }

    // Extract JSON from code block wrapper
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;

    try {
        const parsed = JSON.parse(jsonString);
        return parsed as T;
    } catch (parseError: any) {
        logger.error(`Failed to parse JSON from OpenAI response: ${parseError.message}`);
        logger.error(`Response text: ${text}`);
        throw new Error(`Failed to marshal response to expected type: ${parseError.message}`);
    }
}

/**
 * Generate speech audio using OpenAI's Text-to-Speech API
 */
export async function synthesizeSpeech(
    model: string,
    voice: string,
    text: string,
    speed: number,
    prompt?: string
): Promise<OpenAIResponse<Buffer>> {
    try {
        const openaiClient = getOpenAIClient();

        logger.debug(`Synthesizing speech with model: ${model}, voice: ${voice}`);

        const speechOptions: any = {
            model,
            voice,
            input: text,
            speed,
            // eslint-disable-next-line camelcase
            response_format: 'mp3'
        };

        if (model === 'gpt-4o-mini-tts' && prompt) {
            speechOptions.instructions = prompt;
        }

        const response = await openaiClient.audio.speech.create(speechOptions);

        // Convert the response to a Buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        logger.debug(`Successfully synthesized speech, buffer size: ${buffer.length} bytes`);

        return {
            error: '',
            response: buffer
        };
    } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        logger.error(`OpenAI TTS API call failed: ${errorMsg}`);
        return {
            error: errorMsg,
            response: null
        };
    }
}
