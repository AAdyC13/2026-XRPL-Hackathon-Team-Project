import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/create-test-app.js";
import { resetDatabase, seedDemoUser } from "../helpers/db.js";

describe("Auth API", () => {
  let appContext: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    appContext = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(appContext.prisma);
    await seedDemoUser(appContext.prisma);
  });

  afterAll(async () => {
    await appContext.app.close();
  });

  it("registers a valid user", async () => {
    const response = await appContext.http.post("/api/v1/auth/register").send({
      username: "new_user_01",
      email: "new_user_01@example.com",
      password: "ValidPassword1"
    });

    expect([200, 201]).toContain(response.status);
    expect(response.body).toMatchObject({
      username: "new_user_01",
      email: "new_user_01@example.com"
    });
    expect(typeof response.body.token).toBe("string");
  });

  it("rejects weak password on register", async () => {
    const response = await appContext.http.post("/api/v1/auth/register").send({
      username: "new_user_02",
      email: "new_user_02@example.com",
      password: "weak"
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_PARAMS");
  });

  it("rejects duplicate email on register", async () => {
    const response = await appContext.http.post("/api/v1/auth/register").send({
      username: "another_user",
      email: "demo_user_1@gkc.edu.tw",
      password: "ValidPassword1"
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_PARAMS");
  });

  it("logs in demo user with valid credentials", async () => {
    const response = await appContext.http.post("/api/v1/auth/login").send({
      email: "demo_user_1@gkc.edu.tw",
      password: "Demo1234"
    });

    expect([200, 201]).toContain(response.status);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.user.email).toBe("demo_user_1@gkc.edu.tw");
  });

  it("rejects invalid password on login", async () => {
    const response = await appContext.http.post("/api/v1/auth/login").send({
      email: "demo_user_1@gkc.edu.tw",
      password: "WrongPassword1"
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("returns profile for valid JWT on /me", async () => {
    const loginResponse = await appContext.http.post("/api/v1/auth/login").send({
      email: "demo_user_1@gkc.edu.tw",
      password: "Demo1234"
    });
    const token = loginResponse.body.token as string;

    const meResponse = await appContext.http.get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
    expect(meResponse.body).toMatchObject({
      email: "demo_user_1@gkc.edu.tw",
      username: "demo_user_1"
    });
  });

  it("rejects /me without JWT", async () => {
    const response = await appContext.http.get("/api/v1/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });
});
