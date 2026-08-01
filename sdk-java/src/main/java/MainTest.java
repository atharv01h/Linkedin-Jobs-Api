import com.linkedin.jobs.api.LinkedInJobsClient;
import com.fasterxml.jackson.databind.JsonNode;

public class MainTest {
    public static void main(String[] args) {
        try {
            LinkedInJobsClient client = LinkedInJobsClient.builder()
                    .baseUrl("http://localhost:3000/api/v1")
                    .build();
            JsonNode response = client.searchJobs("Backend Developer", "Remote", "past_month", 1);
            System.out.println("Java SDK Results Count: " + response.get("metadata").get("count").asInt());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
