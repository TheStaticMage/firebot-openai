/* eslint-disable camelcase */
import { runPromptEffect, SYSTEM_INPUT } from '../run-prompt';
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
                inputText: 'Test input'
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
        expect(parsedPayload).toEqual({ system_input: SYSTEM_INPUT, user_input: 'Test input', username: 'testuser' });
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
                inputText: 'Test input'
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
        expect(parsedPayload).toEqual({ system_input: SYSTEM_INPUT, user_input: 'Test input', username: 'testuser' });
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
                inputText: '  Test input  '
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
        expect(parsedPayload).toEqual({ system_input: SYSTEM_INPUT, user_input: 'Test input', username: 'testuser' });
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
                inputText: 'Test input'
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
                inputText: 'Test input'
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
            expect.any(String)
        );
        const [, , payload] = mockedCallOpenAI.mock.calls[0];
        const parsedPayload = JSON.parse(payload);
        expect(parsedPayload).toEqual({ system_input: SYSTEM_INPUT, user_input: 'Test input', username: 'testuser' });
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
                inputText: 'Test input'
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
        expect(parsedPayload).toEqual({ system_input: SYSTEM_INPUT, user_input: 'Test input', username: 'testuser' });
    });

    it('should fail when input exceeds max length', async () => {
        const event = {
            effect: {
                promptId: 'test-prompt-id',
                inputText: 'This input is too long',
                maxLength: 5
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
                inputText: 'valid input',
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
});
