export function requireSpotify(req, res, next) {
    const tokens = req.session.spotify;
    if (!tokens)
        return res.status(401).json({ error: "Not authenticated with Spotify" });
    next();
}
//# sourceMappingURL=requireAuth.js.map