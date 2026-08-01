const { LinkedInJobsClient } = require('./sdk-javascript/dist/index.js');

const client = new LinkedInJobsClient({ baseURL: 'http://localhost:3000/api/v1' });

async function test() {
  try {
    const res = await client.searchJobs({ keywords: 'Software Engineer', location: 'Remote' });
    console.log('JS SDK Results Count:', res.metadata.count);
  } catch (error) {
    console.error('JS SDK Error:', error);
  }
}

test();
