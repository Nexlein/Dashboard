import app from './app.js';
import _env from './utils/env.js';
const { PORT } = _env;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
