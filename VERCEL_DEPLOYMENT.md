# Vercel deployment

PlaylistHelper is a Next.js application with server API routes. Use Vercel's Next.js framework preset and Node.js 22 or newer. A static export cannot run authentication or playlist creation.

## Configure the project

1. Import the GitHub repository into Vercel.
2. Keep the standard install command (`npm ci`) and build command (`npm run build`).
3. Add the environment variables below in **Settings → Environment Variables**.
4. Add the matching production callback to your Spotify app's redirect URIs.
5. Deploy, then test sign-in and create a playlist with an allowed Spotify account.

| Variable                | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| `NEXTAUTH_URL`          | Your canonical HTTPS origin, e.g. `https://your-app.vercel.app`          |
| `NEXTAUTH_SECRET`       | A production-only random secret; generate with `openssl rand -base64 32` |
| `SPOTIFY_CLIENT_ID`     | Your Spotify app's client ID                                             |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify app's client secret                                         |
| `OPENAI_API_KEY`        | API key used for playlist generation                                     |
| `OPENAI_MODEL`          | Optional model override; defaults to `gpt-4.1-mini`                      |

Register `https://your-app.vercel.app/api/auth/callback/spotify`, replacing the hostname with your actual domain. Environment changes require a new deployment.

Keep Fluid Compute enabled. The chat route allows 90 seconds and playlist creation allows 180 seconds for generation and Spotify matching; a lower platform timeout can interrupt a save. See [Vercel function duration settings](https://vercel.com/docs/functions/configuring-functions/duration).

## Preview deployments

OAuth redirects must match a registered URI. Use a stable preview domain with its own matching `NEXTAUTH_URL` if you need authenticated preview testing. Otherwise, use the public preview experience and test the connection on the canonical deployment.

## Before sharing

- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Verify the full login → library → playlist creation → open in Spotify flow.
- Check expired-session handling and an empty library.
- Confirm the app's allowed users and quota mode in Spotify's dashboard. See [Spotify troubleshooting](SPOTIFY_OAUTH_FIX.md).

No database is required. Spotify stores playlists and the browser stores the encrypted session cookie. Hosting usage and OpenAI API calls are billed under your accounts; review the providers' current plans before scaling usage.

The API includes a per-instance burst limit of ten chat requests and three playlist creations per user per minute. It resets when an instance restarts and is not shared across instances. Add a shared rate limit at your hosting edge or in a shared store before opening the service to a larger audience.

## Diagnose an OpenAI limit error

OpenAI can return HTTP 429 for several different reasons. The site distinguishes temporary request throttling from API credit, project spending, organization spending, and organization usage limits. An available credit balance does not rule out the other limits, or a deployed key belonging to a different project.

After reproducing the problem, look in the Vercel project’s runtime logs for `PlaylistHelper OpenAI request failed`. The entry contains only a classified code, status, and category; it does not include API keys, prompts, or raw provider messages.

- `credit_balance_exhausted` or `insufficient_quota`: check API billing for the organization/project associated with the deployed `OPENAI_API_KEY`.
- `project_spend_limit_exceeded`, `organization_spend_limit_exceeded`, or `organization_usage_limit_exceeded`: review the corresponding limit in the OpenAI dashboard.
- `rate_limit_exceeded` or `slow_down`: wait for the displayed delay, then try again. Check the model’s request/token limits if this persists.
- `unknown`: the provider did not return a recognized classification; do not assume that adding credits or retrying will resolve it.

If you replace `OPENAI_API_KEY` in Vercel, redeploy for the change to take effect. The application does not automatically retry playlist mutations or change your billing limits. See [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes) and [rate limits](https://developers.openai.com/api/docs/guides/rate-limits).
