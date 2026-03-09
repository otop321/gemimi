import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple token generator using base64
function generateToken(username: string, secret: string): string {
  const payload = JSON.stringify({ username, ts: Date.now() });
  return Buffer.from(`${payload}:${secret}`).toString("base64");
}

// POST: Login
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const validUsername = process.env.AUTH_USERNAME || "admin";
    const validPassword = process.env.AUTH_PASSWORD || "admin123";
    const secret = process.env.AUTH_SECRET || "default-secret";

    if (username !== validUsername || password !== validPassword) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = generateToken(username, secret);

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, username });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE: Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  return NextResponse.json({ success: true });
}
