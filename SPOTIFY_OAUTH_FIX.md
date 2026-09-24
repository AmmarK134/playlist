# Spotify connection troubleshooting

## Local callback configuration

Use these values consistently:

```text
Browser:       http://127.0.0.1:3000
NEXTAUTH_URL:  http://127.0.0.1:3000
Redirect URI:  http://127.0.0.1:3000/api/auth/callback/spotify
```

Register the redirect in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Spotify does not accept `localhost` redirects. Production callbacks must use HTTPS. See the [official redirect requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

## Common failures

| Symptom                                   | What to check                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Invalid redirect URI                      | Compare the complete callback, including protocol, hostname, port, and path.                                      |
| Callback or configuration error           | Check `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `NEXTAUTH_SECRET`; restart or redeploy after changes.     |
| Login succeeds but library returns 403    | Add the account to Users Management and verify the development-mode app owner's Premium subscription.             |
| Session expires or reconnect is requested | Sign out and reconnect. A revoked or invalid refresh token requires a fresh authorization.                        |
| A new permission is unavailable           | Reconnect to grant the current set of scopes.                                                                     |
| Requests return 429                       | Wait before retrying; check the app's usage and Spotify quota.                                                    |
| Playlist contents are unavailable         | Spotify restricts some playlist-content access, especially for playlists the user does not own or collaborate on. |

Current development-mode limits and account requirements are documented under [Spotify quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes). This app uses the current playlist endpoints described in the [2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).

## Verify a connection

1. Open the exact configured browser origin and connect Spotify.
2. Confirm your own profile and playlists load.
3. Open a playlist you own and check its tracks.
4. Create a small playlist and open the saved result in Spotify.
5. Sign out and confirm protected data is no longer visible.

If troubleshooting requires logs, record the HTTP status and error message. Do not share access tokens, refresh tokens, session cookies, client secrets, or API keys.
