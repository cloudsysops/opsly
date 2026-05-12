import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
}

export type RouteHandler = (ctx: RouteContext) => Promise<void> | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  register(method: string, path: string, handler: RouteHandler): void {
    this.routes.push({ method, path, handler });
  }

  get(path: string, handler: RouteHandler): void {
    this.register('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.register('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.register('PUT', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.register('DELETE', path, handler);
  }

  findMatch(method: string, pathOnly: string): { route: Route; params: Record<string, string> } | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const routeParts = route.path.split('/');
      const pathParts = pathOnly.split('/');

      if (routeParts.length !== pathParts.length) continue;

      let match = true;
      const params: Record<string, string> = {};

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }

      if (match) return { route, params };
    }
    return undefined;
  }

  dispatch(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url ?? '/';
    const questionMark = url.indexOf('?');
    const pathOnly = questionMark === -1 ? url : url.slice(0, questionMark);
    const queryString = questionMark === -1 ? '' : url.slice(questionMark + 1);

    const method = req.method ?? 'GET';
    const result = this.findMatch(method, pathOnly);
    if (!result) return false;

    const query: Record<string, string> = {};
    if (queryString.length > 0) {
      for (const pair of queryString.split('&')) {
        const eq = pair.indexOf('=');
        if (eq === -1) {
          query[decodeURIComponent(pair)] = '';
        } else {
          query[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
        }
      }
    }

    const ctx: RouteContext = {
      req,
      res,
      path: pathOnly,
      query,
      params: result.params,
    };

    const result_ = result.route.handler(ctx);
    if (result_ instanceof Promise) {
      result_.catch((err: unknown) => {
        try {
          jsonResponse(res, { error: String(err) }, 500);
        } catch { /* response already sent */ }
      });
    }

    return true;
  }

  getRoutes(): Route[] {
    return [...this.routes];
  }
}

export function jsonResponse(
  res: ServerResponse,
  data: unknown,
  status = 200
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function errorResponse(
  res: ServerResponse,
  error: string,
  status = 500
): void {
  jsonResponse(res, { error }, status);
}

export async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
