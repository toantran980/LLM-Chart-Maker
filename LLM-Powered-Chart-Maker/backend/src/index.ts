
// Load environment variables from .env automatically
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { generateDiagramWithLLM } from './diagram';
import { DiagramRequest } from './types';
import { fallbackDiagram } from './diagram';

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  const fallback = !process.env.OPENAI_API_KEY;
  res.json({ ok: true, fallback });
});

app.post('/api/diagram', async (req, res) => {
  const body = req.body as DiagramRequest;
  if (!body?.text || !body?.diagramType) {
    return res.status(400).json({ error: 'Missing text or diagramType' });
  }
  let mermaid = '';
  try {
    mermaid = await generateDiagramWithLLM(body);
    if (!mermaid || !mermaid.trim()) {
      // fallback if LLM returns empty
      mermaid = fallbackDiagram(body);
    }
  } catch (err: any) {
    console.error('Error /api/diagram:', err);
    // fallback on any error
    mermaid = fallbackDiagram(body);
  }
  return res.json({ mermaid });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`text2diagram backend listening on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('No OPENAI_API_KEY found — running in fallback mode (local parser).');
  }
});
