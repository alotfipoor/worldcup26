import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "session";
const EXPIRY_DAYS = 30;

export interface SessionPayload {
  sessionId: string;
  userId: string;
  role: string;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(SECRET);
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { token, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  return session;
}

export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(
    Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  const session = await prisma.session.create({
    data: { userId, token: "", expiresAt },
  });

  const token = await signToken({ sessionId: session.id, userId, role });

  await prisma.session.update({
    where: { id: session.id },
    data: { token },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session
      .delete({ where: { token } })
      .catch(() => {});
    cookieStore.delete(COOKIE_NAME);
  }
}
