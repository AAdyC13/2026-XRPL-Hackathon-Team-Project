import { Router } from "express";
import { getClient } from "../../infrastructure/xrpl.client.js";
import assetRoutes from "./asset.routes.js";
import dexRoutes from "./dex.routes.js";
import escrowRoutes from "./escrow.routes.js";
import trustlineRoutes from "./trustline.routes.js";
import xamanRoutes from "./xaman.routes.js";
import { asyncHandler } from "./helpers.js";

const router = Router();

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const client = await getClient();
    res.json({
      ok: true,
      data: {
        service: "ok",
        xrpl: client.isConnected() ? "connected" : "disconnected"
      }
    });
  })
);

router.use("/api/trustline", trustlineRoutes);
router.use("/api/asset", assetRoutes);
router.use("/api/xaman", xamanRoutes);
router.use("/api/dex", dexRoutes);
router.use("/api/escrow", escrowRoutes);

export default router;
