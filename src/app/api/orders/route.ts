import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

/**
 * CREATE ORDER
 */
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json();

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Order items required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();

  let subtotal = 0;

  // 🔒 validate stock & calculate price
  const orderItems = [];

  for (const item of items) {
    const product = await db.collection("products").findOne({
      _id: new ObjectId(item.productId),
      status: "active",
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const variant = product.variants.find(
      (v: any) => v.size === item.variant.size && v.color === item.variant.color
    );

    if (!variant || variant.stock < item.quantity) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 400 }
      );
    }

    subtotal += item.quantity * product.price;

    orderItems.push({
      productId: product._id,
      title: product.title,
      variant: item.variant,
      quantity: item.quantity,
      price: product.price,
      image: product.images?.[0]?.url || "",
    });
  }

  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  // 🧾 create order
  const result = await db.collection("orders").insertOne({
    userId: new ObjectId(user.userId),
    items: orderItems,
    subtotal,
    tax,
    discount: 0,
    total,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 📉 reduce stock
  for (const item of orderItems) {
    await db.collection("products").updateOne(
      {
        _id: item.productId,
        "variants.size": item.variant.size,
        "variants.color": item.variant.color,
      },
      {
        $inc: { "variants.$.stock": -item.quantity },
      }
    );
  }

  // 🗑️ clear cart
  await db.collection("carts").deleteOne({
    userId: new ObjectId(user.userId),
  });

  return NextResponse.json({
    success: true,
    orderId: result.insertedId,
  });
}
