
# FreelanceHub (Full-Stack)

FreelanceHub is a simple full-stack web app inspired by freelance platforms. It lets users browse gigs, view details, and simulate saving/hiring services while interacting with a real Express.js backend API.

## Features
- Browse gigs (dynamic rendering from backend)
- Search by title (and category)
- Filter by category, price range, and minimum rating
- Sort by price or rating
- View service details (modal)
- Save / Hire services (simulated)
- Drag & drop to Save/Hire + confirmation modal
- Dashboard showing saved/hired items

## API Endpoints
- `GET /api/services` (get all services)
- `GET /api/services/:id` (get a single service)
- `POST /api/services` (add a new service) body: `{ "title": string, "category": string, "price": number, "rating": number, "description": string }`
- `POST /api/save` (save a service) body: `{ "id": number }`
- `POST /api/hire` (hire a service) body: `{ "id": number }`
- `GET /api/saved` (get saved services)
- `GET /api/hired` (get hired services)

## Project Structure
```
/FreelanceHub
  /client
    index.html
    /css
    /js
  /server
    server.js
    /routes
    /controllers
    /data
  package.json
  README.md
```

## Setup & Run
1) Go to the app folder:
   - `cd FreelanceHub`
2) Install backend dependencies:
   - `npm --prefix server install`
3) Start the backend server:
   - `npm start`
4) Open the frontend:
   - Open `client/index.html` in your browser (or with Live Server).

Backend runs at `http://localhost:5000` and the frontend uses `fetch()` to call the API.
