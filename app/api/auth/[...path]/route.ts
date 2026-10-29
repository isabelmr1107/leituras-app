import { getAuth } from "@/lib/auth/server";

type RequestHandler = (request: Request) => Promise<Response>;
function route(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"): RequestHandler {
  return async (request) => {
    const handler = getAuth().handler();
    return handler[method](request);
  };
}
export const GET = route("GET");
export const POST = route("POST");
export const PUT = route("PUT");
export const DELETE = route("DELETE");
export const PATCH = route("PATCH");
