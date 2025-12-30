import { moderateText } from '../internal/openai';
import { logger } from '../main';
import { Firebot } from "@crowbartools/firebot-custom-scripts-types";

export interface ModerateTextEffectModel {
    text: string;
    modelId?: string;
    stopIfFlagged?: boolean;
    bubbleStop?: boolean;
}

export const moderateTextEffect: Firebot.EffectType<ModerateTextEffectModel> = {
    definition: {
        id: 'openai:moderateText',
        name: 'OpenAI: Moderate Text',
        description: 'Check text for policy violations using OpenAI Moderation API',
        icon: 'fad fa-shield-check',
        categories: ['common'],
        outputs: [
            {
                label: 'Moderation Flagged',
                description: 'Boolean indicating if content was flagged',
                defaultName: 'moderationFlagged'
            },
            {
                label: 'Moderation Result',
                description: 'Full moderation response as JSON',
                defaultName: 'moderationResult'
            },
            {
                label: 'Moderation Error',
                description: 'Error message if moderation failed',
                defaultName: 'moderationError'
            }
        ]
    },
    optionsTemplate: `
        <eos-container header="Text to Moderate">
            <firebot-input
                model="effect.text"
                placeholder-text="Enter text to moderate (supports variables)"
                use-text-area="true"
                menu-position="under"
            />
            <p class="muted">The text content to check for policy violations.</p>
        </eos-container>
        <eos-container header="Moderation Model" pad-top="true">
            <select ng-model="effect.modelId" class="form-control">
                <option value="omni-moderation-latest">omni-moderation-latest (recommended)</option>
                <option value="text-moderation-latest">text-moderation-latest (legacy)</option>
            </select>
            <p class="muted">Use omni-moderation-latest for the most accurate results.</p>
        </eos-container>
        <eos-container header="Execution Control" pad-top="true">
            <firebot-checkbox
                model="effect.stopIfFlagged"
                label="Stop effect execution if content is flagged"
            />
            <firebot-checkbox
                ng-if="effect.stopIfFlagged"
                model="effect.bubbleStop"
                label="Bubble stop to parent effect list"
            />
            <p class="muted">When "Stop effect execution" is enabled, this effect will stop the effect chain if the content violates OpenAI's content policy. Enable "Bubble stop" to also stop the parent effect list.</p>
        </eos-container>
    `,
    optionsController: ($scope: any) => {
        $scope.effect.modelId = $scope.effect.modelId || 'omni-moderation-latest';
        $scope.effect.stopIfFlagged = $scope.effect.stopIfFlagged ?? false;
        $scope.effect.bubbleStop = $scope.effect.bubbleStop ?? false;
    },
    optionsValidator: (effect: ModerateTextEffectModel) => {
        const errors: string[] = [];
        if (!effect.text || effect.text.trim() === '') {
            errors.push('Text to moderate is required.');
        }
        return errors;
    },
    onTriggerEvent: async ({ effect }) => {
        logger.debug(`Moderate Text effect triggered with model: ${effect.modelId}`);

        if (!effect.text || effect.text.trim() === '') {
            logger.warn('Moderate Text effect: No text provided');
            return {
                success: true,
                execution: {
                    stop: effect.stopIfFlagged ?? false,
                    bubbleStop: (effect.stopIfFlagged ?? false) && (effect.bubbleStop ?? false)
                },
                outputs: {
                    moderationFlagged: true,
                    moderationResult: '',
                    moderationError: 'No text provided for moderation'
                }
            };
        }

        const modelId = effect.modelId || 'omni-moderation-latest';
        const result = await moderateText(effect.text, modelId);

        if (result.error) {
            logger.error(`Moderation failed: ${result.error}`);
            return {
                success: true,
                execution: {
                    stop: effect.stopIfFlagged ?? false,
                    bubbleStop: (effect.stopIfFlagged ?? false) && (effect.bubbleStop ?? false)
                },
                outputs: {
                    moderationFlagged: true,
                    moderationResult: '',
                    moderationError: result.error
                }
            };
        }

        if (!result.response) {
            logger.error('Moderation failed: No response from API');
            return {
                success: true,
                execution: {
                    stop: effect.stopIfFlagged ?? false,
                    bubbleStop: (effect.stopIfFlagged ?? false) && (effect.bubbleStop ?? false)
                },
                outputs: {
                    moderationFlagged: true,
                    moderationResult: '',
                    moderationError: 'No response from moderation API'
                }
            };
        }

        const flagged = result.response.results?.[0]?.flagged ?? true;
        logger.debug(`Moderation result: flagged=${flagged}`);

        if (effect.stopIfFlagged && flagged) {
            logger.info('Content flagged and stopIfFlagged enabled, stopping effect execution');
            return {
                success: true,
                execution: {
                    stop: true,
                    bubbleStop: effect.bubbleStop ?? false
                },
                outputs: {
                    moderationFlagged: flagged,
                    moderationResult: JSON.stringify(result.response),
                    moderationError: ''
                }
            };
        }

        return {
            success: true,
            outputs: {
                moderationFlagged: flagged,
                moderationResult: JSON.stringify(result.response),
                moderationError: ''
            }
        };
    }
};
