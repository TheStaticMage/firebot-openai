/* eslint-disable camelcase */
import OpenAI from 'openai';
import { integration } from '../../integration-singleton';
import { callOpenAI, moderateText, OpenAIResponse } from '../openai';

// Mock the OpenAI module and dependencies
jest.mock('openai');
jest.mock('../../integration-singleton');
jest.mock('../../main', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

const mockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

interface TestScoreResponse {
    english_score: number;
    troll_score: number;
    content_score: number;
}

describe('OpenAI Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (integration.getApiKey as jest.Mock).mockReturnValue('test-api-key');
    });

    it('should successfully call OpenAI Prompt Caching API and marshal response', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '```json\n{"english_score":100,"troll_score":20,"content_score":1}\n```'
                        }
                    ]
                }
            ]
        };

        mockedOpenAI.prototype.responses = {
            create: jest.fn().mockResolvedValue(mockResponse)
        } as any;

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAI(
            'pmpt_692222fca0d4819789bdeb9c96525da6082582f7a47f178f',
            '2',
            'This is a test of my TTS filter beep boop',
            'gpt-4o'
        );

        expect(result.error).toBe('');
        expect(result.response).toEqual({
            english_score: 100,
            troll_score: 20,
            content_score: 1
        });
    });

    it('should handle multi-turn conversation with separate prompts', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '```json\n{"english_score":100,"troll_score":65,"content_score":1}\n```'
                        }
                    ]
                }
            ]
        };

        mockedOpenAI.prototype.responses = {
            create: jest.fn().mockResolvedValue(mockResponse)
        } as any;

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAI(
            'pmpt_692222fca0d4819789bdeb9c96525da6082582f7a47f178f',
            '2',
            'My sprinkler goes tss tsss ttsss tstst tssst pssst prrffffffft',
            'gpt-4o'
        );

        expect(result.error).toBe('');
        expect(result.response).toEqual({
            english_score: 100,
            troll_score: 65,
            content_score: 1
        });
    });

    it('should handle API key not configured', async () => {
        // Clear the module cache to reset the client singleton
        jest.resetModules();
        (integration.getApiKey as jest.Mock).mockReturnValue('');

        // Re-require the module to get a fresh client singleton
        const { callOpenAI: callOpenAIFresh } = require('../openai');

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAIFresh(
            'pmpt_test',
            '1',
            'test',
            'gpt-4o'
        );

        expect(result.error).toBe('OpenAI API key not configured');
        expect(result.response).toBeNull();
    });

    it('should handle JSON parsing error and report it', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '```json\ninvalid json here}\n```'
                        }
                    ]
                }
            ]
        };

        mockedOpenAI.prototype.responses = {
            create: jest.fn().mockResolvedValue(mockResponse)
        } as any;

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAI(
            'pmpt_test',
            '1',
            'test',
            'gpt-4o'
        );

        expect(result.error).toContain('Failed to marshal response');
        expect(result.response).toBeNull();
    });

    it('should handle OpenAI API error responses', async () => {
        mockedOpenAI.prototype.responses = {
            create: jest.fn().mockRejectedValue(
                new Error('401 Incorrect API key provided: test-api-key')
            )
        } as any;

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAI(
            'pmpt_test',
            '1',
            'test',
            'gpt-4o'
        );

        expect(result.error).toContain('401 Incorrect API key');
        expect(result.response).toBeNull();
    });

    it('should handle network timeout', async () => {
        mockedOpenAI.prototype.responses = {
            create: jest.fn().mockRejectedValue(
                new Error('Request timed out after 10000ms')
            )
        } as any;

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAI(
            'pmpt_test',
            '1',
            'test',
            'gpt-4o'
        );

        expect(result.error).toContain('timed out');
        expect(result.response).toBeNull();
    });

    it('should correctly format the request to OpenAI API', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '```json\n{"test":true}\n```'
                        }
                    ]
                }
            ]
        };

        const mockCreate = jest.fn().mockResolvedValue(mockResponse);
        mockedOpenAI.prototype.responses = {
            create: mockCreate
        } as any;

        await callOpenAI('pmpt_test', '1', 'test input', 'gpt-4o');

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                model: expect.any(String),
                input: expect.any(String),
                max_output_tokens: 2048,
                prompt: {
                    id: 'pmpt_test',
                    version: '1'
                }
            })
        );
    });

    it('should use provided modelId parameter', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '```json\n{"test":true}\n```'
                        }
                    ]
                }
            ]
        };

        const mockCreate = jest.fn().mockResolvedValue(mockResponse);
        mockedOpenAI.prototype.responses = {
            create: mockCreate
        } as any;

        await callOpenAI('pmpt_test', '1', 'test', 'gpt-4-turbo');

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'gpt-4-turbo'
            })
        );
    });

    it('omits prompt version when not provided', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '```json\n{"test":true}\n```'
                        }
                    ]
                }
            ]
        };

        const mockCreate = jest.fn().mockResolvedValue(mockResponse);
        mockedOpenAI.prototype.responses = {
            create: mockCreate
        } as any;

        await callOpenAI('pmpt_test', undefined, 'test input', 'gpt-4o');

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: {
                    id: 'pmpt_test'
                }
            })
        );
    });

    it('should handle JSON without code block wrapper', async () => {
        const mockResponse = {
            output: [
                {
                    type: 'message',
                    content: [
                        {
                            type: 'text',
                            text: '{"english_score":100,"troll_score":20,"content_score":1}'
                        }
                    ]
                }
            ]
        };

        mockedOpenAI.prototype.responses = {
            create: jest.fn().mockResolvedValue(mockResponse)
        } as any;

        const result: OpenAIResponse<TestScoreResponse> = await callOpenAI(
            'pmpt_test',
            '1',
            'test',
            'gpt-4o'
        );

        expect(result.error).toBe('');
        expect(result.response).toEqual({
            english_score: 100,
            troll_score: 20,
            content_score: 1
        });
    });
});

