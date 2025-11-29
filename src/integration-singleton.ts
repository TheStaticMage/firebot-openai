import { EventEmitter } from 'events';
import { IntegrationData } from "@crowbartools/firebot-custom-scripts-types";
import { runPromptEffect } from "./effects/run-prompt";
import { AVAILABLE_MODELS } from "./internal/openai";
import { firebot, logger } from "./main";

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
        const { frontendCommunicator, effectManager } = firebot.modules;
        frontendCommunicator.onAsync('openai:getModels', async () => AVAILABLE_MODELS);

        // Load effects
        effectManager.registerEffect(runPromptEffect);

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
