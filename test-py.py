import sys
import os
sys.path.append(os.path.abspath('./sdk-python'))
from linkedin_jobs_api import LinkedInJobsClient

def test():
    try:
        client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")
        res = client.search_jobs(keywords="Data Scientist", location="Remote")
        print("Python SDK Results Count:", res['metadata']['count'])
    except Exception as e:
        print("Python SDK Error:", e)

if __name__ == "__main__":
    test()
