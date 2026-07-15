//import 'dotenv/config'; //locally fail to load .env files if not in root folder
import dotenv from 'dotenv';
import { createApp } from './app';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = createApp();
const PORT = process.env.PORT || 4000;


app.listen(PORT, () => {
  console.log(`text2diagram backend listening on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('No OPENAI_API_KEY found — running in fallback mode (local parser).');
  }
});
