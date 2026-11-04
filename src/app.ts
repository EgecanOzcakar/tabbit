import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import authRouter from "./auth/index.js";
import tasteRouter from "./routes/taste.js";
import { ProviderError } from "./utils/auth.js";
import { env } from "./utils/env.js";

export function createApp(store?: session.Store) {
	const isProd = env.NODE_ENV === "production";
	const app = express();
	if (isProd) app.set("trust proxy", 1);

	app.use(
		session({
			name: "sid",
			secret: env.SESSION_SECRET,
			...(store && { store }),
			resave: false,
			saveUninitialized: false,
			cookie: { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 },
		}),
	);
	app.use(express.json());
	app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));

	app.get("/health", (_req, res) => res.json({ ok: true }));
	app.use("/auth", authRouter);
	app.use(tasteRouter);

	app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
		if (err instanceof ProviderError) {
			if (err.retryAfter) res.set("Retry-After", err.retryAfter);
			return res.status(err.status).json({ error: err.message, ...(err.reauth && { reauth: true }) });
		}
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	});
	return app;
}
