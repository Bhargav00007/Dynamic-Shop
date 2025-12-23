import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

// ✅ GET SINGLE PRODUCT (PUBLIC)
export async function GET(_: NextRequest, { params }: any) {
  const client = await clientPromise;
  const db = client.db();

  const product = await db
    .collection("products")
    .findOne({ _id: new ObjectId(params.id) });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

// 🔒 UPDATE PRODUCT (ADMIN)
export async function PUT(req: NextRequest, { params }: any) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();
  const body = await req.json();

  await db
    .collection("products")
    .updateOne({ _id: new ObjectId(params.id) }, { $set: body });

  return NextResponse.json({ success: true });
}

// 🔒 DELETE PRODUCT (ADMIN)
export async function DELETE(_: NextRequest, { params }: any) {
  const user = getAuthUser(_);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  await db.collection("products").deleteOne({ _id: new ObjectId(params.id) });

  return NextResponse.json({ success: true });
}
