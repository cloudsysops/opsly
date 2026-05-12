import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  path: string;
  query: string;
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

  match(method: string, path: string): Route | undefined {
    return this.routes.find((r) => r.method === method && r.path === path);
  }

  findMatch(method: string, pathOnly: string): Route | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const routeParts = route.path.split('/');
      const pathParts = pathOnly.split('/');

      if (routeParts.length !== pathParts.length) continue;

      let match = true;
      const params: Record<string, string> = {};

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }

      if (match) return route;
    }
    return undefined;
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