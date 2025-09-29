import express from "express";
import fetch from "node-fetch";
import { env } from "../utils/env";
const router = express.Router();
router.get("/spotify/login", (_req, res) => {
    const params = new URLSearchParams({
        client_id: env.SPOTIFY_CLIENT_ID,
        response_type: "code",
        redirect_uri: env.SPOTIFY_REDIRECT_URI,
        scope: [
            "user-read-recently-played",
            "playlist-read-private",
            "playlist-read-collaborative",
        ].join(" "),
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});
router.get("/spotify/callback", async (req, res, next) => {
    try {
        const code = req.query.code;
        if (!code)
            return res.status(400).send("Missing code");
        const body = new URLSearchParams();
        body.set("grant_type", "authorization_code");
        body.set("code", code);
        body.set("redirect_uri", env.SPOTIFY_REDIRECT_URI);
        body.set("client_id", env.SPOTIFY_CLIENT_ID);
        body.set("client_secret", env.SPOTIFY_CLIENT_SECRET);
        const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        if (!tokenRes.ok) {
            return res.status(502).send("Failed to exchange code");
        }
        const tokenJson = (await tokenRes.json());
        const tokens = {
            accessToken: tokenJson.access_token,
            refreshToken: tokenJson.refresh_token,
            expiresAt: Date.now() + tokenJson.expires_in * 1000 - 30_000,
        };
        req.session.spotify = tokens;
        res.redirect("/");
    }
    catch (err) {
        next(err);
    }
});
router.post("/logout", (req, res) => {
    req.session.spotify = undefined;
    res.status(204).end();
});
export default router;
//# sourceMappingURL=index.js.map