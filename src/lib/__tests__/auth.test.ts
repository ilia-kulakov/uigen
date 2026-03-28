// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  store: new Map<string, string>(),
  get: vi.fn((name: string) => {
    const value = mockCookieStore.store.get(name);
    return value ? { name, value } : undefined;
  }),
  set: vi.fn((name: string, value: string) => {
    mockCookieStore.store.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    mockCookieStore.store.delete(name);
  }),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Must import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  mockCookieStore.store.clear();
  vi.clearAllMocks();
});

test("createSession sets an HttpOnly cookie", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
  expect(options.path).toBe("/");
});

test("createSession cookie value is a valid JWT with correct claims", async () => {
  await createSession("user-1", "test@example.com");

  const token = mockCookieStore.store.get("auth-token")!;
  expect(token).toBeTruthy();

  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("test@example.com");
});

test("getSession returns null when no cookie is present", async () => {
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns parsed payload for a valid token", async () => {
  const token = await makeToken({
    userId: "user-2",
    email: "hello@example.com",
    expiresAt: new Date(),
  });
  mockCookieStore.store.set("auth-token", token);

  const session = await getSession();
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-2");
  expect(session!.email).toBe("hello@example.com");
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-3", email: "old@example.com", expiresAt: new Date() },
    "-1s"
  );
  mockCookieStore.store.set("auth-token", token);

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for a tampered token", async () => {
  mockCookieStore.store.set("auth-token", "not.a.valid.jwt");

  const session = await getSession();
  expect(session).toBeNull();
});

test("deleteSession removes the auth cookie", async () => {
  mockCookieStore.store.set("auth-token", "some-token");

  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns null when request has no cookie", async () => {
  const request = {
    cookies: { get: () => undefined },
  } as any;

  const session = await verifySession(request);
  expect(session).toBeNull();
});

test("verifySession returns payload for a valid token in the request", async () => {
  const token = await makeToken({
    userId: "user-4",
    email: "req@example.com",
    expiresAt: new Date(),
  });
  const request = {
    cookies: { get: (name: string) => (name === "auth-token" ? { value: token } : undefined) },
  } as any;

  const session = await verifySession(request);
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-4");
  expect(session!.email).toBe("req@example.com");
});

test("verifySession returns null for an invalid token in the request", async () => {
  const request = {
    cookies: { get: () => ({ value: "bad-token" }) },
  } as any;

  const session = await verifySession(request);
  expect(session).toBeNull();
});
