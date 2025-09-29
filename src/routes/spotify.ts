import express from "express";
import { requireSpotify } from "../middleware/requireAuth";
import { fetchSpotify, refreshSpotifyToken } from "../utils/auth";

const router = express.Router();

async function ensureAccessToken(req: express.Request): Promise<string> {
	const s = req.session as any;
	const tokens = s.spotify as { accessToken: string; refreshToken: string; expiresAt: number };
	if (Date.now() < tokens.expiresAt) return tokens.accessToken;
	const refreshed = await refreshSpotifyToken(tokens.refreshToken);
	s.spotify = refreshed;
	return refreshed.accessToken;
}

router.get("/me/recently-played", requireSpotify, async (req, res, next) => {
	try {
		const accessToken = await ensureAccessToken(req);
		const items = await fetchSpotify<{ items: unknown[] }>(
			"/me/player/recently-played?limit=50",
			accessToken
		);
		res.json(items);
	} catch (err) {
		next(err);
	}
});

router.get("/me/playlists", requireSpotify, async (req, res, next) => {
	try {
		const accessToken = await ensureAccessToken(req);
		const playlists = await fetchSpotify<{ items: unknown[] }>(
			"/me/playlists?limit=50",
			accessToken
		);
		res.json(playlists);
	} catch (err) {
		next(err);
	}
});

export default router;


