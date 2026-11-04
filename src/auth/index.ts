import express from "express";
import { env, creds } from "../utils/env.js";
import { isValidState, newOAuthState } from "../utils/auth.js";
import * as spotify from "../providers/spotify.js";
import * as deezer from "../providers/deezer.js";

const router = express.Router();

for (const [name, p] of Object.entries({ spotify, deezer }) as [
	"spotify" | "deezer",
	Pick<typeof spotify, "authorizeUrl" | "connect" | "connectMock">,
][]) {
	router.get(`/${name}/login`, (req, res) => {
		if (!creds[name]) {
			// Mock mode: no real provider, just mark the session connected.
			p.connectMock(req);
			return res.redirect(env.APP_URL ?? "/");
		}
		const state = newOAuthState();
		req.session.oauthState = state;
		res.redirect(p.authorizeUrl(state));
	});

	router.get(`/${name}/callback`, async (req, res) => {
		const { code, state } = req.query;
		const error = req.query.error ?? req.query.error_reason; // Spotify: error, Deezer: error_reason
		const expected = req.session.oauthState;
		delete req.session.oauthState; // single use

		if (!isValidState(expected, state)) {
			return res.status(400).json({ error: `Invalid or missing OAuth state. Start again at /auth/${name}/login.` });
		}
		if (typeof error === "string") {
			const denied = error === "access_denied" || error === "user_denied";
			return res.status(denied ? 403 : 400).json({ error: `${name} authorization was not granted`, reason: error });
		}
		if (typeof code !== "string") return res.status(400).json({ error: "Missing code" });

		await p.connect(req, code);
		res.redirect(env.APP_URL ?? "/");
	});
}

router.post("/logout", (req, res, next) => {
	req.session.destroy((err) => {
		if (err) return next(err);
		res.clearCookie("sid").status(204).end();
	});
});

export default router;
