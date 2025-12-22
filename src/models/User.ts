export type UserRole = "customer" | "admin";

export interface User {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}
