import jwt from "jsonwebtoken";

export type UserRole = "admin" | "customer";

const JWT_SECRET = process.env.JWT_SECRET!;

export function signToken(payload: { userId: string; role: UserRole }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    userId: string;
    role: UserRole;
  };
}
