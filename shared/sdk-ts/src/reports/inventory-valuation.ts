import type { OpArgType } from 'openapi-typescript-fetch';
import type { ApiFetcher } from '../fetch-utils';
import { withNestedQuery, getBlob } from "../fetch-utils";
import type { paths } from '../schema';
import {
  OpForPath,
  OpQueryParams,
  OpResponseBody,
  OpResponseBodyTable,
} from '../utils';

export const INVENTORY_VALUATION_ROUTE = '/api/reports/inventory-valuation' as const satisfies keyof paths;

type Op = OpForPath<typeof INVENTORY_VALUATION_ROUTE, 'get'>;
type Arg = OpArgType<Op>;

// Table format (existing functionality)
export type InventoryValuationTableQuery = OpQueryParams<Op>;
export type InventoryValuationTableResponse = OpResponseBodyTable<Op>;

export async function fetchInventoryValuationTable(
  fetcher: ApiFetcher,
  query: InventoryValuationTableQuery
): Promise<InventoryValuationTableResponse> {
  const get = fetcher.path(INVENTORY_VALUATION_ROUTE).method('get').create();
  const { payload, init } = withNestedQuery(query);
  const { data } = await get(payload as Arg, {
    ...init,
    headers: { ...init?.headers, accept: 'application/json+table' },
  });
  return data as unknown as InventoryValuationTableResponse;
}

// JSON format - Note: may only have table format in schema
// Using type assertion for JSON format compatibility
export type InventoryValuationJsonQuery = OpQueryParams<Op>;
export type InventoryValuationJsonResponse = OpResponseBody<Op>;

export async function fetchInventoryValuationJson(
  fetcher: ApiFetcher,
  query: InventoryValuationJsonQuery
): Promise<InventoryValuationJsonResponse> {
  const get = fetcher.path(INVENTORY_VALUATION_ROUTE).method('get').create();
  const { payload, init } = withNestedQuery(query);
  const { data } = await get(payload as Arg, init);
  return data as unknown as InventoryValuationJsonResponse;
}

// CSV format (returns Blob)
export type InventoryValuationCsvQuery = OpQueryParams<Op>;
export type InventoryValuationCsvResponse = Blob;

export async function fetchInventoryValuationCsv(
  fetcher: ApiFetcher,
  query: InventoryValuationCsvQuery
): Promise<InventoryValuationCsvResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    INVENTORY_VALUATION_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/csv' },
  ) as Promise<InventoryValuationCsvResponse>;
}

// XLSX format (returns Blob)
export type InventoryValuationXlsxQuery = OpQueryParams<Op>;
export type InventoryValuationXlsxResponse = Blob;

export async function fetchInventoryValuationXlsx(
  fetcher: ApiFetcher,
  query: InventoryValuationXlsxQuery
): Promise<InventoryValuationXlsxResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    INVENTORY_VALUATION_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/xlsx' },
  ) as Promise<InventoryValuationXlsxResponse>;
}

// PDF format (returns Blob)
export type InventoryValuationPdfQuery = OpQueryParams<Op>;
export type InventoryValuationPdfResponse = Blob;

export async function fetchInventoryValuationPdf(
  fetcher: ApiFetcher,
  query: InventoryValuationPdfQuery
): Promise<InventoryValuationPdfResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    INVENTORY_VALUATION_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/pdf' },
  ) as Promise<InventoryValuationPdfResponse>;
}
