import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import authRouter from "./auth/index.js";
import spotifyRouter from "./routes/spotify.js";
import { SpotifyError } from "./utils/auth.js";
import { env } from "./utils/env.js";

const isProd = env.NODE_ENV === "production";
const app = express();
if (isProd) app.set("trust proxy", 1);

let store: session.Store | undefined;
if (env.REDIS_URL) {
	const redis = createClient({ url: env.REDIS_URL });
	redis.on("error", (err) => console.error("Redis error:", err));
	await redis.connect();
	store = new RedisStore({ client: redis, prefix: "tabbit:sess:" });
} else if (isProd) {
	console.error("REDIS_URL is required in production (MemoryStore leaks memory and loses sessions on restart).");
	process.exit(1);
} else {
	console.warn("REDIS_URL not set: using in-memory session store (dev only).");
}

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

app.get("/", (req, res) => res.json({ ok: true, spotify: Boolean(req.session.spotify) }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/spotify", spotifyRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	if (err instanceof SpotifyError) {
		if (err.retryAfter) res.set("Retry-After", err.retryAfter);
		return res.status(err.status).json({
			error: err.message,
			...(err.reauth && { reauth: true, login: "/auth/spotify/login" }),
		});
	}
	console.error(err);
	res.status(500).json({ error: "Internal Server Error" });
});

app.listen(env.PORT, () => console.log(`Server listening on port ${env.PORT} (${env.BASE_URL})`));
