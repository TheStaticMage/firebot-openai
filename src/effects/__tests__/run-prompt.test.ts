/* eslint-disable camelcase */
import { runPromptEffect, SYSTEM_INPUT } from '../run-prompt';
import { normalizeResponsePayload } from '../run-prompt';
import * as openaiModule from '../../internal/openai';

jest.mock('../../internal/openai');
jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => 'test-uuid-123')
}));

// Mock the main module with a mock for frontendCommunicator
const mockSend = jest.fn();
jest.mock('../../main', () => ({
    logger: {
        debug: jest.fn(),
        isDebugEnabled: jest.fn(() => true),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    },
    firebot: {
        modules: {
            frontendCommunicator: {
                send: (...args: any[]) => mockSend(...args)
            }
        }
    }
}));

const mockedCallOpenAI = openaiModule.callOpenAI as jest.MockedFunction<typeof openaiModule.callOpenAI>;

describe('Run OpenAI Prompt Effect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockClear();
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

    it('should include all input mappings in the payload', async () => {
        mockedCallOpenAI.mockResolvedValue({
            error: '',
            response: { result: 'success' }
        });

        const event = {
            effect: {
                promptId: 'test-prompt-id',
                promptVersion: '1.0',
                modelId: 'gpt-4o',
                inputMappings: [
                    { key: 'name', value: 'Alice' },
                    { key: 'age', value: '30' },
                    { key: 'city', value: 'Boston' }
                ]
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
        expect(parsedPayload.user_input).toEqual({
            name: 'Alice',
            age: '30',
            city: 'Boston'
        });
    });

    describe('JSON Parsing Feature', () => {
        it('should keep values as strings when parseInputAsJson is undefined', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'data', value: '{"key": "value"}' }]
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
            expect(parsedPayload.user_input.data).toBe('{"key": "value"}');
        });

        it('should keep values as strings when parseInputAsJson is false', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'data', value: '{"key": "value"}' }],
                    parseInputAsJson: false
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
            expect(parsedPayload.user_input.data).toBe('{"key": "value"}');
        });

        it('should parse valid JSON object when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'data', value: '{"name": "Alice", "age": 30}' }],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.data).toEqual({ name: 'Alice', age: 30 });
        });

        it('should parse valid JSON array when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'items', value: '["item1", "item2", "item3"]' }],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.items).toEqual(['item1', 'item2', 'item3']);
        });

        it('should parse valid JSON number when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'count', value: '42' }],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.count).toBe(42);
        });

        it('should parse valid JSON boolean when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'active', value: 'true' }],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.active).toBe(true);
        });

        it('should parse valid JSON null when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'empty', value: 'null' }],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.empty).toBe(null);
        });

        it('should fall back to original string for invalid JSON when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'data', value: 'not valid json' }],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.data).toBe('not valid json');
        });

        it('should handle mixed valid and invalid JSON when parseInputAsJson is true', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    modelId: 'gpt-4o',
                    inputMappings: [
                        { key: 'validObject', value: '{"name": "Alice"}' },
                        { key: 'invalidJson', value: 'not valid' },
                        { key: 'validArray', value: '[1, 2, 3]' },
                        { key: 'validNumber', value: '42' }
                    ],
                    parseInputAsJson: true
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
            expect(parsedPayload.user_input.validObject).toEqual({ name: 'Alice' });
            expect(parsedPayload.user_input.invalidJson).toBe('not valid');
            expect(parsedPayload.user_input.validArray).toEqual([1, 2, 3]);
            expect(parsedPayload.user_input.validNumber).toBe(42);
        });
    });

    describe('Error Handling', () => {
        it('should stop execution when stopIfRequestFails is true and API fails', async () => {
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
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.success).toBe(true);
            expect(result.execution.stop).toBe(true);
            expect(result.outputs.openaiError).toBe(errorMessage);
        });

        it('should not stop execution when stopIfRequestFails is false and API fails', async () => {
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
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: false
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.success).toBe(true);
            expect(result.execution).toBeUndefined();
            expect(result.outputs.openaiError).toBe(errorMessage);
        });

        it('should not stop execution when stopIfRequestFails is true but API succeeds', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { result: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.success).toBe(true);
            expect(result.execution).toBeUndefined();
            expect(result.outputs.openaiError).toBe('');
        });

        it('should stop execution when stopIfResponseError is true and response has error field', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { error: 'Invalid prompt configuration', status: 'failed' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfResponseError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.success).toBe(true);
            expect(result.execution.stop).toBe(true);
            expect(result.outputs.openaiResponse).toContain('error');
        });

        it('should not stop execution when stopIfResponseError is false and response has error field', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { error: 'Invalid prompt configuration', status: 'failed' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfResponseError: false
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.success).toBe(true);
            expect(result.execution).toBeUndefined();
            expect(result.outputs.openaiResponse).toContain('error');
        });

        it('should not stop execution when stopIfResponseError is true but response has no error', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { score: 85, status: 'success' }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfResponseError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.success).toBe(true);
            expect(result.execution).toBeUndefined();
        });

        it('should set bubbleStop when bubbleStop is true and stop condition is met', async () => {
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
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    bubbleStop: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.execution.stop).toBe(true);
            expect(result.execution.bubbleStop).toBe(true);
        });

        it('should not set bubbleStop when bubbleStop is false', async () => {
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
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    bubbleStop: false
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.execution.stop).toBe(true);
            expect(result.execution.bubbleStop).toBe(false);
        });

        it('should send chat alert when postChatAlertOnError is true and request fails', async () => {
            const errorMessage = 'API key not configured';
            mockedCallOpenAI.mockResolvedValue({
                error: errorMessage,
                response: null
            });

            const event = {
                effect: {
                    comment: 'Toxicity Check',
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    postChatAlertOnError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).toHaveBeenCalledWith('chatUpdate', {
                fbEvent: 'ChatAlert',
                message: 'OpenAI prompt error: Toxicity Check: API key not configured',
                icon: 'fad fa-exclamation-circle',
                messageId: 'test-uuid-123'
            });
        });

        it('should send chat alert when postChatAlertOnError is true and response has error', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { error: 'Rate limit exceeded', status: 'failed' }
            });

            const event = {
                effect: {
                    comment: 'Sentiment Analysis',
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfResponseError: true,
                    postChatAlertOnError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).toHaveBeenCalledWith('chatUpdate', {
                fbEvent: 'ChatAlert',
                message: 'OpenAI prompt error: Sentiment Analysis: Rate limit exceeded',
                icon: 'fad fa-exclamation-circle',
                messageId: 'test-uuid-123'
            });
        });

        it('should use promptId in chat alert when comment is not set', async () => {
            const errorMessage = 'Network timeout';
            mockedCallOpenAI.mockResolvedValue({
                error: errorMessage,
                response: null
            });

            const event = {
                effect: {
                    promptId: 'pmpt_abc123',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    postChatAlertOnError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).toHaveBeenCalledWith('chatUpdate', {
                fbEvent: 'ChatAlert',
                message: 'OpenAI prompt error: pmpt_abc123: Network timeout',
                icon: 'fad fa-exclamation-circle',
                messageId: 'test-uuid-123'
            });
        });

        it('should not send chat alert when postChatAlertOnError is false', async () => {
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
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    postChatAlertOnError: false
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should not send chat alert when no error occurs', async () => {
            mockedCallOpenAI.mockResolvedValue({
                error: '',
                response: { score: 85 }
            });

            const event = {
                effect: {
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    postChatAlertOnError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should handle both stop conditions being true', async () => {
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
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    stopIfResponseError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            const result = (await runPromptEffect.onTriggerEvent(event)) as any;

            expect(result.execution.stop).toBe(true);
        });

        it('should handle empty string comment by using promptId', async () => {
            const errorMessage = 'Rate limit exceeded';
            mockedCallOpenAI.mockResolvedValue({
                error: errorMessage,
                response: null
            });

            const event = {
                effect: {
                    comment: '',
                    promptId: 'pmpt_xyz789',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    postChatAlertOnError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).toHaveBeenCalledWith('chatUpdate', {
                fbEvent: 'ChatAlert',
                message: 'OpenAI prompt error: pmpt_xyz789: Rate limit exceeded',
                icon: 'fad fa-exclamation-circle',
                messageId: 'test-uuid-123'
            });
        });

        it('should trim whitespace from comment in chat alert', async () => {
            const errorMessage = 'Invalid configuration';
            mockedCallOpenAI.mockResolvedValue({
                error: errorMessage,
                response: null
            });

            const event = {
                effect: {
                    comment: '  Content Moderation  ',
                    promptId: 'test-prompt-id',
                    promptVersion: '1.0',
                    modelId: 'gpt-4o',
                    inputMappings: [{ key: 'user_input', value: 'Test input' }],
                    stopIfRequestFails: true,
                    postChatAlertOnError: true
                },
                trigger: {
                    metadata: {
                        username: 'testuser'
                    }
                }
            } as any;

            await runPromptEffect.onTriggerEvent(event);

            expect(mockSend).toHaveBeenCalledWith('chatUpdate', {
                fbEvent: 'ChatAlert',
                message: 'OpenAI prompt error: Content Moderation: Invalid configuration',
                icon: 'fad fa-exclamation-circle',
                messageId: 'test-uuid-123'
            });
        });

        it('should not set execution property when no stop conditions are enabled', async () => {
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
            expect(result.execution).toBeUndefined();
        });
    });
});
