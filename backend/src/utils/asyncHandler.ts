import type { NextFunction, Request, Response } from 'express';
import type { ParsedQs } from 'qs';

export type AsyncRouteHandler<
  Params = Request['params'],
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = (req: Request<Params, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction) => Promise<unknown>;

export function asyncHandler<
  Params = Request['params'],
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>
>(handler: AsyncRouteHandler<Params, ResBody, ReqBody, ReqQuery, Locals>) {
  return (req: Request<Params, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
