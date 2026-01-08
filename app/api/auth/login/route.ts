// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  console.log("[Login API] ========== Login request received ==========");

  try {
    const body = await request.json();
    const { username, password } = body;

    // 요청 바디 로깅 (비밀번호는 마스킹)
    console.log("[Login API] Request body:", {
      username,
      password: password ? "***masked***" : undefined,
      bodyKeys: Object.keys(body),
    });

    // 입력 검증
    if (!username || !password) {
      console.log("[Login API] ❌ Validation failed: missing username or password");
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // DB에서 사용자 찾기
    console.log("[Login API] Searching for user:", username);
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    console.log("[Login API] User lookup result:", {
      found: !!admin,
      adminId: admin?.id,
      adminUsername: admin?.username,
      hasPassword: !!admin?.password,
      passwordLength: admin?.password?.length,
    });

    if (!admin) {
      console.log("[Login API] ❌ 401: User not found in database");
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 틀렸습니다." },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    console.log("[Login API] Comparing passwords...");
    console.log("[Login API] Input password length:", password.length);
    console.log("[Login API] Stored hash (first 20 chars):", admin.password.substring(0, 20) + "...");

    const isValidPassword = await bcrypt.compare(password, admin.password);
    console.log("[Login API] Password comparison result:", isValidPassword);

    if (!isValidPassword) {
      console.log("[Login API] ❌ 401: Password mismatch");
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 틀렸습니다." },
        { status: 401 }
      );
    }

    // ✅ isActive 체크 - 비활성화된 계정 로그인 차단
    if (!admin.isActive) {
      console.log("[Login API] ❌ 403: Account is inactive");
      return NextResponse.json(
        { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
        { status: 403 }
      );
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role, // ✅ 추가
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    console.log(`[Login] Success for user: ${admin.username}`);

    // ✅ 응답 body에서 token 제거 - 쿠키만 사용
    const response = NextResponse.json({
      success: true,
      // token 필드 제거 (쿠키 단일 소스)
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
      },
    });

    // 환경 변수로 HTTPS 여부 판단 (EC2 프록시 환경 고려)
    const isHttps = (process.env.NEXTAUTH_URL || "").startsWith("https://");

    // ✅ httpOnly 쿠키에만 토큰 저장
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    });

    console.log("[Login] Cookie set, secure:", isHttps);
    return response;
  } catch (error) {
    console.error("로그인 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