describe('OpenAI Moderation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (integration.getApiKey as jest.Mock).mockReturnValue('test-api-key');
    });

    it('should successfully moderate text and return flagged result', async () => {
        const mockResponse = {
            id: 'modr-123',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: true,
                    categories: {
                        sexual: false,
                        hate: true,
                        harassment: false,
                        'self-harm': false,
                        'sexual/minors': false,
                        'hate/threatening': false,
                        'violence/graphic': false,
                        'self-harm/intent': false,
                        'self-harm/instructions': false,
                        'harassment/threatening': false,
                        violence: false
                    },
                    category_scores: {
                        sexual: 0.001,
                        hate: 0.95,
                        harassment: 0.01,
                        'self-harm': 0.0,
                        'sexual/minors': 0.0,
                        'hate/threatening': 0.01,
                        'violence/graphic': 0.0,
                        'self-harm/intent': 0.0,
                        'self-harm/instructions': 0.0,
                        'harassment/threatening': 0.01,
                        violence: 0.01
                    }
                }
            ]
        };

        mockedOpenAI.prototype.moderations = {
            create: jest.fn().mockResolvedValue(mockResponse)
        } as any;

        const result = await moderateText('This is hateful content', 'omni-moderation-latest');

        expect(result.error).toBe('');
        expect(result.response).toEqual(mockResponse);
        expect(result.response?.results[0]?.flagged).toBe(true);
    });

    it('should successfully moderate text and return clean result', async () => {
        const mockResponse = {
            id: 'modr-456',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: false,
                    categories: {
                        sexual: false,
                        hate: false,
                        harassment: false,
                        'self-harm': false,
                        'sexual/minors': false,
                        'hate/threatening': false,
                        'violence/graphic': false,
                        'self-harm/intent': false,
                        'self-harm/instructions': false,
                        'harassment/threatening': false,
                        violence: false
                    },
                    category_scores: {
                        sexual: 0.001,
                        hate: 0.001,
                        harassment: 0.001,
                        'self-harm': 0.0,
                        'sexual/minors': 0.0,
                        'hate/threatening': 0.0,
                        'violence/graphic': 0.0,
                        'self-harm/intent': 0.0,
                        'self-harm/instructions': 0.0,
                        'harassment/threatening': 0.0,
                        violence: 0.001
                    }
                }
            ]
        };

        mockedOpenAI.prototype.moderations = {
            create: jest.fn().mockResolvedValue(mockResponse)
        } as any;

        const result = await moderateText('This is perfectly fine content', 'omni-moderation-latest');

        expect(result.error).toBe('');
        expect(result.response).toEqual(mockResponse);
        expect(result.response?.results[0]?.flagged).toBe(false);
    });

    it('should handle moderation API key not configured', async () => {
        jest.resetModules();
        (integration.getApiKey as jest.Mock).mockReturnValue('');

        const { moderateText: moderateTextFresh } = require('../openai');

        const result = await moderateTextFresh('test', 'omni-moderation-latest');

        expect(result.error).toBe('OpenAI API key not configured');
        expect(result.response).toBeNull();
    });

    it('should handle moderation API error responses', async () => {
        mockedOpenAI.prototype.moderations = {
            create: jest.fn().mockRejectedValue(
                new Error('429 Rate limit exceeded')
            )
        } as any;

        const result = await moderateText('test content', 'omni-moderation-latest');

        expect(result.error).toContain('429 Rate limit exceeded');
        expect(result.response).toBeNull();
    });

    it('should call moderation API with correct parameters', async () => {
        const mockResponse = {
            id: 'modr-789',
            model: 'text-moderation-latest',
            results: [
                {
                    flagged: false,
                    categories: {},
                    category_scores: {}
                }
            ]
        };

        const mockCreate = jest.fn().mockResolvedValue(mockResponse);
        mockedOpenAI.prototype.moderations = {
            create: mockCreate
        } as any;

        await moderateText('test content', 'text-moderation-latest');

        expect(mockCreate).toHaveBeenCalledWith({
            input: 'test content',
            model: 'text-moderation-latest'
        });
    });
});
