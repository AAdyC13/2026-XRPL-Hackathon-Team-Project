import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { parseBody } from "../../common/zod.js";
import { XrplHelperService } from "../xrpl-helper.service.js";
import { buildTrustSetTx, getTrustLines } from "../services/trustline.service.js";

const prepareTrustlineSchema = z.object({
  account: z.string().min(1),
  limit: z.string().optional(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

@Controller("/api/trustline")
export class XrplTrustlineController {
  constructor(private readonly helperService: XrplHelperService) {}

  @Post("/prepare")
  async prepare(@Body() body: unknown) {
    const payload = parseBody(prepareTrustlineSchema, body);
    const txjson = buildTrustSetTx({
      holder: payload.account,
      limit: payload.limit
    });
    const data = await this.helperService.maybeCreateXamanPayload(txjson, payload.signWithXaman, payload.userToken);
    return { ok: true, data };
  }

  @Get("/:account")
  async getByAccount(@Param("account") account: string) {
    const lines = await getTrustLines(account);
    return { ok: true, data: { lines } };
  }
}
