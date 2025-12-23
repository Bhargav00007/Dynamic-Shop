import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

/**
 * CREATE ORDER (CUSTOMER + ADMIN)
 * - Checks stock
 * - Reduces stock
 * - Prevents overselling
 */
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json();

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Order items required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();

  const orderItems: any[] = [];
  let subtotal = 0;

  /**
   * STEP 1: Validate all products & stock
   */
  for (const item of items) {
    const product = await db.collection("products").findOne({
      _id: new ObjectId(item.productId),
      status: "active",
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or inactive" },
        { status: 404 }
      );
    }

    const variant = product.variants?.find(
      (v: any) => v.size === item.variant.size && v.color === item.variant.color
    );

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 400 });
    }

    if (variant.stock < item.quantity) {
      return NextResponse.json(
        {
          error: "Product out of stock",
          productId: product._id,
          availableStock: variant.stock,
        },
        { status: 400 }
      );
    }

    subtotal += product.price * item.quantity;

    orderItems.push({
      productId: product._id,
      title: product.title,
      variant: item.variant,
      quantity: item.quantity,
      price: product.price,
      image: product.images?.[0]?.url || "",
    });
  }

  /**
   * STEP 2: Reduce stock (SAFE)
   */
  for (const item of orderItems) {
    const result = await db.collection("products").updateOne(
      {
        _id: item.productId,
        "variants.size": item.variant.size,
        "variants.color": item.variant.color,
        "variants.stock": { $gte: item.quantity }, // 🔒 safety check
      },
      {
        $inc: {
          "variants.$.stock": -item.quantity,
        },
      }
    );

    // If update failed → rollback logic (simple fail)
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Stock update failed, please retry" },
        { status: 409 }
      );
    }
  }

  /**
   * STEP 3: Update product status if all variants are out of stock
   */
  for (const item of orderItems) {
    const product = await db.collection("products").findOne({
      _id: item.productId,
    });

    const totalStock =
      product?.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0;

    if (totalStock === 0) {
      await db
        .collection("products")
        .updateOne(
          { _id: item.productId },
          { $set: { status: "out_of_stock" } }
        );
    }
  }

  /**
   * STEP 4: Create order
   */
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const order = await db.collection("orders").insertOne({
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

  /**
   * STEP 5: Clear cart
   */
  await db.collection("carts").deleteOne({
    userId: new ObjectId(user.userId),
  });

  return NextResponse.json({
    success: true,
    orderId: order.insertedId,
  });
}
