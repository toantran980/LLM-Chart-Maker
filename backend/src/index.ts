//import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

//import { createApp } from './app';
const { createApp } = require('./app');

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`text2diagram backend listening on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('No OPENAI_API_KEY found — running in fallback mode (local parser).');
  }
});