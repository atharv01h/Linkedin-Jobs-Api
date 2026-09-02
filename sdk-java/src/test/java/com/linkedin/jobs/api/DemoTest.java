package com.linkedin.jobs.api;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

import org.junit.Test;

public class DemoTest {
    @Test
    public void testApi() {
        System.out.println("=== Testing Java SDK ===");
        try {
            LinkedInJobsClient client = LinkedInJobsClient.builder()
                    .baseUrl("http://localhost:3000/api/v1")
                    .build();

            JsonNode result = client.analyzeJobs(
                    "Software Engineer",
                    "Remote",
                    null,
                    1,
                    List.of("TypeScript", "React", "Node.js", "AWS")
            );

            JsonNode meta = result.get("metadata");
            System.out.println("Successfully fetched " + meta.get("count").asInt() + 
                             " jobs (Cached: " + meta.get("cached").asBoolean() + ")");
            
            JsonNode jobs = result.get("jobs");
            if (jobs.isArray() && !jobs.isEmpty()) {
                JsonNode top = jobs.get(0);
                JsonNode ins = top.get("insights");
                System.out.println("Top Match: " + top.get("title").asText() + " @ " + top.get("company").asText());
                System.out.println("  Seniority: " + ins.get("seniorityLevel").asText());
                System.out.println("  Remote: " + ins.get("isRemote").asBoolean());
                
                System.out.print("  Required Skills: ");
                if (ins.has("requiredSkills")) {
                    for (JsonNode skill : ins.get("requiredSkills")) {
                        System.out.print(skill.asText() + ", ");
                    }
                }
                System.out.println("\n  Match Score: " + ins.get("matchScore").asInt() + "/100");
            }
        } catch (Exception e) {
            System.err.println("Error running Java SDK: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
