import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

const ALLOWED_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

/**
 * UPDATE ORDER STATUS (ADMIN)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { status } = await req.json();

  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  await db.collection("orders").updateOne(
    { _id: new ObjectId(params.orderId) },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ success: true });
}
