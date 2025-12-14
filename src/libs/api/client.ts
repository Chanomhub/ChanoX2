import { GraphQLClient, ClientError } from 'graphql-request';
import { print } from 'graphql';
import { transformImageUrls } from '@/libs/image';

const API_URL = 'https://api.chanomhub.com/api/graphql';

const hashQuery = async (query: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(query);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export class APQGraphQLClient extends GraphQLClient {
    private myHeaders: Record<string, string> = {};
    private apiUrl: string;

    constructor(url: string, options?: any) {
        super(url, options);
        this.apiUrl = url;
        if (options?.headers) {
            this.myHeaders = { ...options.headers };
        }
    }

    setHeader(key: string, value: string) {
        this.myHeaders[key] = value;
        return super.setHeader(key, value);
    }

    setHeaders(headers: any) {
        this.myHeaders = { ...this.myHeaders, ...headers };
        return super.setHeaders(headers);
    }

    async request<T = any, V = any>(
        document: any,
        variables?: V,
        requestHeaders?: any
    ): Promise<T> {
        let query = document;
        if (typeof document !== 'string') {
            query = print(document);
        }

        const cleanQuery = query.trim();
        // const isMutation = cleanQuery.startsWith('mutation');

        const hash = await hashQuery(cleanQuery);
        const extensions = {
            persistedQuery: {
                version: 1,
                sha256Hash: hash,
            },
        };

        const combinedHeaders = {
            'Content-Type': 'application/json',
            ...this.myHeaders,
            ...requestHeaders,
        };

        const tryRequest = async (
            includeQuery: boolean
        ): Promise<T> => {
            // APQ Protocol:
            // 1. For registration (includeQuery=true): Always use POST to avoid URL length limits
            // 2. For cached queries (includeQuery=false): Use GET for HTTP caching (queries only)
            // 3. Mutations: Always use POST

            const isMutation = cleanQuery.startsWith('mutation');
            const useGet = !includeQuery && !isMutation;

            let url = this.apiUrl;
            let options: RequestInit;

            if (useGet) {
                // GET request: use query parameters for CDN caching
                const params = new URLSearchParams();
                params.set('extensions', JSON.stringify(extensions));
                if (variables) {
                    params.set('variables', JSON.stringify(variables));
                }
                url = `${this.apiUrl}?${params.toString()}`;
                options = {
                    method: 'GET',
                    headers: {
                        ...combinedHeaders,
                        'Content-Type': undefined as any, // Remove content-type for GET
                    },
                };
                // Clean up undefined headers
                delete (options.headers as any)['Content-Type'];
            } else {
                // POST request: use body
                const body: any = {
                    extensions,
                };
                if (includeQuery) {
                    body.query = cleanQuery;
                }
                if (variables) {
                    body.variables = variables;
                }
                options = {
                    method: 'POST',
                    headers: combinedHeaders,
                    body: JSON.stringify(body),
                };
            }

            const res = await fetch(url, options);

            // Parse JSON first to check for APQ errors (server may return 404 with APQ error in body)
            let json: any;
            try {
                json = await res.json();
            } catch {
                // If we can't parse JSON and response is not ok, throw HTTP error
                if (!res.ok) {
                    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
                }
                throw new Error('Invalid JSON response');
            }

            if (json.errors) {
                // Check for APQ-specific error FIRST (before checking res.ok)
                // Server returns 404 for PersistedQueryNotFound
                const isAPQError = json.errors.some(
                    (e: any) =>
                        e.message === 'PersistedQueryNotFound' ||
                        e.extensions?.code === 'PERSISTED_QUERY_NOT_FOUND'
                );

                if (isAPQError) {
                    throw new Error('PersistedQueryNotFound');
                }

                // Throw standard GraphQL errors
                throw new ClientError(json, { query: cleanQuery, variables } as any);
            }

            // Check HTTP status for other errors (after handling APQ)
            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
            }

            // Transform image URLs in the response
            return transformImageUrls(json.data);
        };

        try {
            // Step 1: Try APQ (send hash only, no query)
            return await tryRequest(false);
        } catch (err: any) {
            if (err.message === 'PersistedQueryNotFound') {
                // Step 2: Server doesn't have this query cached
                // Send full query to register it
                return await tryRequest(true);
            }
            // Re-throw other errors
            throw err;
        }
    }
}

export const client = new APQGraphQLClient(API_URL, {
    headers: {},
});
