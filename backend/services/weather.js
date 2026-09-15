module.exports = {
    name: 'weather',
    widgets: [
        {
            name: 'current_weather',
            description: 'Displays current temperature for a city',
            params: [{ name: 'city', type: 'string' }],
        },
        {
            name: 'forecast',
            description: 'Displays 5-day weather forecast',
            params: [{ name: 'city', type: 'string' }],
        },
    ],
};
