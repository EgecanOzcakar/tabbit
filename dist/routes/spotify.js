import express from "express";
import { requireSpotify } from "../middleware/requireAuth";
import { fetchSpotify, refreshSpotifyToken } from "../utils/auth";
const router = express.Router();
async function ensureAccessToken(req) {
    const s = req.session;
    const tokens = s.spotify;
    if (Date.now() < tokens.expiresAt)
        return tokens.accessToken;
    const refreshed = await refreshSpotifyToken(tokens.refreshToken);
    s.spotify = refreshed;
    return refreshed.accessToken;
}
router.get("/me/recently-played", requireSpotify, async (req, res, next) => {
    try {
        const accessToken = await ensureAccessToken(req);
        const items = await fetchSpotify("/me/player/recently-played?limit=50", accessToken);
        res.json(items);
    }
    catch (err) {
        next(err);
    }
});
router.get("/me/playlists", requireSpotify, async (req, res, next) => {
    try {
        const accessToken = await ensureAccessToken(req);
        const playlists = await fetchSpotify("/me/playlists?limit=50", accessToken);
        res.json(playlists);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=spotify.js.map