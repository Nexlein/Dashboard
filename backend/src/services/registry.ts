import weather from './weather.ts';
import github from './github.ts';
import youtube from './youtube.ts';
import chatbot from './chatbot.ts';
import crypto from './crypto.ts';

// Add new services to this array
const services = [weather, github, youtube, crypto, chatbot];

export default {
    getAllServices: () => services,
    getService: (name) => services.find((service) => service.name === name),
};
