# GIVA Live-Engrave

A polished prototype for a customer-facing jewelry personalization studio. Live-Engrave blends AI-assisted engraving design with human creativity to help shoppers create production-ready custom jewelry artwork in-store.

## Product vision

Live-Engrave is not an AI generator. It is a jewelry creation studio where customers says:

> “AI gives me a starting point. My creativity makes it mine.”

The experience is built around a single customer journey:

Imagine → Ask AI → Choose → Edit → Draw → Personalize → Preview → Create

This project is designed to demonstrate the core Live-Engrave workflow:

- Select jewelry with SKU-specific engraving constraints
- Generate exactly 2 AI vector design options
- Insert the chosen SVG onto a safe engraving canvas
- Edit, draw, and add handwriting as separate vector elements
- Validate engraving safety in real time
- Preview the design on the selected jewelry
- Confirm and produce a unique design ID

## Key experience principles

1. AI assists, but the customer creates.
2. Show exactly two AI options, never a gallery overload.
3. The magic is the full workflow, not just the AI model.

## Repo structure

- `server.ts` — Express + Vite server, AI proxy, fallback SVG generation, design save endpoints
- `src/App.tsx` — main entry for the React studio UI
- `src/components/` — interactive app components
- `src/services/aiService.ts` — AI and mock generation service abstraction
- `src/utils/` — SVG and validation utilities
- `src/data/jewelryCatalog.ts` — mocked product/SKU data and engraving constraints

## Prerequisites

- Node.js v18+ strongly recommended
- npm installed

## Run locally

From the `engraved-frontend` folder:

```powershell
npm install
npm run dev
```

Then open the local dev server in your browser. The default port is `3000`.

## Environment variables

The app reads a Gemini API key from `.env` via `dotenv`.

Create a `.env` file in `engraved-frontend` with:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PORT=3000
HOST=0.0.0.0
```

If no API key is provided, the app uses a built-in fallback generator so the UI remains fully usable.

## Production build

```powershell
npm run build
npm start
```

- `npm run build` builds the client with Vite and bundles `server.ts` into `dist/server.cjs`
- `npm start` launches the production server

## What this prototype demonstrates

- Jewelry selection with engraving-safe dimensions
- AI text prompt creation
- Exactly two SVG design outputs
- “Try 2 more” regeneration
- Editable SVG canvas insertion
- Move / resize / rotate
- Freehand drawing and handwriting capture
- Layered composition
- Undo / redo support
- Real-time engraving validation
- Automatic engraving-safe fixes
- Product preview rendering
- Design confirmation and unique design ID generation

## Design goals for Live-Engrave

- Feel premium, minimal, warm, and tactile
- Avoid a generic chatbot or technical CAD interface
- Prioritize a simplified, touch-first tablet experience
- Make the preview feel like real engraved jewelry
- Keep the workflow grounded in customer creativity

## Notes

- The AI service is intentionally abstracted so provider logic can change later.
- The prototype is built around a mock-friendly architecture: real AI is optional, but the canvas and preview remain the core experience.
- The app is designed to support future voice input, QR handoff, and manufacturing handoff.

## License

This repository is intended for prototype/demo use only.
