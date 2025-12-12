import { Firebot, RunRequest } from '@crowbartools/firebot-custom-scripts-types';
import { Logger } from '@crowbartools/firebot-custom-scripts-types/types/modules/logger';
import { coerce, gte } from 'semver';
import { IntegrationConstants } from './constants';
import { definition, integration } from './integration';

export let firebot: RunRequest<any>;
export let logger: LogWrapper;

const pluginName = 'firebot-openai';
const scriptVersion = '0.0.2';

const script: Firebot.CustomScript<any> = {
    getScriptManifest: () => {
        return {
            name: 'firebot-openai',
            description: 'A Firebot plugin to run server-side OpenAI prompts.',
            author: 'The Static Mage',
            version: scriptVersion,
            startupOnly: true,
            firebotVersion: '5'
        };
    },
    getDefaultParameters: () => {
        return {};
    },
    parametersUpdated: () => {
        // Parameters go here
    },
    run: async (runRequest) => {
        firebot = runRequest;
        logger = new LogWrapper(runRequest.modules.logger);
        logger.info(`${pluginName} initializing.`);

        // Check Firebot version compatibility
        const fbVersion = firebot.firebot.version;
        logger.debug(`Detected Firebot version: ${fbVersion}`);
        const coercedVersion = coerce(fbVersion);
        if (!coercedVersion || !gte(coercedVersion, '5.65.0')) {
            logger.error(`${pluginName} requires Firebot version 5.65.0 or higher. Detected version: ${fbVersion}. Please update Firebot to use this plugin.`);
            return;
        }

        // Register integration and effects
        const { integrationManager } = firebot.modules;
        integrationManager.registerIntegration({ definition, integration });
        logger.info(`Registered integration: ${IntegrationConstants.INTEGRATION_NAME}`);

        // Indicate successful initialization
        logger.info(`${pluginName} initialized successfully.`);
    },
    stop: async () => {
        // Clean up resources if needed
        logger.info(`${pluginName} stopped.`);
    }
};

class LogWrapper {
    private _logger: Logger;

    constructor(inLogger: Logger) {
        this._logger = inLogger;
    }

    info(message: string) {
        this._logger.info(`[${pluginName}] ${message}`);
    }

    error(message: string) {
        this._logger.error(`[${pluginName}] ${message}`);
    }

    debug(message: string) {
        this._logger.debug(`[${pluginName}] ${message}`);
    }

    warn(message: string) {
        this._logger.warn(`[${pluginName}] ${message}`);
    }
}

export default script;
