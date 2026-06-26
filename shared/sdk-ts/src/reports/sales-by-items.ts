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

export const SALES_BY_ITEMS_ROUTE = '/api/reports/sales-by-items' as const satisfies keyof paths;

type Op = OpForPath<typeof SALES_BY_ITEMS_ROUTE, 'get'>;
type Arg = OpArgType<Op>;

// Table format (existing functionality)
export type SalesByItemsTableQuery = OpQueryParams<Op>;
export type SalesByItemsTableResponse = OpResponseBodyTable<Op>;

export async function fetchSalesByItemsTable(
  fetcher: ApiFetcher,
  query: SalesByItemsTableQuery
): Promise<SalesByItemsTableResponse> {
  const get = fetcher.path(SALES_BY_ITEMS_ROUTE).method('get').create();
  const { payload, init } = withNestedQuery(query);
  const { data } = await get(payload as Arg, {
    ...init,
    headers: { ...init?.headers, accept: 'application/json+table' },
  });
  return data as unknown as SalesByItemsTableResponse;
}

// JSON format - Note: may only have table format in schema
// Using type assertion for JSON format compatibility
export type SalesByItemsJsonQuery = OpQueryParams<Op>;
export type SalesByItemsJsonResponse = OpResponseBody<Op>;

export async function fetchSalesByItemsJson(
  fetcher: ApiFetcher,
  query: SalesByItemsJsonQuery
): Promise<SalesByItemsJsonResponse> {
  const get = fetcher.path(SALES_BY_ITEMS_ROUTE).method('get').create();
  const { payload, init } = withNestedQuery(query);
  const { data } = await get(payload as Arg, init);
  return data as unknown as SalesByItemsJsonResponse;
}

// CSV format (returns Blob)
export type SalesByItemsCsvQuery = OpQueryParams<Op>;
export type SalesByItemsCsvResponse = Blob;

export async function fetchSalesByItemsCsv(
  fetcher: ApiFetcher,
  query: SalesByItemsCsvQuery
): Promise<SalesByItemsCsvResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    SALES_BY_ITEMS_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/csv' },
  ) as Promise<SalesByItemsCsvResponse>;
}

// XLSX format (returns Blob)
export type SalesByItemsXlsxQuery = OpQueryParams<Op>;
export type SalesByItemsXlsxResponse = Blob;

export async function fetchSalesByItemsXlsx(
  fetcher: ApiFetcher,
  query: SalesByItemsXlsxQuery
): Promise<SalesByItemsXlsxResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    SALES_BY_ITEMS_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/xlsx' },
  ) as Promise<SalesByItemsXlsxResponse>;
}

// PDF format (returns Blob)
export type SalesByItemsPdfQuery = OpQueryParams<Op>;
export type SalesByItemsPdfResponse = Blob;

export async function fetchSalesByItemsPdf(
  fetcher: ApiFetcher,
  query: SalesByItemsPdfQuery
): Promise<SalesByItemsPdfResponse> {
  const { payload, init } = withNestedQuery(query as Record<string, unknown>);
  return getBlob(
    fetcher,
    SALES_BY_ITEMS_ROUTE,
    payload as Record<string, string>,
    { ...(init?.headers as Record<string, string> | undefined), accept: 'application/pdf' },
  ) as Promise<SalesByItemsPdfResponse>;
}
