import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/create-test-app.js";
import { resetDatabase, seedDemoUser } from "../helpers/db.js";

describe("GET /health", () => {
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

  it("returns service ok and mock xrpl connected", async () => {
    const response = await appContext.http.get("/health").expect(200);
    expect(response.body).toEqual({
      ok: true,
      data: {
        service: "ok",
        xrpl: "connected"
      }
    });
  });
});
