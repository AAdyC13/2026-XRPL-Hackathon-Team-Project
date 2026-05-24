import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { parseBody } from "../../common/zod.js";
import { XrplHelperService } from "../xrpl-helper.service.js";
import {
  buildIssuePayment,
  buildTransferPayment,
  getTokenBalance,
  issueToken
} from "../services/asset.service.js";

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

@Controller("/api/asset")
export class XrplAssetController {
  constructor(private readonly helperService: XrplHelperService) {}

  @Post("/issue/prepare")
  async issuePrepare(@Body() body: unknown) {
    const payload = parseBody(issueSchema, body);
    const txjson = buildIssuePayment(payload);
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }

  @Post("/issue")
  async issue(@Body() body: unknown) {
    const payload = parseBody(issueSchema.omit({ signWithXaman: true, userToken: true }), body);
    const data = await issueToken(payload);
    return { ok: true, data };
  }

  @Get("/balance/:account")
  async balance(@Param("account") account: string) {
    const balance = await getTokenBalance(account);
    return { ok: true, data: { balance } };
  }

  @Post("/transfer/prepare")
  async transferPrepare(@Body() body: unknown) {
    const payload = parseBody(transferSchema, body);
    const txjson = buildTransferPayment(payload);
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }
}
