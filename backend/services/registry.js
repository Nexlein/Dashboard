const weather = require('./weather');
const github = require('./github');
const youtube = require('./youtube');
const chatbot = require('./chatbot');

// Add new services to this array
const services = [weather, github, youtube, chatbot];

module.exports = {
    getAllServices: () => services,
    getService: (name) => services.find((service) => service.name === name),
};
