import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/create-test-app.js";
import { resetDatabase, seedDemoUser } from "../helpers/db.js";

describe("Wallet API", () => {
  let appContext: Awaited<ReturnType<typeof createTestApp>>;
  let authToken = "";

  beforeAll(async () => {
    appContext = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(appContext.prisma);
    await seedDemoUser(appContext.prisma);

    const loginResponse = await appContext.http.post("/api/v1/auth/login").send({
      email: "demo@gkc.edu.tw",
      password: "Demo12345678"
    });
    authToken = loginResponse.body.token as string;
  });

  afterAll(async () => {
    await appContext.app.close();
  });

  it("rejects wallet endpoint without JWT", async () => {
    await appContext.http.get("/api/v1/wallet").expect(401);
  });

  it("returns wallet profile from database with JWT", async () => {
    const response = await appContext.http
      .get("/api/v1/wallet")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      gkc_balance: 2847.52,
      xrp_balance: 128.5,
      xrp_address: "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1"
    });
  });

  it("returns mocked balance payload", async () => {
    const response = await appContext.http
      .get("/api/v1/wallet/balance")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.account).toBe("rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1");
    expect(response.body.gkc_balance).toBe("2847.52000000");
    expect(response.body.xrp_balance).toBe("128.5");
    expect(Array.isArray(response.body.lines)).toBe(true);
  });

  it("returns trustline txjson without xaman signing", async () => {
    const response = await appContext.http
      .post("/api/v1/wallet/trustline")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ limit: "250000", signWithXaman: false })
      .expect(201);

    expect(response.body).toHaveProperty("txjson");
    expect(response.body).not.toHaveProperty("xaman");
  });
});
