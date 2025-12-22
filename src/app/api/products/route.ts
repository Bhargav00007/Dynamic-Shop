import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  const body = await req.json();

  await db.collection("products").insertOne({
    ...body,
    category: new ObjectId(body.category),
    subCategory: body.subCategory ? new ObjectId(body.subCategory) : null,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const client = await clientPromise;
  const db = client.db();

  const products = await db
    .collection("products")
    .find({ status: "active" })
    .toArray();

  return NextResponse.json(products);
}
