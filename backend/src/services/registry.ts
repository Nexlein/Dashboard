import weather from './weather.ts';
import github from './github.ts';
import youtube from './youtube.ts';
import chatbot from './chatbot.ts';
import crypto from './crypto.ts';
import type { ServiceDefinition } from './types.ts';

// Add new services to this array
const services: ServiceDefinition[] = [weather, github, youtube, crypto, chatbot];

export default {
    getAllServices: () => services,
    getService: (name: string): ServiceDefinition | undefined =>
        services.find((service) => service.name === name),
};
