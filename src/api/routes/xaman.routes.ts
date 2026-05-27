import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { createSignRequest, getPayloadStatus, submitSignedPayload } from "../../services/xaman.service.js";
import { asyncHandler } from "./helpers.js";

const router = Router();

const payloadSchema = z.object({
  txjson: z.record(z.unknown()),
  userToken: z.string().optional(),
  customMeta: z
    .object({
      identifier: z.string().optional(),
      instruction: z.string().optional(),
      blob: z.record(z.unknown()).optional()
    })
    .optional()
});

router.post(
  "/payload",
  validateBody(payloadSchema),
  asyncHandler(async (req, res) => {
    const payload = await createSignRequest(req.body);
    res.json({ ok: true, data: payload });
  })
);

router.get(
  "/payload/:uuid",
  asyncHandler(async (req, res) => {
    const status = await getPayloadStatus(String(req.params.uuid));
    res.json({ ok: true, data: status });
  })
);

router.post(
  "/payload/:uuid/submit",
  asyncHandler(async (req, res) => {
    const result = await submitSignedPayload(String(req.params.uuid));
    res.json({ ok: true, data: result });
  })
);

export default router;
