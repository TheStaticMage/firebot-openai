/* eslint-disable camelcase */
import { runPromptEffect, SYSTEM_INPUT } from '../run-prompt';
import { normalizeResponsePayload } from '../run-prompt';
import * as openaiModule from '../../internal/openai';

jest.mock('../../internal/openai');
jest.mock('../../main', () => ({
    logger: {
        debug: jest.fn(),
        isDebugEnabled: jest.fn(() => true),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

const mockedCallOpenAI = openaiModule.callOpenAI as jest.MockedFunction<typeof openaiModule.callOpenAI>;

describe('Run OpenAI Prompt Effect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully run a prompt and return outputs', async () => {
        const mockResponse = { score: 85, category: 'excellent' };
        mockedCallOpenAI.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                inputMappings: [{ key: 'user_input', value: 'Test input' }]
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.openaiError).toBe('');
        expect(result.outputs.openaiResponse).toBe(JSON.stringify(mockResponse));
        expect(mockedCallOpenAI).toHaveBeenCalled();
        const [, , payload] = mockedCallOpenAI.mock.calls[0];
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload).toEqual({
            system_input: SYSTEM_INPUT,
            user_input: { user_input: 'Test input' },
            username: 'testuser'
        });
    });

    it('should handle API errors and return error output', async () => {
        const errorMessage = 'API key not configured';
        mockedCallOpenAI.mockResolvedValue({
            error: errorMessage,
            response: null
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }]
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.openaiError).toBe(errorMessage);
        expect(result.outputs.openaiResponse).toBe('');
        expect(mockedCallOpenAI).toHaveBeenCalled();
        const [, , payload] = mockedCallOpenAI.mock.calls[0];
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload).toEqual({
            system_input: SYSTEM_INPUT,
            user_input: { user_input: 'Test input' },
            username: 'testuser'
        });
    });

    it('should trim whitespace from parameters', async () => {
        mockedCallOpenAI.mockResolvedValue({
            error: '',
            response: { test: true }
        });

        const event = {
            effect: {
                promptId: '  test-prompt-id  ',
                promptVersion: '  1.0  ',
                modelId: 'gpt-4o',
                inputMappings: [{ key: '  user_input  ', value: '  Test input  ' }]
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        await runPromptEffect.onTriggerEvent(event);

        expect(mockedCallOpenAI).toHaveBeenCalled();
        const [, , payload] = mockedCallOpenAI.mock.calls[0];
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload).toEqual({
            system_input: SYSTEM_INPUT,
            user_input: { user_input: 'Test input' },
            username: 'testuser'
        });
    });

    it('should handle null response', async () => {
        mockedCallOpenAI.mockResolvedValue({
            error: '',
            response: null
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }]
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;

        expect(result.outputs.openaiResponse).toBe('');
    });

    it('should omit version when not specified', async () => {
        mockedCallOpenAI.mockResolvedValue({
            error: '',
            response: { test: true }
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }]
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        await runPromptEffect.onTriggerEvent(event);

        expect(mockedCallOpenAI).toHaveBeenCalled();
        expect(mockedCallOpenAI).toHaveBeenCalledWith(
            'test-prompt-id',
            undefined,
            expect.any(String),
            'gpt-4o'
        );
        const [, , payload] = mockedCallOpenAI.mock.calls[0];
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload).toEqual({
            system_input: SYSTEM_INPUT,
            user_input: { user_input: 'Test input' },
            username: 'testuser'
        });
    });

    it('should handle complex JSON response', async () => {
        const complexResponse = {
            scores: {
                english: 95,
                clarity: 87,
                tone: 92
            },
            tags: ['informative', 'friendly', 'professional'],
            metadata: {

                processed_at: '2024-01-01T00:00:00Z',
                version: '2.0'
            }
        };

        mockedCallOpenAI.mockResolvedValue({
            error: '',
            response: complexResponse
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }]
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.openaiResponse).toBe(JSON.stringify(complexResponse));
        expect(mockedCallOpenAI).toHaveBeenCalled();
        const [, , payload] = mockedCallOpenAI.mock.calls[0];
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload).toEqual({
            system_input: SYSTEM_INPUT,
            user_input: { user_input: 'Test input' },
            username: 'testuser'
        });
    });

    it('should fail when input exceeds max length', async () => {
        const event = {
            effect: {
                promptId: 'test-prompt-id',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'This input is too long' }],
                maxLength: 30
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(false);
        expect(result.outputs.openaiError).toContain('maximum length');
        expect(mockedCallOpenAI).not.toHaveBeenCalled();
    });

    it('should fail when max length is invalid', async () => {
        const event = {
            effect: {
                promptId: 'test-prompt-id',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'valid input' }],
                maxLength: -1
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(false);
        expect(result.outputs.openaiError).toContain('zero or a positive number');
        expect(mockedCallOpenAI).not.toHaveBeenCalled();
    });

    it('should normalize special characters when enabled', async () => {
        const responseWithSpecialChars = {
            summary: 'A heading— with emphasis…',
            notes: ['First—item', 'Second — item']
        };

        mockedCallOpenAI.mockResolvedValue({
            error: 'Bad — thing…',
            response: responseWithSpecialChars
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }],
                normalizeSpecialChars: true
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;
        const expectedResponse = {
            summary: 'A heading - with emphasis...',
            notes: ['First - item', 'Second - item']
        };

        expect(result.outputs.openaiError).toBe('Bad — thing…');
        expect(result.outputs.openaiResponse).toBe(JSON.stringify(expectedResponse));
    });

    it('should normalize response payload strings, arrays, and objects', () => {
        const payload = {
            heading: 'Title—goes here…',
            list: ['Item—one', 'Item — two', 3],
            nested: {
                note: 'More—text'
            },
            passthrough: 42
        };

        const normalized = normalizeResponsePayload(payload, { normalizeSpecialChars: true, removeEmojis: false, removeNonAscii: false }) as Record<string, unknown>;

        expect(normalized.heading).toBe('Title - goes here...');
        expect(normalized.list).toEqual(['Item - one', 'Item - two', 3]);
        expect((normalized.nested as Record<string, unknown>).note).toBe('More - text');
        expect(normalized.passthrough).toBe(42);
    });

    it('should remove emojis when requested', async () => {
        const responseWithEmojis = {
            message: 'Hello 😊 — world',
            tags: ['Nice 😎', 'Plain']
        };

        mockedCallOpenAI.mockResolvedValue({
            error: 'Oops 😢',
            response: responseWithEmojis
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }],
                removeEmojis: true
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;
        const expectedResponse = {
            message: 'Hello  — world',
            tags: ['Nice ', 'Plain']
        };

        expect(result.outputs.openaiError).toBe('Oops 😢');
        expect(result.outputs.openaiResponse).toBe(JSON.stringify(expectedResponse));
    });

    it('should reject empty values', () => {
        if (!runPromptEffect.optionsValidator) {
            throw new Error('optionsValidator is not defined');
        }

        const options = {
            promptId: 'test-prompt-id',
            modelId: 'gpt-4o',
            inputMappings: [{ key: 'user_input', value: '' }]
        } as any;

        const errors = runPromptEffect.optionsValidator(options);
        expect(errors.some(err => /value cannot be empty/i.test(err))).toBe(true);
    });

    it('should reject reserved key names', () => {
        const reservedKeys = ['system_input', 'user_input', 'username', 'system', 'prompt', 'instruction', 'jailbreak'];
        const validator = runPromptEffect.optionsValidator;

        if (!validator) {
            throw new Error('optionsValidator is not defined');
        }

        reservedKeys.forEach((key) => {
            const options = {
                promptId: 'test-prompt-id',
                modelId: 'gpt-4o',
                inputMappings: [{ key, value: 'Test value' }]
            } as any;

            const errors = validator(options);
            const hasReservedKeyError = errors.some(err => /reserved/i.test(err));
            expect(hasReservedKeyError).toBe(true);
        });
    });

    it('should remove non-ASCII characters when requested', async () => {
        const responseWithUnicode = {
            message: 'Hello — world 漢字',
            tags: ['Nice 😎', 'Plain', '混合']
        };

        mockedCallOpenAI.mockResolvedValue({
            error: 'Oops 😢 漢字',
            response: responseWithUnicode
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [{ key: 'user_input', value: 'Test input' }],
                removeNonAscii: true
            },
            trigger: {
                metadata: {
                    username: 'testuser'
                }
            }
        } as any;

        const result = (await runPromptEffect.onTriggerEvent(event)) as any;
        const expectedResponse = {
            message: 'Hello  world ',
            tags: ['Nice ', 'Plain', '']
        };

        expect(result.outputs.openaiError).toBe('Oops 😢 漢字');
        expect(result.outputs.openaiResponse).toBe(JSON.stringify(expectedResponse));
    });
});
