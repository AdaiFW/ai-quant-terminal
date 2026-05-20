import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers.
 */
export function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
