const app = require('./app');
const { PORT } = require('./utils/env');

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
