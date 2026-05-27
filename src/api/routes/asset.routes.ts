import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { buildIssuePayment, buildTransferPayment, getTokenBalance, issueToken } from "../../services/asset.service.js";
import { asyncHandler, maybeCreateXamanPayload } from "./helpers.js";

const router = Router();

const issueSchema = z.object({
  destination: z.string().min(1),
  amount: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const transferSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

router.post(
  "/issue/prepare",
  validateBody(issueSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildIssuePayment(req.body);
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

router.post(
  "/issue",
  validateBody(issueSchema.omit({ signWithXaman: true, userToken: true })),
  asyncHandler(async (req, res) => {
    const result = await issueToken(req.body);
    res.json({ ok: true, data: result });
  })
);

router.get(
  "/balance/:account",
  asyncHandler(async (req, res) => {
    const balance = await getTokenBalance(String(req.params.account));
    res.json({ ok: true, data: { balance } });
  })
);

router.post(
  "/transfer/prepare",
  validateBody(transferSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildTransferPayment(req.body);
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

export default router;
