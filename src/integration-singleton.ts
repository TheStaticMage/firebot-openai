import { EventEmitter } from 'events';
import { IntegrationData } from "@crowbartools/firebot-custom-scripts-types";
import { runPromptEffect } from "./effects/run-prompt";
import { firebot, logger } from "./main";

type IntegrationParameters = {
    authentication: {
        apiKey: string;
    };
    model: {
        modelId: string;
    };
};

export class OpenAIIntegration extends EventEmitter {
    // connected is required by IntegrationController, but not used since connectionToggle is false
    connected = true;

    private settings: IntegrationParameters = {
        authentication: {
            apiKey: ""
        },
        model: {
            modelId: "gpt-4o"
        }
    };

    init(_linked: boolean, integrationData: IntegrationData<IntegrationParameters>) {
        logger.info("OpenAI integration initializing...");

        // Load settings
        if (integrationData.userSettings) {
            this.settings = JSON.parse(JSON.stringify(integrationData.userSettings));
        }

        // Load effects
        const { effectManager } = firebot.modules;
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

    getModel(): string {
        return this.settings.model.modelId;
    }
}

export const integration = new OpenAIIntegration();
