import { Injectable } from "@nestjs/common";
import { createSignRequest } from "./services/xaman.service.js";

@Injectable()
export class XrplHelperService {
  async maybeCreateXamanPayload(txjson: unknown, signWithXaman?: boolean, userToken?: string) {
    if (!signWithXaman) {
      return { txjson };
    }

    const xaman = await createSignRequest({ txjson, userToken });
    return { txjson, xaman };
  }
}
