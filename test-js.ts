import { LinkedInJobsClient } from './sdk-javascript/src/index.ts';

async function run() {
  console.log("=== Testing JavaScript SDK ===");
  const client = new LinkedInJobsClient({ baseURL: 'http://localhost:3000/api/v1' });

  try {
    const result = await client.analyzeJobs({
      keywords: 'Software Engineer',
      location: 'Remote',
      userSkills: ['TypeScript', 'React', 'Node.js', 'AWS'],
    });

    console.log(`Successfully fetched ${result.metadata.count} jobs (Cached: ${result.metadata.cached})`);
    if (result.jobs.length > 0) {
      const top = result.jobs[0];
      console.log(`Top Match: ${top.title} @ ${top.company}`);
      console.log(`  Seniority: ${top.insights.seniorityLevel}`);
      console.log(`  Remote: ${top.insights.isRemote}`);
      console.log(`  Required Skills: ${top.insights.requiredSkills.join(', ')}`);
      console.log(`  Match Score: ${top.insights.matchScore}/100`);
    }
  } catch (err: any) {
    console.error("Error running JS SDK:", err.message);
  }
}

run();
