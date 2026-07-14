# LLM Chart Maker — Future Improvement Plan

Features sorted by difficulty. Ship the easy wins first, leave the hard ones for later.

---

## 🟢 Easy Wins — Do These Now
> Small scope, high value, no new infrastructure needed.

### 1. More Diagram Types
**Effort:** ~2 hrs | **Value:** ⭐⭐⭐⭐⭐

The LLM already knows all Mermaid diagram syntax — just expose more types in the UI.

- [ ] Add to `shared/types.ts`: `'gantt' | 'er' | 'mindmap' | 'gitgraph'`
- [ ] Add dropdown options in `Controls.tsx`
- [ ] Hide direction picker for types that don't support it (gantt, er, mindmap, gitgraph)
- [ ] Add direction rules in `llm.ts` for new types

```
flowchart → existing ✅
gantt     → project timelines
er        → database/entity schemas
mindmap   → brainstorming, concept maps
gitgraph  → git branch history
```

---

### 2. Diagram History (localStorage)
**Effort:** ~3 hrs | **Value:** ⭐⭐⭐⭐⭐

No backend needed. Pure frontend, zero new API calls.

- [ ] Create `frontend/src/utils/history.ts` with `save / load / clear` helpers
- [ ] Auto-save every generated diagram (Mermaid code + type + timestamp + label)
- [ ] New `DiagramHistory` component: collapsible panel, last 20 entries
- [ ] Click any entry → restores diagram instantly
- [ ] "Clear History" button

---

### 3. Diagram Theme Switcher
**Effort:** ~1 hr | **Value:** ⭐⭐⭐⭐

Mermaid ships 5 built-in themes — zero extra dependencies.

- [ ] Add `diagramTheme` state in `App.tsx`
- [ ] Pass theme to `Mermaid.tsx`, call `mermaid.initialize({ theme })` on change
- [ ] Theme buttons in `Result.tsx`: `default | dark | forest | neutral | base`

---

### 4. Copy Embed Code
**Effort:** ~1 hr | **Value:** ⭐⭐⭐

No server, no database. Pure client-side.

- [ ] Add "Copy Embed" button to `Mermaid.tsx`
- [ ] Serialize SVG → base64 encode → wrap in `<img src="data:image/svg+xml;base64,..." />`
- [ ] Copy to clipboard with one click

---

### 5. Full PDF Text Extraction ("Diagram Entire PDF")
**Effort:** ~2 hrs | **Value:** ⭐⭐⭐⭐

The PDF renderer already loads every page. Just extract the text too.

- [ ] In `PDFViewer.tsx`: loop `page.getTextContent()` across all pages
- [ ] Concatenate all text, truncate to ~12,000 chars
- [ ] Show a warning banner if the PDF was cut off
- [ ] Add "📄 Diagram Entire PDF" button → sends full text to existing `/api/diagram`
- [ ] No backend change needed

---

### 6. Diagram-to-Text (Describe)
**Effort:** ~2 hrs | **Value:** ⭐⭐⭐

New endpoint + small UI. Useful for accessibility and documentation.

- [ ] `POST /api/describe` backend route — LLM reads Mermaid code → returns plain-English summary
- [ ] "🔍 Describe this diagram" button in `Result.tsx`
- [ ] Response shown in a collapsible panel below the diagram

---

## 🟡 Medium Effort — Do These Later
> Meaningful work but no new infrastructure required.

### 7. Iterative Diagram Refinement
**Effort:** ~5 hrs | **Value:** ⭐⭐⭐⭐⭐

The highest-value feature. Makes diagram generation conversational.

- [ ] `POST /api/refine` — sends `{ currentDiagram, instruction, diagramType }` → LLM edits diagram
- [ ] New `RefineBar` component (text input + submit), shown only when a diagram exists
- [ ] Example: *"Add an error step after step 3"* → diagram updates in place
- [ ] Wire into `App.tsx` alongside history (auto-save each refinement too)

---

### 8. Better README + Live Demo Link
**Effort:** ~1 hr | **Value:** ⭐⭐⭐⭐ (resume value)

- [ ] Add a GIF or screenshot of the tool in action to `README.md`
- [ ] Add the Vercel live URL prominently at the top
- [ ] Add a "Try it" badge

---

## 🔴 Hard / Deferred — Set Aside for Now
> Requires new infrastructure or significant architecture changes. Not worth it yet.

### Real Shareable URLs
**Why hard:** Needs a database (Postgres/Redis) to store diagrams by ID, a `GET /api/diagram/:id`
endpoint, and frontend routing changes to load from URL params.
**Revisit when:** You add a backend database for any other reason.

### User Accounts & Auth
**Why hard:** Full auth flow (signup, login, JWT/sessions), user-scoped history, database required.
**Revisit when:** You have real users who need persistent accounts.

### RAG / Chat with PDF
**Why hard:** Requires text chunking, OpenAI embeddings API, vector similarity search, a vector
database (Pinecone/Supabase pgvector), and a chat UI. High cost per request.
**Revisit when:** You want to pivot toward a document intelligence product.

### Self-hosted LLM (no API key)
**Why hard:** Needs a GPU server, model serving (Ollama/vLLM), and prompt tuning to match
OpenAI output quality.
**Revisit when:** OpenAI API costs become a real problem at scale.

---

## Recommended Implementation Order

```
Week 1  (~6 hrs)
  ├── More diagram types        ← easiest, biggest dropdown improvement
  ├── Diagram history           ← localStorage only, no backend
  └── Theme switcher            ← 1 hour, big visual impact

Week 2  (~5 hrs)
  ├── Copy embed code           ← 1 hour
  ├── Full PDF extraction       ← already have the renderer
  └── Diagram-to-text describe  ← new endpoint + small UI

Week 3+  (~5 hrs)
  └── Iterative refinement      ← biggest payoff, save for when basics are solid
```

---

## Summary Table

| Feature | Effort | Value | Priority |
|---|---|---|---|
| More diagram types | Easy | ⭐⭐⭐⭐⭐ | Now |
| Diagram history | Easy | ⭐⭐⭐⭐⭐ | Now |
| Theme switcher | Easy | ⭐⭐⭐⭐ | Now |
| Copy embed code | Easy | ⭐⭐⭐ | Now |
| Full PDF extraction | Easy | ⭐⭐⭐⭐ | Now |
| Diagram-to-text | Easy | ⭐⭐⭐ | Now |
| Iterative refinement | Medium | ⭐⭐⭐⭐⭐ | Later |
| Better README | Medium | ⭐⭐⭐⭐ | Later |
| Shareable URLs | Hard | ⭐⭐⭐ | Deferred |
| User auth | Hard | ⭐⭐⭐ | Deferred |
| RAG / Chat PDF | Hard | ⭐⭐ | Deferred |
| Self-hosted LLM | Hard | ⭐⭐ | Deferred |
