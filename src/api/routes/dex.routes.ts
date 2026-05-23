import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { buildOfferCancel, buildOfferCreate, getAccountOffers, getOrderBook } from "../../services/dex.service.js";
import { asyncHandler, maybeCreateXamanPayload } from "./helpers.js";

const router = Router();

const offerCreateSchema = z.object({
  account: z.string().min(1),
  side: z.enum(["buyAcu", "sellAcu"]),
  acuAmount: z.string().min(1),
  xrpAmount: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

const offerCancelSchema = z.object({
  account: z.string().min(1),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

router.post(
  "/offer/prepare",
  validateBody(offerCreateSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildOfferCreate(req.body);
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

router.delete(
  "/offer/:sequence/prepare",
  validateBody(offerCancelSchema),
  asyncHandler(async (req, res) => {
    const txjson = buildOfferCancel({
      account: req.body.account,
      offerSequence: Number(req.params.sequence)
    });
    const data = await maybeCreateXamanPayload(txjson, req.body.signWithXaman, req.body.userToken);
    res.json({ ok: true, data });
  })
);

router.get(
  "/book",
  asyncHandler(async (req, res) => {
    const side = req.query.side === "buyAcu" ? "buyAcu" : "sellAcu";
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const book = await getOrderBook(side, limit);
    res.json({ ok: true, data: book.result });
  })
);

router.get(
  "/offers/:account",
  asyncHandler(async (req, res) => {
    const offers = await getAccountOffers(String(req.params.account));
    res.json({ ok: true, data: offers.result });
  })
);

export default router;
