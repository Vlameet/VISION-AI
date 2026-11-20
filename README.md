# VISION AI

A Node.js/Express video-generation studio powered by fal.ai.

## Features

- Responsive Russian-language studio UI.
- Prompt and visual-style selection.
- Server-side fal.ai queue integration.
- Job status refresh and playable MP4 results.
- API key stays on the server.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000.

## Enable real video generation

Video generation is disabled by default to prevent accidental paid requests.

1. Create an API key in your fal.ai dashboard.
2. Add these environment variables to your Render service:
   - `FAL_KEY` = your private fal.ai API key
   - `ENABLE_VIDEO_GENERATION` = `true`
3. Redeploy the service.

The integration uses the `minimax/h3-max-turbo/text-to-video` queue endpoint. Pricing is usage-based and can change. Check the current model price in fal.ai before enabling generation. Never expose `FAL_KEY` in frontend code or commit it to GitHub.

## Render

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`

Render's filesystem may be ephemeral. The prototype JSON history can reset after restarts or deploys; use PostgreSQL for persistent production history.