import { NextRequest } from "next/server";
import { verifyToken, UserRole } from "./jwt";

export function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    // 🔒 HARD ROLE CHECK (IMPORTANT)
    if (decoded.role !== "admin" && decoded.role !== "customer") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
