# Movie Discovery

## Setup

1. Copy `.env.example` to `server/.env` and add a TMDB API key (v3 API key or v4 Read Access Token).
2. Start MongoDB (optional for local development; the wishlist falls back to memory if unavailable).
3. Run `npm run install:all`, then `npm run dev`.
4. Open `http://localhost:5173`.

The React client only talks to `/api`; the Express server holds the TMDB credential and normalizes responses.
