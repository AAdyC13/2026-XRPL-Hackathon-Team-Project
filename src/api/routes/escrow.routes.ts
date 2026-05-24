import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { buildCancelEscrow, buildConditionalEscrow, buildFinishEscrow } from "../../services/escrow.service.js";
import { asyncHandler, maybeCreateXamanPayload } from "./helpers.js";

const router = Router();

const createEscrowSchema = z.object({
  sender: z.string().min(1),
  receiver: z.string().min(1),
  amount: z.string().min(1),
  cancelAfterSeconds: z.number().int().positive().optional(),
  fulfillmentSecretHex: z.string().optional(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const finishEscrowSchema = z.object({
  finisher: z.string().min(1),
  owner: z.string().min(1),
  offerSequence: z.number().int().nonnegative(),
  fulfillment: z.string().min(1),
  condition: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const cancelEscrowSchema = z.object({
  account: z.string().min(1),
  owner: z.string().min(1),
  offerSequence: z.number().int().nonnegative(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

router.post(
  "/create/prepare",
  validateBody(createEscrowSchema),
  asyncHandler(async (req, res) => {
    const escrow = buildConditionalEscrow(req.body);
    const payload = await maybeCreateXamanPayload(escrow.transaction, req.body.signWithXaman, req.body.userToken);
    res.json({
      ok: true,
      data: {
        ...payload,
        cryptoCondition: escrow.cryptoCondition,
        cancelAfter: escrow.cancelAfter
      }
    });
  })
);

router.post(
  "/finish/prepare",
  validateBody(finishEscrowSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildFinishEscrow(req.body);
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

router.post(
  "/cancel/prepare",
  validateBody(cancelEscrowSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildCancelEscrow(req.body);
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

export default router;
