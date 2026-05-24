import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const undiciHandlerDir = path.join(root, 'node_modules', 'undici', 'lib', 'handler')
const wrapPath = path.join(undiciHandlerDir, 'wrap-handler.js')
const unwrapPath = path.join(undiciHandlerDir, 'unwrap-handler.js')

const wrapShim = `"use strict";

function wrap(handler) {
  if (!handler || typeof handler !== "object") {
    return handler;
  }

  if (
    typeof handler.onRequestStart === "function" ||
    typeof handler.onResponseStart === "function" ||
    typeof handler.onResponseData === "function" ||
    typeof handler.onResponseEnd === "function" ||
    typeof handler.onResponseError === "function"
  ) {
    return handler;
  }

  return {
    onRequestStart(controller) {
      return handler.onConnect?.(controller);
    },
    onRequestUpgrade(controller, statusCode, headers, socket) {
      return handler.onUpgrade?.(statusCode, headers, socket);
    },
    onResponseStart(controller, statusCode, headers, statusText) {
      return handler.onHeaders?.(statusCode, headers, () => {}, statusText);
    },
    onResponseData(controller, chunk) {
      return handler.onData?.(chunk);
    },
    onResponseEnd(controller, trailers) {
      return handler.onComplete?.(trailers);
    },
    onResponseError(controller, error) {
      return handler.onError?.(error);
    },
  };
}

module.exports = { wrap };
`

const unwrapShim = `"use strict";

function unwrap(handler) {
  if (!handler || typeof handler !== "object") {
    return handler;
  }

  if (
    typeof handler.onConnect === "function" ||
    typeof handler.onHeaders === "function" ||
    typeof handler.onData === "function" ||
    typeof handler.onComplete === "function" ||
    typeof handler.onError === "function"
  ) {
    return handler;
  }

  const controller = {
    aborted: false,
    reason: undefined,
  };

  return {
    onConnect(abort) {
      controller.abort = abort;
      return handler.onRequestStart?.(controller);
    },
    onHeaders(statusCode, headers, resume, statusText) {
      controller.resume = resume;
      return handler.onResponseStart?.(controller, statusCode, headers, statusText);
    },
    onData(chunk) {
      return handler.onResponseData?.(controller, chunk);
    },
    onComplete(trailers) {
      return handler.onResponseEnd?.(controller, trailers);
    },
    onError(error) {
      return handler.onResponseError?.(controller, error);
    },
    onUpgrade(statusCode, headers, socket) {
      return handler.onRequestUpgrade?.(controller, statusCode, headers, socket);
    },
  };
}

module.exports = { unwrap };
`

async function ensureFile(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, contents)
}

await ensureFile(wrapPath, wrapShim)
await ensureFile(unwrapPath, unwrapShim)
