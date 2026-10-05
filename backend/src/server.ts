import app from './app.ts';
import _env from './utils/env.ts';
const { PORT } = _env;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
