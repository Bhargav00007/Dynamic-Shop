import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getAuthUser } from "@/lib/auth";
import { Readable } from "stream";

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}

export async function POST(req: NextRequest) {
  // 🔐 admin check
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // ✅ read multipart form
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  // convert File → Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // upload to Cloudinary using stream
  const uploadResult = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "dynamic-shop" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    bufferToStream(buffer).pipe(uploadStream);
  });

  return NextResponse.json({
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  });
}

export async function DELETE(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { publicId } = await req.json();
  if (!publicId) {
    return NextResponse.json({ error: "publicId required" }, { status: 400 });
  }

  await cloudinary.uploader.destroy(publicId);
  return NextResponse.json({ success: true });
}
