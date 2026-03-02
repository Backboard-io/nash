import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TFolder,
  FoldersResponse,
  CreateFolderRequest,
} from 'librechat-data-provider';

export const useFoldersQuery = (
  config?: UseQueryOptions<FoldersResponse>,
): QueryObserverResult<FoldersResponse> => {
  return useQuery<FoldersResponse>(
    [QueryKeys.folders],
    () => dataService.listFolders(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useCreateFolderMutation = (
  options?: UseMutationOptions<TFolder, Error, CreateFolderRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: CreateFolderRequest) => dataService.createFolder(payload),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.folders]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useDeleteFolderMutation = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (folderId: string) => dataService.deleteFolder(folderId),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.folders]);
        queryClient.invalidateQueries([QueryKeys.allConversations]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export type MoveConvoToFolderParams = {
  conversationId: string;
  folderId: string | null;
};

export const useMoveConvoToFolderMutation = (
  options?: UseMutationOptions<void, Error, MoveConvoToFolderParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ conversationId, folderId }: MoveConvoToFolderParams) =>
      dataService.moveConvoToFolder(conversationId, { folderId }),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.allConversations]);
        queryClient.invalidateQueries([QueryKeys.folders]);
        options?.onSuccess?.(...params);
      },
    },
  );
};
