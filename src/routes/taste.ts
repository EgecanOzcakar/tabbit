import express from "express";
import { z } from "zod";
import * as spotify from "../providers/spotify.js";
import * as deezer from "../providers/deezer.js";
import { aggregate } from "../profile.js";
import { INSTRUMENTS, recommend } from "../recommend.js";
import { creds } from "../utils/env.js";
import type { Provider } from "../types.js";

const providers = { spotify, deezer };
const router = express.Router();

const connected = (req: express.Request) => (Object.keys(providers) as Provider[]).filter((p) => req.session[p]);

async function profileFor(req: express.Request, res: express.Response) {
	const list = connected(req);
	if (!list.length) {
		res.status(401).json({ error: "Connect Spotify or Deezer first", login: ["/auth/spotify/login", "/auth/deezer/login"] });
		return null;
	}
	return aggregate(await Promise.all(list.map((p) => providers[p].getTaste(req))));
}

router.get("/me", (req, res) => {
	const list = connected(req);
	res.json({
		connected: { spotify: list.includes("spotify"), deezer: list.includes("deezer") },
		mock: { spotify: !creds.spotify, deezer: !creds.deezer },
	});
});

router.get("/me/profile", async (req, res) => {
	const profile = await profileFor(req, res);
	if (profile) res.json(profile);
});

const Query = z.object({ instrument: z.enum(INSTRUMENTS) });

router.get("/recommendations", async (req, res) => {
	const q = Query.safeParse(req.query);
	if (!q.success) return res.status(400).json({ error: `instrument must be one of: ${INSTRUMENTS.join(", ")}` });
	const profile = await profileFor(req, res);
	if (profile) res.json({ instrument: q.data.instrument, items: recommend(profile.sampleTracks, q.data.instrument) });
});

export default router;
