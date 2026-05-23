import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { buildTrustSetTx, getTrustLines } from "../../services/trustline.service.js";
import { asyncHandler, maybeCreateXamanPayload } from "./helpers.js";

const router = Router();

const prepareTrustlineSchema = z.object({
  account: z.string().min(1),
  limit: z.string().optional(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

router.post(
  "/prepare",
  validateBody(prepareTrustlineSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildTrustSetTx({
      holder: req.body.account,
      limit: req.body.limit
    });
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

router.get(
  "/:account",
  asyncHandler(async (req, res) => {
    const lines = await getTrustLines(String(req.params.account));
    res.json({ ok: true, data: { lines } });
  })
);

export default router;
