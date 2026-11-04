import express from "express";
import { env } from "../utils/env.js";
import { isValidState, newOAuthState } from "../utils/auth.js";

const router = express.Router();

router.get("/spotify/login", (req, res) => {
	const state = newOAuthState();
	req.session.oauthState = state;
	const params = new URLSearchParams({
		client_id: env.SPOTIFY_CLIENT_ID,
		response_type: "code",
		redirect_uri: env.SPOTIFY_REDIRECT_URI,
		state,
		scope: ["user-read-recently-played", "playlist-read-private", "playlist-read-collaborative"].join(" "),
	});
	res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

router.get("/spotify/callback", async (req, res) => {
	const { code, state, error } = req.query;
	const expected = req.session.oauthState;
	delete req.session.oauthState; // single use

	if (!isValidState(expected, state)) {
		return res.status(400).json({ error: "Invalid or missing OAuth state. Start again at /auth/spotify/login." });
	}
	if (typeof error === "string") {
		const status = error === "access_denied" ? 403 : 400;
		return res.status(status).json({ error: "Spotify authorization was not granted", reason: error });
	}
	if (typeof code !== "string") return res.status(400).json({ error: "Missing code" });

	const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: env.SPOTIFY_REDIRECT_URI,
			client_id: env.SPOTIFY_CLIENT_ID,
			client_secret: env.SPOTIFY_CLIENT_SECRET,
		}),
	});
	if (!tokenRes.ok) return res.status(502).json({ error: "Failed to exchange code with Spotify" });
	const tokenJson = (await tokenRes.json()) as { access_token: string; refresh_token: string; expires_in: number };

	// New session id on login to prevent session fixation.
	await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
	req.session.spotify = {
		accessToken: tokenJson.access_token,
		refreshToken: tokenJson.refresh_token,
		expiresAt: Date.now() + tokenJson.expires_in * 1000 - 30_000,
	};
	res.redirect(env.APP_URL ?? "/");
});

router.post("/logout", (req, res, next) => {
	req.session.destroy((err) => {
		if (err) return next(err);
		res.clearCookie("sid").status(204).end();
	});
});

export default router;
