import 'dotenv/config';

import { createApp } from './app';

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`text2diagram backend listening on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('No OPENAI_API_KEY found — running in fallback mode (local parser).');
  }
});