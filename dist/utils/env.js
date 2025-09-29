import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const EnvSchema = z.object({
    PORT: z
        .string()
        .transform((v) => (v ? Number(v) : 3000))
        .pipe(z.number().int().positive())
        .default("3000"),
    BASE_URL: z.string().url().default("http://localhost:3000"),
    SESSION_SECRET: z.string().min(8),
    SPOTIFY_CLIENT_ID: z.string().min(1),
    SPOTIFY_CLIENT_SECRET: z.string().min(1),
    SPOTIFY_REDIRECT_URI: z.string().url(),
});
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
export const env = parsed.data;
//# sourceMappingURL=env.js.map