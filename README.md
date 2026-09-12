# CineQuest

CineQuest is a movie discovery app for finding something worth watching without endless scrolling. Browse popular, top-rated, upcoming, and currently playing films; search by title; filter by genre, year, and sort order; inspect movie details; save films to a personal wishlist; or let the movie picker choose one based on the mood and runtime you want.

## Features

- Browse curated movie categories with pagination.
- Search TMDB's movie catalogue by title.
- Filter discovery results by genre, release year, and rating/popularity/date.
- Open a detail view with poster, backdrop, rating, genres, overview, release date, and runtime.
- Use the movie picker for feel-good, intense, mind-bending, romantic, or scary recommendations.
- Save and remove movies from a wishlist.
- Persist the wishlist in MongoDB when available, with a temporary in-memory fallback for local development.
- Keep the TMDB credential on the server; the React client only calls the local `/api` proxy.

## Tech Stack

- React and Vite for the client
- Express and Node.js for the API server
- TMDB API for movie data
- MongoDB with Mongoose for wishlist persistence
- `concurrently` for running client and server development processes together

## Requirements

- Node.js 18 or newer
- A TMDB API key or v4 Read Access Token
- MongoDB is optional. Without a working MongoDB connection, wishlist data is stored in memory and is lost when the server restarts.

## Getting Started

1. Clone the repository and open its directory:

	```bash
	git clone https://github.com/rohitbjayadev/CineQuest.git
	cd CineQuest
	```

2. Install the root, client, and server dependencies:

	```bash
	npm run install:all
	```

3. Create the server environment file:

	```bash
	cp .env.example server/.env
	```

	On Windows PowerShell, use:

	```powershell
	Copy-Item .env.example server/.env
	```

4. Edit `server/.env` and provide your TMDB credential:

	```env
	TMDB_API_KEY=your_tmdb_read_access_token_or_api_key
	MONGODB_URI=mongodb://127.0.0.1:27017/movie-discovery
	PORT=5000
	```

	`TMDB_API_KEY` accepts either a TMDB v3 API key or a v4 Read Access Token. Do not commit `server/.env`; environment files and common credential files are excluded by `.gitignore`.

5. Start the client and API server:

	```bash
	npm run dev
	```

6. Open [http://localhost:5173](http://localhost:5173).

## Deploying to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Keep the project root set to the repository root. The included `vercel.json` builds the Vite client from `client/dist` and exposes the Express API as a serverless function.
3. Add these Vercel environment variables for the Production environment:

	```env
	TMDB_API_KEY=your_tmdb_read_access_token_or_api_key
	MONGODB_URI=your_mongodb_connection_string
	```

4. Deploy. Vercel will provide the public URL for CineQuest.

MongoDB is recommended for a deployed wishlist. The in-memory fallback is temporary and can be reset whenever a serverless function instance is recycled.

## Available Commands

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run install:all` | Install dependencies for the root, client, and server packages |
| `npm run dev` | Run Vite and the Express API together in development mode |
| `npm run build` | Create a production build of the client |
| `npm run start` | Start the API server without file watching |

## API Overview

The Express server exposes these routes under `/api`:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/movies/discover` | Browse a category with filters and pagination |
| `GET` | `/movies/search` | Search for movies by title |
| `GET` | `/movies/pick` | Choose a movie using mood, genre, and runtime preferences |
| `GET` | `/movies/:id` | Retrieve detailed information for one movie |
| `GET` | `/wishlist` | List saved movies |
| `POST` | `/wishlist` | Save a movie |
| `DELETE` | `/wishlist/:movieId` | Remove a saved movie |

Vite proxies `/api` requests from the client to the Express server on port 5000 during development.

## Project Structure

```text
client/                 React and Vite frontend
  src/App.jsx           Discovery, picker, detail, and wishlist UI
  src/api.js            Client requests to the local API
server/                 Express backend
  src/index.js          TMDB integration, API routes, and wishlist storage
.env.example            Safe environment variable template
package.json            Workspace-level development commands
```

## AI Use

AI was used to help understand the TMDB API documentation, generate and refine initial API and frontend boilerplate, and troubleshoot request handling and local setup. The application structure, filtering behavior, wishlist design, server-side credential handling, and final implementation decisions were reviewed and determined by the developer.

## Data and Attribution

Movie metadata and images are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/). This project uses the TMDB API but is not endorsed or certified by TMDB.
