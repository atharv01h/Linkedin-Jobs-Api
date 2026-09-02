import sys
import json
sys.path.append('./sdk-python')
from linkedin_jobs_api import LinkedInJobsClient

def run():
    print("=== Testing Python SDK ===")
    client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")
    
    try:
        # We search for a slightly different keyword to avoid just getting the exact same cache 
        # (or same is fine to prove cache works!)
        result = client.analyze_jobs(
            keywords="Software Engineer",
            location="Remote",
            user_skills=["TypeScript", "React", "Node.js", "AWS"]
        )
        
        meta = result.get('metadata', {})
        jobs = result.get('jobs', [])
        
        print(f"Successfully fetched {meta.get('count')} jobs (Cached: {meta.get('cached')})")
        if jobs:
            top = jobs[0]
            ins = top.get('insights', {})
            print(f"Top Match: {top.get('title')} @ {top.get('company')}")
            print(f"  Seniority: {ins.get('seniorityLevel')}")
            print(f"  Remote: {ins.get('isRemote')}")
            print(f"  Required Skills: {', '.join(ins.get('requiredSkills', []))}")
            print(f"  Match Score: {ins.get('matchScore')}/100")
            
    except Exception as e:
        print(f"Error running Python SDK: {e}")

if __name__ == "__main__":
    run()
