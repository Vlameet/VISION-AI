# VISION AI

A small Node.js/Express MVP for an AI video creation studio.

## Current status

- Responsive Russian-language studio UI.
- Prompt, visual style and duration selection.
- Express API and demo project history.
- **Demo mode only:** no video is rendered and no paid AI API is called.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000.

## Deploy on Render

Create a new **Web Service** from this repository.

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `DEMO_MODE=true`

Render provides the `PORT` variable automatically.

## Before real video generation

A provider such as fal.ai must be integrated on the server. Keep API keys in server-side environment variables only; never put them in frontend code. Confirm model pricing and set spending limits before enabling paid generation.

The current JSON history file is suitable only for a prototype. On hosting platforms with ephemeral filesystems, history may reset on redeploy/restart. Use a database such as PostgreSQL for durable project storage.