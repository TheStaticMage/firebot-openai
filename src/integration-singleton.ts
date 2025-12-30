import { IntegrationData } from "@crowbartools/firebot-custom-scripts-types";
import { EventEmitter } from 'events';
import { moderateTextEffect } from "./effects/moderate-text";
import { runPromptEffect } from "./effects/run-prompt";
import { textToSpeechEffect } from "./effects/text-to-speech";
import { AVAILABLE_MODELS, AVAILABLE_MODERATION_MODELS, AVAILABLE_TTS_MODELS, AVAILABLE_VOICES } from "./internal/openai";
import { firebot, logger } from "./main";
import { moderationCheckVariable } from "./replace-variables/moderation-check";

type IntegrationParameters = {
    authentication: {
        apiKey: string;
    };
};

export class OpenAIIntegration extends EventEmitter {
    // connected is required by IntegrationController, but not used since connectionToggle is false
    connected = true;

    private settings: IntegrationParameters = {
        authentication: {
            apiKey: ""
        }
    };

    init(_linked: boolean, integrationData: IntegrationData<IntegrationParameters>) {
        logger.info("OpenAI integration initializing...");

        // Load settings
        if (integrationData.userSettings) {
            this.settings = JSON.parse(JSON.stringify(integrationData.userSettings));
        }

        // Register IPC listeners
        const { frontendCommunicator, effectManager, replaceVariableManager } = firebot.modules;
        frontendCommunicator.onAsync('openai:getModels', async () => AVAILABLE_MODELS);
        frontendCommunicator.onAsync('openai:getTtsModels', async () => AVAILABLE_TTS_MODELS);
        frontendCommunicator.onAsync('openai:getTtsVoices', async () => AVAILABLE_VOICES);
        frontendCommunicator.onAsync('openai:getModerationModels', async () => AVAILABLE_MODERATION_MODELS);

        // Load effects
        effectManager.registerEffect(runPromptEffect);
        effectManager.registerEffect(textToSpeechEffect);
        effectManager.registerEffect(moderateTextEffect);

        // Load replace variables
        replaceVariableManager.registerReplaceVariable(moderationCheckVariable);

        logger.info("OpenAI integration initialized");
    }

    async onUserSettingsUpdate(integrationData: IntegrationData<IntegrationParameters>) {
        if (integrationData.userSettings) {
            logger.debug("OpenAI integration user settings updated.");
            this.settings = JSON.parse(JSON.stringify(integrationData.userSettings));
        }
    }

    getSettings(): IntegrationParameters {
        return this.settings;
    }

    getApiKey(): string {
        return this.settings.authentication.apiKey;
    }
}

export const integration = new OpenAIIntegration();
