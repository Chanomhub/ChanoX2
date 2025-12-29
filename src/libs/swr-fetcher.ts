import { client } from '@/libs/api/client';

export const fetcher = <T>(query: string, variables?: any): Promise<T> =>
    client.request<T>(query, variables);
