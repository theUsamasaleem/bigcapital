import type { ApiFetcher } from './fetch-utils';
import { postFormData } from './fetch-utils';
import { paths } from './schema';

export const ATTACHMENTS_ROUTES = {
  LIST: '/api/attachments',
  BY_ID: '/api/attachments/{id}',
  PRESIGNED_URL: '/api/attachments/{id}/presigned-url',
} as const satisfies Record<string, keyof paths>;

/** Response shape from POST /api/attachments (upload). Schema may not define it; server returns { data }. */
export interface UploadAttachmentResponse {
  id: number;
  key: string;
  mimeType: string;
  originName: string;
  size: number;
  createdAt: string;
}

/**
 * Upload an attachment via multipart/form-data. Uses the fetcher's baseUrl and init (headers).
 * The OpenAPI client may not support FormData, so we use fetch with the same config.
 */
export async function uploadAttachment(
  fetcher: ApiFetcher,
  formData: FormData
): Promise<UploadAttachmentResponse> {
  // The generated openapi client JSON.stringifies the body and forces a
  // Content-Type of application/json, which strips the multipart payload and
  // makes the server receive no file. Use a raw multipart POST so the browser
  // sets the multipart/form-data boundary itself.
  const res = await postFormData<{ data?: UploadAttachmentResponse }>(
    fetcher,
    ATTACHMENTS_ROUTES.LIST,
    formData
  );
  const data = res?.data;
  if (!data) {
    throw new Error('Upload attachment: no data in response');
  }
  return data;
}

export async function deleteAttachment(fetcher: ApiFetcher, id: string): Promise<void> {
  const del = fetcher.path(ATTACHMENTS_ROUTES.BY_ID).method('delete').create();
  await del({ id });
}

export async function fetchAttachmentPresignedUrl(
  fetcher: ApiFetcher,
  id: string
): Promise<unknown> {
  const get = fetcher.path(ATTACHMENTS_ROUTES.PRESIGNED_URL).method('get').create();
  const { data } = await get({ id });
  return data;
}
