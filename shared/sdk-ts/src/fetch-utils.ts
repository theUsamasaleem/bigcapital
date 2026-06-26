import { Fetcher } from 'openapi-typescript-fetch';
import type { paths } from './schema';
import { createCamelCaseMiddleware } from './middleware/camel-case-middleware';
import {
  createSnakeCaseRequestMiddleware,
  NESTED_QUERY_HEADER,
} from './middleware/snake-case-request-middleware';

/**
 * Splits a query object into a primitive-only payload and a per-call `init`
 * carrying any nested object values via the SDK's sentinel header. The
 * snake-case request middleware reads that header and re-serializes the
 * nested values as bracket-style query params (`number_format[no_cents]=true`)
 * so Express's `extended` qs parser can reconstruct them server-side.
 *
 * openapi-typescript-fetch's built-in query serializer calls `String(value)`,
 * which would otherwise turn nested objects into the literal `[object Object]`.
 */
export function withNestedQuery<T>(
  query: T,
): { payload: T; init?: RequestInit } {
  const sanitized: Record<string, unknown> = {};
  const nested: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(value instanceof Blob)
    ) {
      nested[key] = value;
    } else {
      sanitized[key] = value;
    }
  }

  if (Object.keys(nested).length === 0) {
    return { payload: sanitized as T };
  }
  return {
    payload: sanitized as T,
    init: {
      headers: {
        [NESTED_QUERY_HEADER]: encodeURIComponent(JSON.stringify(nested)),
      },
    },
  };
}

export type ApiFetcher = ReturnType<typeof Fetcher.for<paths>>;

export interface CreateApiFetcherConfig {
  baseUrl?: string;
  init?: RequestInit;
  /** Set to true to disable automatic snake_case to camelCase transformation on responses */
  disableCamelCaseTransform?: boolean;
  /** Set to true to disable automatic camelCase to snake_case transformation on requests */
  disableSnakeCaseTransform?: boolean;
}

/**
 * Creates and configures an ApiFetcher for use with sdk-ts fetch functions.
 * Call this with baseUrl (e.g. '/api') and init.headers (Authorization, organization-id, etc.) from the app.
 *
 * By default, all JSON response keys are automatically transformed from snake_case to camelCase.
 * Set disableCamelCaseTransform: true to disable this behavior.
 */
export function createApiFetcher(config?: CreateApiFetcherConfig): ApiFetcher {
  const parsedConfig = {
    baseUrl: '',
    disableCamelCaseTransform: true,
    disableSnakeCaseTransform: false,
    ...config,
  };
  const fetcher = Fetcher.for<paths>();
  fetcher.configure({
    baseUrl: parsedConfig.baseUrl,
    init: parsedConfig?.init,
    use: [
      ...(parsedConfig.disableSnakeCaseTransform ? [] : [createSnakeCaseRequestMiddleware()]),
      ...(parsedConfig.disableCamelCaseTransform ? [] : [createCamelCaseMiddleware()]),
    ],
  });
  // openapi-typescript-fetch keeps its configured baseUrl/init in a closure and
  // does NOT expose them on the returned object. getBlob/postFormData/rawRequest
  // build raw fetch() calls and need the resolved baseUrl + init (which carry the
  // Authorization and organization-id headers), so attach the config explicitly
  // for getFetcherConfig() to read. Without this those helpers send no auth
  // header and the server responds 401.
  (fetcher as unknown as FetcherWithConfig).config = {
    baseUrl: parsedConfig.baseUrl ?? '',
    init: parsedConfig?.init,
  };
  return fetcher;
}

/**
 * Strips leading slash from a path segment to avoid double slashes when joining with a base (e.g. `/api/` + path).
 */
export function normalizeApiPath(path: string): string {
  return (path || '').replace(/^\//, '');
}

/**
 * Fetcher configuration as exposed by `openapi-typescript-fetch` at runtime.
 * The library does not surface this in its public types, so we declare the
 * shape we depend on in one place rather than re-asserting it at each call site.
 */
interface FetcherRuntimeConfig {
  baseUrl: string;
  init?: RequestInit;
}

interface FetcherWithConfig {
  config?: FetcherRuntimeConfig;
}

function getFetcherConfig(fetcher: ApiFetcher): FetcherRuntimeConfig {
  const config = (fetcher as FetcherWithConfig).config;
  return {
    baseUrl: config?.baseUrl ?? '',
    init: config?.init,
  };
}

/**
 * Makes a raw API request using the fetcher's configuration (baseUrl, headers, middleware).
 * Use this for endpoints not defined in the OpenAPI schema.
 */
export async function rawRequest<T = unknown>(
  fetcher: ApiFetcher,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<T> {
  const { baseUrl, init } = getFetcherConfig(fetcher);

  const url = `${baseUrl}${path}`;
  const mergedHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
    ...(headers ?? {}),
  };

  const requestInit: RequestInit = {
    ...init,
    method,
    headers: mergedHeaders,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    mergedHeaders['Content-Type'] = 'application/json';
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestInit);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Sends a multipart/form-data request using the fetcher's configured baseUrl
 * and headers. Use for endpoints that accept file uploads where the generated
 * client's typed JSON body is the wrong shape (FormData carries File/Blob parts).
 * `formData` is passed untouched to `fetch`, which sets the multipart boundary.
 */
export async function postFormData<T>(
  fetcher: ApiFetcher,
  path: string,
  formData: FormData,
  headers?: Record<string, string>
): Promise<T> {
  const { baseUrl, init } = getFetcherConfig(fetcher);
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...init,
    method: 'POST',
    headers: {
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
      ...(headers ?? {}),
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return (await response.json()) as T;
}

/**
 * Downloads a binary resource as a Blob using the fetcher's configured baseUrl
 * and headers. Use for endpoints that return files (csv/xlsx/pdf) where the
 * generated client's JSON parser would corrupt the payload.
 */
export async function getBlob(
  fetcher: ApiFetcher,
  path: string,
  params?: Record<string, string>,
  headers?: Record<string, string>
): Promise<Blob> {
  const { baseUrl, init } = getFetcherConfig(fetcher);
  let query = '';
  if (params) {
    const search = new URLSearchParams();
    // Mirror openapi-typescript-fetch's query serializer: skip null/undefined,
    // and expand arrays into repeated params (an empty array contributes
    // nothing). Doing `String(value)` on an array would emit `key=` (e.g.
    // `branches_ids=`), which the server rejects with a 400.
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) search.append(key, String(item));
        }
      } else {
        search.append(key, String(value));
      }
    }
    const serialized = search.toString();
    query = serialized ? `?${serialized}` : '';
  }
  const url = `${baseUrl}${path}${query}`;

  const response = await fetch(url, {
    ...init,
    method: 'GET',
    headers: {
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
      ...(headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.blob();
}
