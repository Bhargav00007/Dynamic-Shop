import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

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

export async function DELETE(req: NextRequest, { params }: any) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  await db.collection("products").deleteOne({ _id: new ObjectId(params.id) });

  return NextResponse.json({ success: true });
}
