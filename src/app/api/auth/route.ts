import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const validUser = process.env.AUTH_USERNAME || "admin";
  const validPass = process.env.AUTH_PASSWORD || "admin123";

  let isValid = false;

  // 1. Check hardcoded admin
  if (username === validUser && password === validPass) {
    isValid = true;
  } else {
    // 2. Check MongoDB
    try {
      await connectToDatabase();
      const user = await User.findOne({ username });
      if (user && user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
          isValid = true;
        }
      }
    } catch (error) {
      console.error("Database auth error", error);
    }
  }

  if (isValid) {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", process.env.AUTH_SECRET || "default-secret", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
    { status: 401 }
  );
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  return NextResponse.json({ success: true });
}
