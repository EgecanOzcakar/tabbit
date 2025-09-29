import express from "express";
import session from "cookie-session";
import authRouter from "./auth/index";
import spotifyRouter from "./routes/spotify";
import { env } from "./utils/env";

const app = express();

app.use(
	session({
		name: "sid",
		secret: env.SESSION_SECRET,
		maxAge: 7 * 24 * 60 * 60 * 1000,
		httpOnly: true,
		sameSite: "lax",
		signed: true,
	})
);

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/spotify", spotifyRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	// eslint-disable-next-line no-console
	console.error(err);
	res.status(500).json({ error: "Internal Server Error" });
});

app.listen(env.PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Server started on ${env.BASE_URL}`);
});


