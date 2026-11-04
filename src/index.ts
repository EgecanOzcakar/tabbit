import type session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import { createApp } from "./app.js";
import { creds, env } from "./utils/env.js";

let store: session.Store | undefined;
if (env.REDIS_URL) {
	const redis = createClient({ url: env.REDIS_URL });
	redis.on("error", (err) => console.error("Redis error:", err));
	await redis.connect();
	store = new RedisStore({ client: redis, prefix: "tabbit:sess:" });
} else if (env.NODE_ENV === "production") {
	console.error("REDIS_URL is required in production (MemoryStore leaks memory and loses sessions on restart).");
	process.exit(1);
} else {
	console.warn("REDIS_URL not set: using in-memory session store (dev only).");
}

const mocked = Object.entries(creds).flatMap(([p, c]) => (c ? [] : [p]));
if (mocked.length) console.warn(`Mock data for: ${mocked.join(", ")} (no credentials or MOCK_PROVIDERS=1).`);

createApp(store).listen(env.PORT, () => console.log(`Server listening on port ${env.PORT} (${env.BASE_URL})`));
