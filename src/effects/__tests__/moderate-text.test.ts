/* eslint-disable camelcase */
import { moderateTextEffect } from '../moderate-text';
import * as openaiModule from '../../internal/openai';

jest.mock('../../internal/openai');
jest.mock('../../main', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

const mockedModerateText = openaiModule.moderateText as jest.Mock;

describe('Moderate Text Effect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully moderate text and return outputs when clean', async () => {
        const mockResponse = {
            id: 'modr-123',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: false,
                    categories: {},
                    category_scores: {}
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                text: 'This is clean content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(false);
        expect(result.outputs.moderationResult).toBe(JSON.stringify(mockResponse));
        expect(result.outputs.moderationError).toBe('');
        expect(mockedModerateText).toHaveBeenCalledWith('This is clean content', 'omni-moderation-latest');
    });

    it('should successfully moderate text and return outputs when flagged', async () => {
        const mockResponse = {
            id: 'modr-456',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: true,
                    categories: {
                        hate: true
                    },
                    category_scores: {
                        hate: 0.95
                    }
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                text: 'This is hateful content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationResult).toBe(JSON.stringify(mockResponse));
        expect(result.outputs.moderationError).toBe('');
    });

    it('should stop execution when content is flagged and stopIfFlagged is true', async () => {
        const mockResponse = {
            id: 'modr-789',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: true,
                    categories: {
                        violence: true
                    },
                    category_scores: {
                        violence: 0.88
                    }
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                text: 'Violent content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: true
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.execution).toEqual({
            stop: true,
            bubbleStop: false
        });
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationResult).toBe(JSON.stringify(mockResponse));
        expect(result.outputs.moderationError).toBe('');
    });

    it('should not stop execution when content is clean even if stopIfFlagged is true', async () => {
        const mockResponse = {
            id: 'modr-101',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: false,
                    categories: {},
                    category_scores: {}
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                text: 'Clean content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: true
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(false);
    });

    it('should stop execution with bubble when content is flagged and both options enabled', async () => {
        const mockResponse = {
            id: 'modr-999',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: true,
                    categories: {
                        harassment: true
                    },
                    category_scores: {
                        harassment: 0.92
                    }
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                text: 'Harassing content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: true,
                bubbleStop: true
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.execution).toEqual({
            stop: true,
            bubbleStop: true
        });
        expect(result.outputs.moderationFlagged).toBe(true);
    });

    it('should handle empty text and fail closed', async () => {
        const event = {
            effect: {
                text: '',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe('No text provided for moderation');
        expect(mockedModerateText).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only text and fail closed', async () => {
        const event = {
            effect: {
                text: '   ',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe('No text provided for moderation');
        expect(mockedModerateText).not.toHaveBeenCalled();
    });

    it('should stop and bubble when text is missing and stopIfFlagged is enabled', async () => {
        const event = {
            effect: {
                text: '',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: true,
                bubbleStop: true
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.execution).toEqual({
            stop: true,
            bubbleStop: true
        });
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe('No text provided for moderation');
        expect(mockedModerateText).not.toHaveBeenCalled();
    });

    it('should handle API errors and fail closed', async () => {
        const errorMessage = 'API rate limit exceeded';
        mockedModerateText.mockResolvedValue({
            error: errorMessage,
            response: null
        });

        const event = {
            effect: {
                text: 'Test content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe(errorMessage);
    });

    it('should stop without bubble when API fails and stopIfFlagged is enabled', async () => {
        const errorMessage = 'API rate limit exceeded';
        mockedModerateText.mockResolvedValue({
            error: errorMessage,
            response: null
        });

        const event = {
            effect: {
                text: 'Test content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: true,
                bubbleStop: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.execution).toEqual({
            stop: true,
            bubbleStop: false
        });
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe(errorMessage);
    });

    it('should handle missing response and fail closed', async () => {
        mockedModerateText.mockResolvedValue({
            error: '',
            response: null
        });

        const event = {
            effect: {
                text: 'Test content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe('No response from moderation API');
    });

    it('should not bubble stop on failure when stopIfFlagged is disabled', async () => {
        mockedModerateText.mockResolvedValue({
            error: '',
            response: null
        });

        const event = {
            effect: {
                text: 'Test content',
                modelId: 'omni-moderation-latest',
                stopIfFlagged: false,
                bubbleStop: true
            }
        } as any;

        const result = (await moderateTextEffect.onTriggerEvent(event)) as any;

        expect(result.success).toBe(true);
        expect(result.execution).toEqual({
            stop: false,
            bubbleStop: false
        });
        expect(result.outputs.moderationFlagged).toBe(true);
        expect(result.outputs.moderationError).toBe('No response from moderation API');
    });

    it('should use default model when not specified', async () => {
        const mockResponse = {
            id: 'modr-202',
            model: 'omni-moderation-latest',
            results: [
                {
                    flagged: false,
                    categories: {},
                    category_scores: {}
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const event = {
            effect: {
                text: 'Test content',
                stopIfFlagged: false
            }
        } as any;

        await moderateTextEffect.onTriggerEvent(event);

        expect(mockedModerateText).toHaveBeenCalledWith('Test content', 'omni-moderation-latest');
    });

    it('should validate that text is required', () => {
        const effect = {
            text: '',
            modelId: 'omni-moderation-latest'
        } as any;

        const validator = moderateTextEffect.optionsValidator;
        expect(validator).toBeDefined();
        const errors = validator ? validator(effect) : [];

        expect(errors).toContain('Text to moderate is required.');
    });

    it('should pass validation with valid text', () => {
        const effect = {
            text: 'Valid text',
            modelId: 'omni-moderation-latest'
        } as any;

        const validator = moderateTextEffect.optionsValidator;
        expect(validator).toBeDefined();
        const errors = validator ? validator(effect) : [];

        expect(errors).toEqual([]);
    });
});
