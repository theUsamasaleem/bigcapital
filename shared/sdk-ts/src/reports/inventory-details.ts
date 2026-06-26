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

export const INVENTORY_DETAILS_ROUTE = '/api/reports/inventory-item-details' as const satisfies keyof paths;

type Op = OpForPath<typeof INVENTORY_DETAILS_ROUTE, 'get'>;
type Arg = OpArgType<Op>;

// Table format (existing functionality)
export type InventoryItemDetailsTableQuery = OpQueryParams<Op>;
export type InventoryItemDetailsTableResponse = OpResponseBodyTable<Op>;

export async function fetchInventoryItemDetailsTable(
  fetcher: ApiFetcher,
  query: InventoryItemDetailsTableQuery
): Promise<InventoryItemDetailsTableResponse> {
  const get = fetcher.path(INVENTORY_DETAILS_ROUTE).method('get').create();
  const { payload, init } = withNestedQuery(query);
  const { data } = await get(payload as Arg, {
    ...init,
    headers: { ...init?.headers, accept: 'application/json+table' },
  });
  return data as unknown as InventoryItemDetailsTableResponse;
}

// JSON format - Note: may only have table format in schema
// Using type assertion for JSON format compatibility
export type InventoryItemDetailsJsonQuery = OpQueryParams<Op>;
export type InventoryItemDetailsJsonResponse = OpResponseBody<Op>;

export async function fetchInventoryItemDetailsJson(
  fetcher: ApiFetcher,
  query: InventoryItemDetailsJsonQuery
): Promise<InventoryItemDetailsJsonResponse> {
  const get = fetcher.path(INVENTORY_DETAILS_ROUTE).method('get').create();
  const { payload, init } = withNestedQuery(query);
  const { data } = await get(payload as Arg, init);
  return data as unknown as InventoryItemDetailsJsonResponse;
}

// CSV format (returns Blob)
export type InventoryItemDetailsCsvQuery = OpQueryParams<Op>;
export type InventoryItemDetailsCsvResponse = Blob;

export async function fetchInventoryItemDetailsCsv(
  fetcher: ApiFetcher,
  query: InventoryItemDetailsCsvQuery
): Promise<InventoryItemDetailsCsvResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    INVENTORY_DETAILS_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/csv' },
  ) as Promise<InventoryItemDetailsCsvResponse>;
}

// XLSX format (returns Blob)
export type InventoryItemDetailsXlsxQuery = OpQueryParams<Op>;
export type InventoryItemDetailsXlsxResponse = Blob;

export async function fetchInventoryItemDetailsXlsx(
  fetcher: ApiFetcher,
  query: InventoryItemDetailsXlsxQuery
): Promise<InventoryItemDetailsXlsxResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    INVENTORY_DETAILS_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/xlsx' },
  ) as Promise<InventoryItemDetailsXlsxResponse>;
}

// PDF format (returns Blob)
export type InventoryItemDetailsPdfQuery = OpQueryParams<Op>;
export type InventoryItemDetailsPdfResponse = Blob;

export async function fetchInventoryItemDetailsPdf(
  fetcher: ApiFetcher,
  query: InventoryItemDetailsPdfQuery
): Promise<InventoryItemDetailsPdfResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    INVENTORY_DETAILS_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/pdf' },
  ) as Promise<InventoryItemDetailsPdfResponse>;
}
