const { GraphQLClient } = require('graphql-request');

const client = new GraphQLClient('https://api.chanomhub.com/api/graphql');

const introspectionQuery = `
  query IntrospectionQuery {
    __schema {
      queryType {
        name
        fields {
          name
          description
          args {
            name
            type {
              name
              kind
            }
          }
          type {
            name
            kind
          }
        }
      }
      types {
        name
        kind
        description
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
`;

async function inspectSchema() {
    try {
        const data = await client.request(introspectionQuery);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectSchema();
