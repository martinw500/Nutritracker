import { toNextJsHandler } from "better-auth/next-js";
import { getAuth, hasAuthConfiguration } from "@/lib/auth";

type Method = "GET" | "POST";

export async function GET(request: Request) {
  return handle("GET", request);
}

export async function POST(request: Request) {
  return handle("POST", request);
}

async function handle(method: Method, request: Request): Promise<Response> {
  if (!hasAuthConfiguration()) {
    return Response.json(
      {
        error:
          "Accounts are not configured yet. Set DATABASE_URL and BETTER_AUTH_SECRET, then run npm run db:migrate.",
      },
      { status: 503 },
    );
  }

  const handlers = toNextJsHandler(getAuth());
  return handlers[method](request);
}
