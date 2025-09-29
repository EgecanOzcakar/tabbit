import fetch from "node-fetch";
import { env } from "./env";
export async function refreshSpotifyToken(refreshToken) {
    const body = new URLSearchParams();
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", refreshToken);
    body.set("client_id", env.SPOTIFY_CLIENT_ID);
    body.set("client_secret", env.SPOTIFY_CLIENT_SECRET);
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        throw new Error(`Failed to refresh Spotify token: ${res.status}`);
    }
    const data = (await res.json());
    return {
        accessToken: data.access_token,
        refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000 - 30_000,
    };
}
export async function fetchSpotify(path, accessToken, init) {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        throw new Error(`Spotify API error ${res.status}`);
    }
    return (await res.json());
}
//# sourceMappingURL=auth.js.map