import { auth } from "@/app/auth";
import { toNextJsHandler } from "better-auth/next-js";

/** `nextCookies()` + `cookies().set()` : comportement stable en Node sur Vercel. */
export const runtime = "nodejs";

export const { POST, GET } = toNextJsHandler(auth);