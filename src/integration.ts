import { IntegrationDefinition } from "@crowbartools/firebot-custom-scripts-types";
import { IntegrationConstants } from "./constants";

export { integration } from './integration-singleton';

export const definition: IntegrationDefinition = {
    id: IntegrationConstants.INTEGRATION_ID,
    name: IntegrationConstants.INTEGRATION_NAME,
    description: IntegrationConstants.INTEGRATION_DESCRIPTION,
    connectionToggle: false,
    configurable: true,
    linkType: "none",
    settingCategories: {
        authentication: {
            title: "Authentication",
            sortRank: 1,
            settings: {
                apiKey: {
                    title: "OpenAI API Key",
                    tip: "Your OpenAI API key for authentication.",
                    type: "password",
                    default: "",
                    sortRank: 1
                }
            }
        },
        model: {
            title: "Model",
            sortRank: 2,
            settings: {
                modelId: {
                    title: "Model ID",
                    tip: "The OpenAI model to use for API calls (e.g., gpt-4o, gpt-4-turbo, gpt-3.5-turbo).",
                    type: "string",
                    default: "gpt-4o",
                    sortRank: 1
                }
            }
        }
    }
};