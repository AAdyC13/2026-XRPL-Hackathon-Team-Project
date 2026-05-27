import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  InternalServerErrorException
} from "@nestjs/common";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<{ url: string }>();
    const response = context.getResponse<{
      status: (statusCode: number) => {
        json: (payload: unknown) => void;
      };
    }>();
    const isV1 = request.url.startsWith("/api/v1/");

    const nestException =
      exception instanceof HttpException
        ? exception
        : new InternalServerErrorException({
            code: "INTERNAL_ERROR",
            message: exception instanceof Error ? exception.message : "Unexpected error."
          });

    const status = nestException.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = nestException.getResponse();

    const normalized =
      typeof exceptionResponse === "string"
        ? { code: "INTERNAL_ERROR", message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown>);

    const code =
      typeof normalized.code === "string"
        ? normalized.code
        : status === 401
          ? "UNAUTHORIZED"
          : status === 404
            ? "NOT_FOUND"
            : status === 429
              ? "RATE_LIMIT_EXCEEDED"
              : "INTERNAL_ERROR";
    const message =
      typeof normalized.message === "string" ? normalized.message : "Unexpected server error.";
    const details = normalized.details;

    if (isV1) {
      response.status(status).json({
        code,
        message,
        ...(details ? { details } : {})
      });
      return;
    }

    response.status(status).json({
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    });
  }
}
