import { textToSpeechEffect } from '../text-to-speech';
import * as openaiModule from '../../internal/openai';

jest.mock('../../internal/openai');
jest.mock('../../main', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    },
    firebot: {
        modules: {
            frontendCommunicator: {
                fireEventAsync: jest.fn().mockResolvedValue(2.5),
                send: jest.fn(),
                onAsync: jest.fn()
            },
            webServer: {
                sendToOverlay: jest.fn()
            },
            resourceTokenManager: {
                storeResourcePath: jest.fn().mockReturnValue('test-token')
            },
            settingsManager: {
                getSetting: jest.fn().mockReturnValue({ deviceId: 'default', label: 'System Default' })
            },
            effectManager: {
                registerEffect: jest.fn()
            }
        }
    }
}));
jest.mock('fs');
jest.mock('fs/promises');
jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => 'test-uuid-123')
}));
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/'))
}));
jest.mock('os', () => ({
    tmpdir: jest.fn(() => '/tmp')
}));

const mockedSynthesizeSpeech = openaiModule.synthesizeSpeech as jest.MockedFunction<typeof openaiModule.synthesizeSpeech>;

describe('Text-to-Speech Effect', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('optionsValidator', () => {
        it('should reject empty text', () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const errors = textToSpeechEffect.optionsValidator!({
                model: 'tts-1' as any,
                voice: 'alloy' as any,
                text: ''
            } as any);

            expect(errors).toContain('Please enter text to speak.');
        });

        it('should reject speed below 0.25', () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const errors = textToSpeechEffect.optionsValidator!({
                model: 'tts-1' as any,
                voice: 'alloy' as any,
                text: 'Hello',
                speed: 0.1
            } as any);

            expect(errors).toContain('Playback speed must be between 0.25 and 4.0.');
        });

        it('should reject speed above 4.0', () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const errors = textToSpeechEffect.optionsValidator!({
                model: 'tts-1' as any,
                voice: 'alloy' as any,
                text: 'Hello',
                speed: 5.0
            } as any);

            expect(errors).toContain('Playback speed must be between 0.25 and 4.0.');
        });

    });

    describe('onTriggerEvent', () => {
        it('should successfully synthesize speech', async () => {
            const mockBuffer = Buffer.from('mock audio data');
            mockedSynthesizeSpeech.mockResolvedValue({
                error: '',
                response: mockBuffer
            });

            const event = {
                effect: {
                    model: 'tts-1',
                    voice: 'alloy',
                    text: 'Hello world',
                    speed: 1.0,
                    volume: 5,
                    waitForSound: true,
                    audioOutputDevice: { deviceId: 'default', label: 'System Default' }
                }
            } as any;

            const resultPromise = textToSpeechEffect.onTriggerEvent(event);
            await jest.advanceTimersByTimeAsync(5000);
            const result = await resultPromise as any;

            expect(result.success).toBe(true);
            expect(result.outputs.ttsError).toBe('');
            expect(mockedSynthesizeSpeech).toHaveBeenCalledWith('tts-1', 'alloy', 'Hello world', 1.0, undefined);
        });

        it('should handle TTS API errors', async () => {
            const errorMessage = 'API rate limit exceeded';
            mockedSynthesizeSpeech.mockResolvedValue({
                error: errorMessage,
                response: null
            });

            const event = {
                effect: {
                    model: 'tts-1',
                    voice: 'echo',
                    text: 'Hello world',
                    speed: 1.0,
                    volume: 5
                }
            } as any;

            const result = await textToSpeechEffect.onTriggerEvent(event) as any;

            expect(result.success).toBe(false);
            expect(result.outputs.ttsError).toBe(errorMessage);
        });

        it('should pass prompt to synthesizeSpeech for gpt-4o-mini-tts model', async () => {
            const mockBuffer = Buffer.from('mock audio data');
            mockedSynthesizeSpeech.mockResolvedValue({
                error: '',
                response: mockBuffer
            });

            const event = {
                effect: {
                    model: 'gpt-4o-mini-tts',
                    voice: 'nova',
                    text: 'Hello world',
                    prompt: 'Speak in a friendly tone',
                    speed: 1.0,
                    volume: 5
                }
            } as any;

            const resultPromise = textToSpeechEffect.onTriggerEvent(event);
            await jest.runAllTimersAsync();
            await resultPromise;

            expect(mockedSynthesizeSpeech).toHaveBeenCalledWith(
                'gpt-4o-mini-tts',
                'nova',
                'Hello world',
                1.0,
                'Speak in a friendly tone'
            );
        });

        it('should use default values when not specified', async () => {
            const mockBuffer = Buffer.from('mock audio data');
            mockedSynthesizeSpeech.mockResolvedValue({
                error: '',
                response: mockBuffer
            });

            const event = {
                effect: {
                    text: 'Hello world'
                }
            } as any;

            const resultPromise = textToSpeechEffect.onTriggerEvent(event);
            await jest.runAllTimersAsync();
            await resultPromise;

            // Should use defaults: tts-1, alloy, speed 1.0
            expect(mockedSynthesizeSpeech).toHaveBeenCalledWith(
                'tts-1',
                'alloy',
                'Hello world',
                1.0,
                undefined
            );
        });

        it('should handle missing audio buffer response', async () => {
            mockedSynthesizeSpeech.mockResolvedValue({
                error: '',
                response: null
            });

            const event = {
                effect: {
                    model: 'tts-1',
                    voice: 'alloy',
                    text: 'Hello world',
                    speed: 1.0
                }
            } as any;

            const result = await textToSpeechEffect.onTriggerEvent(event) as any;

            expect(result.success).toBe(false);
            expect(result.outputs.ttsError).toContain('no audio data returned');
        });
    });

    describe('getDefaultLabel', () => {
        it('should return a label with voice and text preview', () => {
            const effect = {
                voice: 'nova',
                text: 'This is a long text that should be truncated'
            };

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const label = textToSpeechEffect.getDefaultLabel!(effect as any);

            expect(label).toContain('nova');
            expect(label).toContain('This is a long text that sh');
        });

        it('should handle missing voice', () => {
            const effect = {
                text: 'Test text'
            };

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const label = textToSpeechEffect.getDefaultLabel!(effect as any);

            expect(label).toContain('alloy');
        });
    });
});
