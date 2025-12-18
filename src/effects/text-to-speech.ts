import { synthesizeSpeech } from '../internal/openai';
import { logger, firebot } from '../main';
import { Firebot } from '@crowbartools/firebot-custom-scripts-types';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface TextToSpeechEffectModel {
    model: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';
    voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse';
    prompt?: string;
    text: string;
    speed?: number;
    volume?: number;
    audioOutputDevice?: any;
    overlayInstance?: string;
    waitForSound?: boolean;
}

const TTS_TEMP_DIR = path.join(os.tmpdir(), 'firebot-openai-tts');

export const textToSpeechEffect: Firebot.EffectType<TextToSpeechEffectModel> = {
    definition: {
        id: 'openai:textToSpeech',
        name: 'Text-To-Speech (OpenAI)',
        description: 'Converts text to speech using OpenAI\'s TTS API.',
        categories: ['integrations'],
        icon: 'fad fa-microphone-alt',
        outputs: [
            {
                label: 'Error',
                description: 'Error message if the TTS failed. Empty string if successful.',
                defaultName: 'ttsError'
            }
        ]
    },
    getDefaultLabel: (effect) => {
        const voiceLabel = effect.voice || 'alloy';
        const textPreview = effect.text?.substring(0, 30) || 'Text to speech';
        return `TTS [${voiceLabel}]: ${textPreview}`;
    },
    optionsTemplate: `
        <eos-container header="Model" pad-top="true">
            <div class="alert alert-warning" ng-if="modelsError">{{modelsError}}</div>
            <select ng-model="effect.model" class="form-control">
                <option ng-repeat="model in models" value="{{model}}">{{model}}</option>
            </select>
        </eos-container>

        <eos-container header="Voice" pad-top="true">
            <div class="alert alert-warning" ng-if="voicesError">{{voicesError}}</div>
            <select ng-model="effect.voice" class="form-control">
                <option ng-repeat="voice in voices" value="{{voice}}">{{voice}}</option>
            </select>
        </eos-container>

        <eos-container header="Prompt (Optional)" pad-top="true" ng-if="effect.model === 'gpt-4o-mini-tts'">
            <p class="muted">Only used with gpt-4o-mini-tts model. Provide natural language instructions for speaking style.</p>
            <firebot-input
                model="effect.prompt"
                placeholder-text="Optional context for the TTS"
                use-text-area="true"
                menu-position="under"
            />
            <div class="alert alert-warning" style="margin-top: 8px;">
                Do not include untrusted user input in this prompt. Keep it to static instructions only.
            </div>
        </eos-container>

        <eos-container header="Text to Speak" pad-top="true">
            <firebot-input
                model="effect.text"
                placeholder-text="Text to convert to speech"
                use-text-area="true"
                menu-position="under"
            />
        </eos-container>

        <eos-container header="Playback Speed" pad-top="true">
            <firebot-slider
                label="Speed"
                ng-model="effect.speed"
                options="{ floor: 0.25, ceil: 4, step: 0.05, precision: 2 }"
                left-icon="fa-chevron-down"
                right-icon="fa-chevron-up"
            />
        </eos-container>

        <eos-container header="Volume" pad-top="true">
            <div class="volume-slider-wrapper">
                <i class="fal fa-volume-down volume-low"></i>
                <rzslider rz-slider-model="effect.volume" rz-slider-options="{floor: 1, ceil: 10, hideLimitLabels: true, showSelectionBar: true}"></rzslider>
                <i class="fal fa-volume-up volume-high"></i>
            </div>
        </eos-container>

        <eos-container header="Playback" pad-top="true">
            <label class="control-fb control--checkbox">
                Wait until TTS is done
                <input type="checkbox" ng-model="effect.waitForSound">
                <div class="control__indicator"></div>
            </label>
            <p class="muted">When checked, the effect will wait for the audio to finish playing before proceeding to the next effect.</p>
        </eos-container>

        <eos-audio-output-device effect="effect" pad-top="true"></eos-audio-output-device>

        <eos-overlay-instance ng-if="effect.audioOutputDevice && effect.audioOutputDevice.deviceId === 'overlay'" effect="effect" pad-top="true"></eos-overlay-instance>
    `,
    optionsController: async ($scope: any, backendCommunicator: any) => {
        try {
            const models = await backendCommunicator.fireEventAsync('openai:getTtsModels');
            if (Array.isArray(models) && models.length > 0) {
                $scope.models = models;
            } else {
                throw new Error('No TTS models returned from backend');
            }
        } catch (error: any) {
            $scope.modelsError = `Failed to load models: ${error.message}`;
            $scope.models = ['tts-1'];
        }

        try {
            const voices = await backendCommunicator.fireEventAsync('openai:getTtsVoices');
            if (Array.isArray(voices) && voices.length > 0) {
                $scope.voices = voices;
            } else {
                throw new Error('No TTS voices returned from backend');
            }
        } catch (error: any) {
            $scope.voicesError = `Failed to load voices: ${error.message}`;
            $scope.voices = ['alloy'];
        }

        if ($scope.effect.model == null) {
            $scope.effect.model = 'tts-1';
        }

        if ($scope.effect.voice == null) {
            $scope.effect.voice = 'alloy';
        }

        if ($scope.effect.speed == null) {
            $scope.effect.speed = 1.0;
        }
        $scope.effect.speed = Number($scope.effect.speed) || 1.0;

        if ($scope.effect.volume == null) {
            $scope.effect.volume = 5;
        }
        $scope.effect.volume = Number($scope.effect.volume) || 5;

        if ($scope.effect.waitForSound == null) {
            $scope.effect.waitForSound = true;
        }
    },
    optionsValidator: (effect) => {
        const errors: string[] = [];

        if (!effect.model) {
            errors.push('Please select a valid TTS model.');
        }

        if (!effect.voice) {
            errors.push('Please select a valid voice.');
        }

        if (!effect.text || effect.text.trim().length === 0) {
            errors.push('Please enter text to speak.');
        }

        if (effect.speed != null) {
            const speed = effect.speed;
            if (isNaN(speed) || speed < 0.25 || speed > 4) {
                errors.push('Playback speed must be between 0.25 and 4.0.');
            }
        }

        return errors;
    },
    onTriggerEvent: async (event) => {
        const { effect } = event;
        const { frontendCommunicator, resourceTokenManager } = firebot.modules;

        try {
            const model = effect.model || 'tts-1';
            const voice = effect.voice || 'alloy';
            const text = effect.text || '';
            const speed = effect.speed ?? 1.0;
            const volume = effect.volume ?? 5;
            const prompt = effect.prompt;
            const waitForSound = effect.waitForSound ?? true;

            logger.debug(`Text-to-Speech: Converting text with model ${model} and voice ${voice}`);

            const ttsResult = await synthesizeSpeech(model, voice, text, speed, prompt);

            if (ttsResult.error) {
                logger.error(`TTS failed: ${ttsResult.error}`);
                return {
                    success: false,
                    outputs: {
                        ttsError: ttsResult.error
                    }
                };
            }

            if (!ttsResult.response) {
                const errorMsg = 'Failed to synthesize speech: no audio data returned';
                logger.error(errorMsg);
                return {
                    success: false,
                    outputs: {
                        ttsError: errorMsg
                    }
                };
            }

            // Create temp directory if it doesn't exist
            if (!fs.existsSync(TTS_TEMP_DIR)) {
                await fsp.mkdir(TTS_TEMP_DIR, { recursive: true });
            }

            // Write audio buffer to temporary file
            const audioFileName = `${randomUUID()}.mp3`;
            const audioFilePath = path.join(TTS_TEMP_DIR, audioFileName);
            await fsp.writeFile(audioFilePath, ttsResult.response);

            logger.debug(`Audio file written to: ${audioFilePath}`);

            // Determine audio output device
            let selectedOutputDevice = effect.audioOutputDevice;
            if (selectedOutputDevice == null || selectedOutputDevice.label === 'App Default') {
                selectedOutputDevice = firebot.firebot.settings.getSetting('AudioOutputDevice');
            }

            const audioData: any = {
                filepath: audioFilePath,
                volume: volume,
                audioOutputDevice: selectedOutputDevice
            };

            // Route audio based on output device
            if (selectedOutputDevice?.deviceId === 'overlay') {
                logger.debug('Routing TTS audio to overlay');
                const { httpServer } = firebot.modules;
                const resourceToken = resourceTokenManager.storeResourcePath(audioFilePath, 30);
                audioData.resourceToken = resourceToken;
                audioData.overlayInstance = effect.overlayInstance;
                audioData.isUrl = false;
                httpServer.sendToOverlay('sound', audioData);
            } else {
                logger.debug(`Routing TTS audio to frontend for playback: deviceId=${selectedOutputDevice?.deviceId}`);
                frontendCommunicator.send('playsound', audioData);
            }

            // Get sound duration and schedule cleanup
            try {
                const duration = await frontendCommunicator.fireEventAsync<number>('getSoundDuration', {
                    path: audioFilePath
                });
                const durationInMs = (Math.round(duration) || 0) * 1000;
                const cleanupPromise = new Promise<void>((resolve) => {
                    setTimeout(async () => {
                        try {
                            if (fs.existsSync(audioFilePath)) {
                                await fsp.unlink(audioFilePath);
                            }
                        } catch (err) {
                            logger.debug(`Failed to cleanup audio file: ${err}`);
                        }
                        resolve();
                    }, durationInMs);
                });

                if (waitForSound) {
                    logger.debug(`Waiting for TTS sound (${path.basename(audioFilePath)}) to finish (${durationInMs} ms)`);
                    await cleanupPromise;
                    logger.debug(`TTS sound (${path.basename(audioFilePath)}) finished and cleaned up`);
                } else {
                    logger.debug(`Not waiting for TTS sound (${path.basename(audioFilePath)}) to finish`);
                }
            } catch (err) {
                logger.debug(`Failed to get sound duration (${path.basename(audioFilePath)}), proceeding without cleanup: ${err}`);
            }

            return {
                success: true,
                outputs: {
                    ttsError: ''
                }
            };
        } catch (err: any) {
            const errorMsg = err.message || 'Unknown error during TTS effect';
            logger.error(`TTS effect error: ${errorMsg}`);
            return {
                success: false,
                outputs: {
                    ttsError: errorMsg
                }
            };
        }
    }
};
