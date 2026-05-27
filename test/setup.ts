import dotenv from "dotenv";
import { vi } from "vitest";
import { MOCK_XRPL_BALANCE } from "./mocks/xrpl.js";

dotenv.config({ path: ".env.test.example" });
dotenv.config({ path: ".env.test", override: true });
process.env.NODE_ENV = "test";

vi.mock("../src/xrpl/infrastructure/xrpl.client.js", async () => {
  const actual = await vi.importActual<typeof import("../src/xrpl/infrastructure/xrpl.client.js")>(
    "../src/xrpl/infrastructure/xrpl.client.js"
  );

  return {
    ...actual,
    getClient: vi.fn(async () => ({
      isConnected: () => true
    })),
    getXrpBalance: vi.fn(async () => MOCK_XRPL_BALANCE.xrp)
  };
});

vi.mock("../src/xrpl/services/asset.service.js", async () => {
  const actual = await vi.importActual<typeof import("../src/xrpl/services/asset.service.js")>(
    "../src/xrpl/services/asset.service.js"
  );

  return {
    ...actual,
    getTokenBalance: vi.fn(async () => MOCK_XRPL_BALANCE.gkc)
  };
});

vi.mock("../src/xrpl/services/trustline.service.js", async () => {
  const actual = await vi.importActual<typeof import("../src/xrpl/services/trustline.service.js")>(
    "../src/xrpl/services/trustline.service.js"
  );

  return {
    ...actual,
    getTrustLines: vi.fn(async () => MOCK_XRPL_BALANCE.lines)
  };
});
