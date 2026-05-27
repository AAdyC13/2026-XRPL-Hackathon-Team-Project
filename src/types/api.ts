export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PreparedPayload = {
  txjson: unknown;
  xaman?: {
    uuid: string;
    qrPng?: string;
    next?: string;
  };
};
