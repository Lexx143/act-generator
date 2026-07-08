import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_HOURS = 12;

export type SessionPayload = {
  uid: number;
  login: string;
  name: string;
  role: "admin" | "specialist";
};

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET не задан");
  }
  return new TextEncoder().encode(s || "dev-secret-only-for-local-development");
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "number") return null;
    return {
      uid: payload.uid,
      login: String(payload.login),
      name: String(payload.name),
      role: payload.role === "admin" ? "admin" : "specialist",
    };
  } catch {
    return null;
  }
}
