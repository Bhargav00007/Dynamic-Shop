import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

// ✅ CREATE PRODUCT (ADMIN ONLY)
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  const body = await req.json();

  // auto stock → status
  const totalStock =
    body.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) ||
    0;

  await db.collection("products").insertOne({
    ...body,
    category: new ObjectId(body.category),
    subCategory: body.subCategory ? new ObjectId(body.subCategory) : null,
    status: totalStock === 0 ? "out_of_stock" : "active",
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

// ✅ LIST PRODUCTS (PUBLIC)
export async function GET() {
  const client = await clientPromise;
  const db = client.db();

  const products = await db
    .collection("products")
    .find({ status: "active" })
    .toArray();

  return NextResponse.json(products);
}
