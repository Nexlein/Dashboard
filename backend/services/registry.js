import weather from './weather.js';
import github from './github.js';
import youtube from './youtube.js';
import chatbot from './chatbot.js';
import crypto from './crypto.js';

// Add new services to this array
const services = [weather, github, youtube, crypto, chatbot];

export default {
    getAllServices: () => services,
    getService: (name) => services.find((service) => service.name === name),
};
