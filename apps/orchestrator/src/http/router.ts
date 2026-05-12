import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string>;
}

export type RouteHandler = (ctx: RouteContext) => Promise<void> | void;

interface Route {
  method: string;
  pattern: string;
  paramNames: string[];
  regex: RegExp;
  handler: RouteHandler;
}

function buildRegex(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

export function jsonResponse(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function errorResponse(res: ServerResponse, status: number, error: string): void {
  jsonResponse(res, status, { error });
}

export class Router {
  private routes: Route[] = [];

  register(method: string, pattern: string, handler: RouteHandler): void {
    const { regex, paramNames } = buildRegex(pattern);
    this.routes.push({ method: method.toUpperCase(), pattern, paramNames, regex, handler });
  }

  get(pattern: string, handler: RouteHandler): void {
    this.register('GET', pattern, handler);
  }

  post(pattern: string, handler: RouteHandler): void {
    this.register('POST', pattern, handler);
  }

  findMatch(method: string, path: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = path.match(route.regex);
      if (!match) continue;
      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        params[route.paramNames[i]] = decodeURIComponent(match[i + 1] ?? '');
      }
      return { route, params };
    }
    return null;
  }

  async dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const pathOnly = url.split('?')[0] ?? '/';
    const queryString = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const query: Record<string, string> = {};
    if (queryString.length > 0) {
      for (const pair of queryString.split('&')) {
        const eq = pair.indexOf('=');
        if (eq >= 0) {
          query[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
        } else {
          query[decodeURIComponent(pair)] = '';
        }
      }
    }
    const method = req.method ?? 'GET';
    const match = this.findMatch(method, pathOnly);
    if (!match) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ctx: RouteContext = { req, res, params: match.params, query };
    await match.route.handler(ctx);
  }
}
