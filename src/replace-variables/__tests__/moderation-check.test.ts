/* eslint-disable camelcase */
import { moderationCheckVariable } from '../moderation-check';
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

describe('Moderation Check Replace Variable', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return "false" for clean content', async () => {
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

        const result = await moderationCheckVariable.evaluator({} as any, 'This is clean content');

        expect(result).toBe('false');
        expect(mockedModerateText).toHaveBeenCalledWith('This is clean content', 'omni-moderation-latest');
    });

    it('should return "true" for flagged content', async () => {
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

        const result = await moderationCheckVariable.evaluator({} as any, 'Hateful content');

        expect(result).toBe('true');
        expect(mockedModerateText).toHaveBeenCalledWith('Hateful content', 'omni-moderation-latest');
    });

    it('should fail closed (return "true") for empty text', async () => {
        const result = await moderationCheckVariable.evaluator({} as any, '');

        expect(result).toBe('true');
        expect(mockedModerateText).not.toHaveBeenCalled();
    });

    it('should fail closed (return "true") for whitespace-only text', async () => {
        const result = await moderationCheckVariable.evaluator({} as any, '   ');

        expect(result).toBe('true');
        expect(mockedModerateText).not.toHaveBeenCalled();
    });

    it('should fail closed (return "true") on API error', async () => {
        mockedModerateText.mockResolvedValue({
            error: 'API rate limit exceeded',
            response: null
        });

        const result = await moderationCheckVariable.evaluator({} as any, 'Test content');

        expect(result).toBe('true');
        expect(mockedModerateText).toHaveBeenCalledWith('Test content', 'omni-moderation-latest');
    });

    it('should fail closed (return "true") when response is missing', async () => {
        mockedModerateText.mockResolvedValue({
            error: '',
            response: null
        });

        const result = await moderationCheckVariable.evaluator({} as any, 'Test content');

        expect(result).toBe('true');
        expect(mockedModerateText).toHaveBeenCalledWith('Test content', 'omni-moderation-latest');
    });

    it('should fail closed (return "true") when results array is missing', async () => {
        const mockResponse = {
            id: 'modr-789',
            model: 'omni-moderation-latest',
            results: []
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const result = await moderationCheckVariable.evaluator({} as any, 'Test content');

        expect(result).toBe('true');
    });

    it('should fail closed (return "true") when flagged is undefined', async () => {
        const mockResponse = {
            id: 'modr-101',
            model: 'omni-moderation-latest',
            results: [
                {
                    categories: {},
                    category_scores: {}
                }
            ]
        };

        mockedModerateText.mockResolvedValue({
            error: '',
            response: mockResponse
        });

        const result = await moderationCheckVariable.evaluator({} as any, 'Test content');

        expect(result).toBe('true');
    });

    it('should always use omni-moderation-latest model', async () => {
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

        await moderationCheckVariable.evaluator({} as any, 'Test content');

        expect(mockedModerateText).toHaveBeenCalledWith('Test content', 'omni-moderation-latest');
    });
});
