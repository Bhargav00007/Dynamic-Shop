import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthUser } from "@/lib/auth";

/**
 * ADD / UPDATE CART ITEM
 */
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, variant, quantity, price } = await req.json();

  if (!productId || !variant || !quantity || quantity <= 0) {
    return NextResponse.json(
      { error: "Invalid cart payload" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();
  const userId = new ObjectId(user.userId);

  // 🔎 check product exists
  const product = await db.collection("products").findOne({
    _id: new ObjectId(productId),
    status: "active",
  });

  if (!product) {
    return NextResponse.json(
      { error: "Product does not exist" },
      { status: 404 }
    );
  }

  // 🔎 check variant exists
  const variantExists = product.variants?.some(
    (v: any) =>
      v.size === variant.size && v.color === variant.color && v.stock > 0
  );

  if (!variantExists) {
    return NextResponse.json(
      { error: "Variant not available" },
      { status: 400 }
    );
  }

  const cart = await db.collection("carts").findOne({ userId });

  if (!cart) {
    // 🆕 create cart
    await db.collection("carts").insertOne({
      userId,
      items: [
        {
          _id: new ObjectId(),
          productId: new ObjectId(productId),
          variant,
          quantity,
          price,
        },
      ],
      coupon: null,
      updatedAt: new Date(),
    });
  } else {
    // 🔁 check if item already exists
    const existingItem = cart.items.find(
      (item: any) =>
        item.productId.toString() === productId &&
        item.variant.size === variant.size &&
        item.variant.color === variant.color
    );

    if (existingItem) {
      // update quantity
      await db.collection("carts").updateOne(
        { userId, "items._id": existingItem._id },
        {
          $set: {
            "items.$.quantity": quantity,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // add new item
      await db.collection("carts").updateOne(
        { userId },
        {
          $push: {
            items: {
              _id: new ObjectId(),
              productId: new ObjectId(productId),
              variant,
              quantity,
              price,
            },
          } as any,
          $set: { updatedAt: new Date() },
        }
      );
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * GET CART (VIEW ITEMS)
 */
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  const cart = await db.collection("carts").findOne({
    userId: new ObjectId(user.userId),
  });

  return NextResponse.json(cart || { items: [], coupon: null });
}
