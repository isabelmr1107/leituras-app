import { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

type AuthRouteContext = { params: Promise<{ path: string[] }> };
async function dispatch(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", request: NextRequest, context: AuthRouteContext) {
  const handler = getAuth().handler();
  return handler[method](request, context);
}
export const GET = (request: NextRequest, context: AuthRouteContext) => dispatch("GET", request, context);
export const POST = (request: NextRequest, context: AuthRouteContext) => dispatch("POST", request, context);
export const PUT = (request: NextRequest, context: AuthRouteContext) => dispatch("PUT", request, context);
export const DELETE = (request: NextRequest, context: AuthRouteContext) => dispatch("DELETE", request, context);
export const PATCH = (request: NextRequest, context: AuthRouteContext) => dispatch("PATCH", request, context);
