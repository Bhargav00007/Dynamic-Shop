import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

/**
 * GET SINGLE CART ITEM
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  const cart = await db.collection("carts").findOne(
    {
      userId: new ObjectId(user.userId),
      "items._id": new ObjectId(params.itemId),
    },
    {
      projection: {
        items: {
          $elemMatch: { _id: new ObjectId(params.itemId) },
        },
      },
    }
  );

  if (!cart || !cart.items || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  }

  return NextResponse.json(cart.items[0]);
}

/**
 * DELETE CART ITEM
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  await db.collection("carts").updateOne(
    { userId: new ObjectId(user.userId) },
    {
      $pull: {
        items: { _id: new ObjectId(params.itemId) },
      } as any, // TS-safe for MongoDB driver
      $set: { updatedAt: new Date() },
    }
  );

  return NextResponse.json({ success: true });
}
