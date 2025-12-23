import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

/**
 * USER ORDER HISTORY
 */
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  const orders = await db
    .collection("orders")
    .find({ userId: new ObjectId(user.userId) })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(orders);
}
