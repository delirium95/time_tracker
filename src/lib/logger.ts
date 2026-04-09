import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});

export function withRequestLog(
  handler: string,
  fn: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();
  return fn().then((res) => {
    logger.info({ handler, status: res.status, ms: Date.now() - start }, "api");
    return res;
  });
}
