# PlaylistHelper

A focused workspace for turning an idea into a Spotify playlist. Describe a mood, browse your library, and save a playlist to your Spotify account.

Built with Next.js 15, React 19, TypeScript, Tailwind CSS 4, NextAuth, and the Spotify Web API. Authentication uses encrypted JWT sessions; no database is required.

## Local setup

Use Node.js 22 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The [demo studio](http://127.0.0.1:3000/dashboard?demo=1) works without credentials and uses clearly labeled sample content. Connecting your own library and creating playlists requires the configuration below.

### Spotify connection

1. Create or open an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:3000/api/auth/callback/spotify` as a redirect URI.
3. Put its client ID and secret in `.env.local`.
4. Set `NEXTAUTH_URL=http://127.0.0.1:3000` and generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
5. Add your Spotify account under the app's **Users Management** settings.

Spotify requires an explicit loopback IP for local HTTP redirects; `localhost` is not accepted. The browser host, `NEXTAUTH_URL`, and registered redirect must agree. See [Spotify's redirect requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

Development-mode apps require the app owner to have Spotify Premium and currently allow up to five authorized users. A successful login alone does not guarantee API access. See [Spotify quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

### Playlist generation

Set `OPENAI_API_KEY` in `.env.local` to enable generation. The API key needs an active API billing account and model access. `OPENAI_MODEL` optionally overrides the default `gpt-4.1-mini`. Never put secrets in `NEXT_PUBLIC_` variables or commit `.env.local`.

Restart the development server after changing environment variables. The complete list is in [.env.example](.env.example).

PlaylistHelper sends the text you enter to OpenAI to prepare a brief and select songs. It does not send your Spotify library or listening history to the model. Songs are matched against Spotify before a private playlist is created. Some requested tracks may be unavailable; the result reports the number actually saved.

## Commands

| Command             | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the development server                          |
| `npm run lint`      | Check ESLint rules, including warnings                |
| `npm run typecheck` | Check TypeScript types                                |
| `npm test`          | Run server regression tests                           |
| `npm run build`     | Create the production build with lint and type checks |
| `npm start`         | Serve the production build                            |

GitHub Actions runs the quality checks on pushes and pull requests. Regression tests mock external requests to cover authentication refresh, validation, Spotify matching, and safe playlist creation. The build does not require live service credentials. A real account smoke test is still needed to verify OAuth and playlist creation against your Spotify app.

The lockfile includes security patches for the Next.js 15.5 release line. `package.json` overrides Next.js's pinned PostCSS dependency with a patched 8.x version; retain that override until a framework upgrade no longer requires it. Run `npm audit` when updating dependencies.

## Project layout

- `app/` — public preview, dashboard, and server API routes
- `components/` — interface and reusable UI components
- `lib/` — authentication, Spotify requests, data hooks, and shared helpers
- `types/` — application type declarations
- `public/` — static assets

See [Vercel deployment](VERCEL_DEPLOYMENT.md) for hosting and [Spotify troubleshooting](SPOTIFY_OAUTH_FIX.md) for connection issues.
