import type { Request, Response, NextFunction } from "express";

export function requireSpotify(req: Request, res: Response, next: NextFunction) {
	if (!req.session.spotify) return res.status(401).json({ error: "Not authenticated with Spotify" });
	next();
}
