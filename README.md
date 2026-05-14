# LLM-Powered Chart Maker

A sophisticated Document Analysis Studio that transforms unstructured PDF content into professional Mermaid.js diagrams using AI. Built for researchers and engineers who need to visualize complex information instantly.

## 🚀 Key Features

- **Custom PDF Studio**: High-performance rendering with a native text layer for precise selection.
- **AI Research Bin**: Collect multiple snippets from across your document to build complex, context-aware charts.
- **Pro Export Suite**: Instant high-res **PNG** and **SVG** downloads for professional use.
- **Enterprise Performance**: Lazy-loading engine designed to handle massive 100+ page documents with zero lag.
- **Modern UI**: Immersive dark-mode interface with glassmorphism aesthetics.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, PDF.js v5, Mermaid.js
- **Backend**: Node.js, Express, OpenAI GPT-4 API
- **Infrastructure**: Docker, Nginx, TypeScript

## ⚙️ Setup

1. **API Key**: Create a `.env` in the root with your `OPENAI_API_KEY`.
2. **Launch**: Run `docker-compose up -d --build`.
3. **Access**: Open `http://localhost:3000`.

## 📜 License

This project is available under the MIT License.
