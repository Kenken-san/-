# Dating App — Google Sign-In scaffold

"Sign in with Google" that creates accounts. Uses Google Identity Services on the
frontend and ID-token verification on the backend. **No Gmail API, no restricted-scope
review needed.**

## Setup

1. Install: `npm install`
2. Get a Google OAuth client ID:
   - Go to https://console.cloud.google.com → create a project.
   - APIs & Services → OAuth consent screen → configure (External, app name, support email).
   - APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application.
   - Under **Authorized JavaScript origins** add `http://localhost:3000`.
   - Copy the client ID.
3. `cp .env.example .env` and paste your client ID + a random SESSION_SECRET.
4. Put the same client ID in `public/index.html` (the `data-client_id` attribute).
5. Run: `npm start` → open http://localhost:3000

## How it works

- Frontend renders the Google button, gets an **ID token** on sign-in.
- Backend verifies that token with `google-auth-library` (checks signature + audience),
  reads the verified email/name/picture, and upserts a user keyed on `google_sub`.
- Backend issues its own session cookie so you don't re-verify with Google each request.

## Before launch

- Swap `db.js` for a real database (Postgres example included in comments).
- Switch the OAuth consent screen from "Testing" to "Production" (basic profile/email
  scopes only need verification if you show the unverified-app warning — for non-sensitive
  scopes this is light).
- Add your production domain to Authorized JavaScript origins.
- Set `NODE_ENV=production` so the session cookie is `secure`.

## If you later need to call Google APIs on the user's behalf

Switch from ID-token verification to the **authorization code flow** (you'll get a refresh
token). That's a bigger change — only do it if you actually need it.
