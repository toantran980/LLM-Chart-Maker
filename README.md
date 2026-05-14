# LLM-Powered Chart Maker

A sophisticated Document Analysis Studio that transforms unstructured PDF content into professional Mermaid.js diagrams using AI. Built for researchers and engineers who need to visualize complex information instantly.

## 🚀 Key Features

- **Custom PDF Studio**: High-performance rendering with a native text layer for precise selection.
- **AI Research Bin**: Collect multiple snippets from across your document to build complex, context-aware charts.
- **Pro Export Suite**: Instant high-res **PNG** and **SVG** downloads for professional use.
- **Enterprise Performance**: Lazy-loading engine designed to handle massive 100+ page documents with zero lag.
- **Modern UI**: Immersive dark-mode interface with glassmorphism aesthetics.

## 📋 System Overview

The project addresses the friction between static document analysis and dynamic visualization through three primary engineering innovations:

### 1. High-Resolution Rendering Engine
Standard PDF integration (via iframes) prevents programmatic access to content. This project implements a custom pipeline using **PDF.js v5** that renders pages onto a high-resolution canvas. 
- **Lazy Loading**: Implements `IntersectionObserver` logic to only render pages in the viewport, maintaining a low memory footprint even for massive documents.
- **Vite Worker Injection**: Uses native Vite worker loaders to run the rendering engine in a dedicated background thread, ensuring a lag-free UI.

### 2. AI Research Bin & Context Pooling
Unlike standard "chat with PDF" apps, this studio allows for **non-linear document analysis**.
- **Context Pooling**: Users can collect disparate snippets from multiple pages into a "Research Bin."
- **Multi-Snippet Synthesis**: The AI synthesizes the *entire* collection of highlights into a single, cohesive visualization, rather than just reacting to the last selection.

### 3. LLM Orchestration
The backend acts as an intelligent middleware, sanitizing selection data and injecting it into optimized prompt schemas.
- **Syntax Integrity**: Automated validation to ensure output conforms to Mermaid.js standards.
- **Fail-Safe Generation**: Robust error handling for API latency and multi-modal validation.

## ⚙️ Setup & Deployment

1. **API Key**: Create a `.env` file in the root directory and add your `OPENAI_API_KEY`.
2. **Launch**: Execute `docker-compose up -d --build` to initialize the full-stack environment.
3. **Usage**: Access the immersive workspace at `http://localhost:3000`.

## 🚀 Future Vision: Advanced RAG Pipeline

A primary objective for future iterations is the implementation of a sophisticated RAG (Retrieval-Augmented Generation) pipeline:
- **Generalized Dense Document Support**: Optimized for high-density technical manuals, academic whitepapers, and extensive multi-page reports.
- **Semantic Precision**: Reliable, context-aware answers across dozens of source documents simultaneously using vector embeddings.
- **Cross-Document Synthesis**: Enabling detailed, multi-source questions and authoritative visualizations that pull data from an entire library of PDFs.

## 📜 License

This project is available under the MIT License.
