const { GraphQLClient } = require('graphql-request');

const client = new GraphQLClient('https://api.chanomhub.com/api/graphql');

const GET_ARTICLE = `
  query GetArticle($slug: String) {
    article(slug: $slug) {
      id
      title
      slug
    }
  }
`;

async function testSlug() {
    const testSlug = 'melancholianna-メランコリアンナ-melancholianna--HJ164';

    console.log('Testing slug:', testSlug);

    try {
        const data = await client.request(GET_ARTICLE, {
            slug: testSlug,
        });
        console.log('Success! Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testSlug();
