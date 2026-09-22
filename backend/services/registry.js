const weather = require('./weather');
const github = require('./github');
const youtube = require('./youtube');
const chatbot = require('./chatbot');
const crypto = require('./crypto');

// Add new services to this array
const services = [weather, github, youtube, crypto, chatbot];

module.exports = {
    getAllServices: () => services,
    getService: (name) => services.find((service) => service.name === name),
};
