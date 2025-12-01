import { GraphQLClient } from 'graphql-request';

const API_URL = 'https://api.chanomhub.com/api/graphql';

export const client = new GraphQLClient(API_URL, {
    headers: {
        // Add any necessary headers here, e.g. authorization
    },
});
