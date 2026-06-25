import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  deleteAttachment,
  fetchAttachmentPresignedUrl,
  uploadAttachment,
} from '@bigcapital/sdk-ts';
import useApiRequest, { useApiFetcher } from '../../useRequest';
import { AttachmentsQueryKeys } from './query-keys';

type UploadAttachmentResponse = Awaited<ReturnType<typeof uploadAttachment>>;

function toFormData(values: FormData | Record<string, unknown>): FormData {
  if (values instanceof FormData) {
    return values;
  }
  const formData = new FormData();
  const record = values as Record<string, unknown>;
  if (record.file instanceof File) {
    formData.append('file', record.file);
  }
  return formData;
}

export function useUploadAttachments(
  props?: UseMutationOptions<
    UploadAttachmentResponse,
    Error,
    FormData | Record<string, unknown>
  >,
) {
  const fetcher = useApiFetcher();
  return useMutation({
    ...props,
    mutationFn: (values) => uploadAttachment(fetcher, toFormData(values)),
  });
}

export function useDeleteAttachment(
  props?: UseMutationOptions<void, Error, string>,
) {
  const fetcher = useApiFetcher();
  return useMutation({
    ...props,
    mutationFn: (key: string) => deleteAttachment(fetcher, key),
  });
}

export function useGetPresignedUrlAttachment(
  props?: UseMutationOptions<unknown, Error, string>,
) {
  const fetcher = useApiFetcher();
  return useMutation({
    ...props,
    mutationFn: (key: string) => fetchAttachmentPresignedUrl(fetcher, key),
  });
}

/**
 * The attachment document key contains a `/` (e.g. `orgId/uuid`) so it must be
 * URL-encoded to be matched by the `:id` route segment.
 */
const encodeKey = (key: string) => encodeURIComponent(key);

/**
 * Retrieves the version history of the given attachment (versioning feature).
 */
export function useAttachmentVersions(
  key: string,
  props?: UseQueryOptions,
) {
  const apiRequest = useApiRequest();
  return useQuery({
    queryKey: [AttachmentsQueryKeys.ATTACHMENTS, 'VERSIONS', key],
    queryFn: () =>
      apiRequest
        .get(`attachments/${encodeKey(key)}/versions`, {})
        .then((res) => res.data.data),
    enabled: !!key,
    ...props,
  });
}

/**
 * Uploads a new version of an existing attachment (versioning feature).
 */
export function useUploadAttachmentVersion(
  props?: UseMutationOptions<unknown, Error, { key: string; file: File }>,
) {
  const apiRequest = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: ({ key, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest.post(
        `attachments/${encodeKey(key)}/versions`,
        formData,
        {},
      );
    },
  });
}

/**
 * Restores a previous version of an attachment (versioning feature).
 */
export function useRestoreAttachmentVersion(
  props?: UseMutationOptions<
    unknown,
    Error,
    { key: string; versionId: number }
  >,
) {
  const apiRequest = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: ({ key, versionId }) =>
      apiRequest.post(
        `attachments/${encodeKey(key)}/versions/${versionId}/restore`,
        {},
        {},
      ),
  });
}
