import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { parseBody } from "../../common/zod.js";
import { createSignRequest, getPayloadStatus, submitSignedPayload } from "../services/xaman.service.js";

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

@Controller("/api/xaman")
export class XrplXamanController {
  @Post("/payload")
  async payload(@Body() body: unknown) {
    const payload = parseBody(payloadSchema, body);
    const data = await createSignRequest(payload);
    return { ok: true, data };
  }

  @Get("/payload/:uuid")
  async getStatus(@Param("uuid") uuid: string) {
    const data = await getPayloadStatus(uuid);
    return { ok: true, data };
  }

  @Post("/payload/:uuid/submit")
  async submit(@Param("uuid") uuid: string) {
    const data = await submitSignedPayload(uuid);
    return { ok: true, data };
  }
}
