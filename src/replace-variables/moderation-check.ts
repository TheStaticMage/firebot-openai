import { moderateText } from '../internal/openai';
import { logger } from '../main';
import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

export const moderationCheckVariable: ReplaceVariable = {
    definition: {
        handle: 'openaiModerationCheck',
        description: 'Check if text violates OpenAI content policy. Returns "true" if flagged, "false" if clean. Fails closed (returns "true") on API errors.',
        usage: 'openaiModerationCheck[text]',
        possibleDataOutput: ['text']
    },
    evaluator: async (trigger: Trigger, text: string): Promise<string> => {
        logger.debug('Moderation check replace variable triggered');

        if (!text || text.trim() === '') {
            logger.warn('Moderation check: No text provided, failing closed');
            return 'true';
        }

        const result = await moderateText(text, 'omni-moderation-latest');

        if (result.error) {
            logger.error(`Moderation check failed: ${result.error}, failing closed`);
            return 'true';
        }

        if (!result.response) {
            logger.error('Moderation check failed: No response from API, failing closed');
            return 'true';
        }

        const flagged = result.response.results?.[0]?.flagged ?? true;
        logger.debug(`Moderation check result: flagged=${flagged}`);

        return flagged ? 'true' : 'false';
    }
};
