import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(); // default DB
  const users = db.collection("users");

  const existing = await users.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await users.insertOne({
    name,
    email,
    password: hashedPassword,
    role: "customer",
    createdAt: new Date(),
  });

  // ✅ JWT payload matches lib/jwt.ts exactly
  const token = signToken({
    userId: result.insertedId.toString(),
    role: "customer",
  });

  return NextResponse.json({
    message: "Signup successful",
    token,
  });
}
