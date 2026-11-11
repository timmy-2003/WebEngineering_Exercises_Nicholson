import {
  LogController,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

const HTTP_CLIENT_ERROR = 400;
const HTTP_SERVER_ERROR = 500;
const HEALTH_PATH = '/health';

export class RequestLogController extends LogController {
  override incomingRequest(request: FastifyRequest): void {
    if (this.isLogDisabled(request)) {
      return;
    }
    request.log.debug(`--> ${request.method} ${request.url}`);
  }

  override requestCompleted(
    error: Error | null | undefined,
    request: FastifyRequest,
    reply: FastifyReply
  ): void {
    if (this.isLogDisabled(request)) {
      return;
    }
    const responseTime = Math.round(reply.elapsedTime);
    const fields = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
    };
    const message = `${request.method} ${request.url} ${reply.statusCode} ${responseTime}ms`;
    if (error !== null && error !== undefined) {
      request.log.error({ ...fields, err: error }, message);
    } else if (reply.statusCode >= HTTP_SERVER_ERROR) {
      request.log.error(fields, message);
    } else if (reply.statusCode >= HTTP_CLIENT_ERROR) {
      request.log.warn(fields, message);
    } else if (request.url === HEALTH_PATH) {
      request.log.debug(fields, message);
    } else {
      request.log.info(fields, message);
    }
  }
}

export function describeError(err: Error): string {
  const cause = err.cause instanceof Error ? ` (${err.cause.message})` : '';
  return `${err.name}: ${err.message}${cause}`;
}

export function loggerOptions(
  format: 'pretty' | 'json'
): FastifyServerOptions['logger'] {
  if (format === 'json') {
    return true;
  }
  return {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,method,url,statusCode,responseTime,errType',
        singleLine: true,
      },
    },
  };
}
