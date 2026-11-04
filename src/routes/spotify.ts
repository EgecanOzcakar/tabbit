import express from "express";
import { requireSpotify } from "../middleware/requireAuth.js";
import { ensureAccessToken, fetchSpotify } from "../utils/auth.js";

const router = express.Router();

router.get("/me/recently-played", requireSpotify, async (req, res) => {
	const accessToken = await ensureAccessToken(req);
	res.json(await fetchSpotify<{ items: unknown[] }>("/me/player/recently-played?limit=50", accessToken));
});

router.get("/me/playlists", requireSpotify, async (req, res) => {
	const accessToken = await ensureAccessToken(req);
	res.json(await fetchSpotify<{ items: unknown[] }>("/me/playlists?limit=50", accessToken));
});

export default router;
