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

  const { name, parent } = await req.json();

  await db.collection("categories").insertOne({
    name,
    parent: parent ? new ObjectId(parent) : null,
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const client = await clientPromise;
  const db = client.db();

  const categories = await db.collection("categories").find().toArray();
  return NextResponse.json(categories);
}
