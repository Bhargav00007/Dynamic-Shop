import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";

/**
 * ADMIN ORDER DASHBOARD
 */
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  const orders = await db
    .collection("orders")
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(orders);
}
