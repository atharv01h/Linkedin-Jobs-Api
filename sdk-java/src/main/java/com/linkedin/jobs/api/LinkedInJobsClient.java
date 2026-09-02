package com.linkedin.jobs.api;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Official Java SDK client for the LinkedIn Jobs API.
 *
 * <h2>Usage</h2>
 * <pre>{@code
 * LinkedInJobsClient client = LinkedInJobsClient.builder()
 *     .baseUrl("http://localhost:3000/api/v1")
 *     .build();
 *
 * // Basic search
 * JsonNode result = client.searchJobs("Software Engineer", "Remote", null, 1);
 *
 * // Enriched analysis (v2.1.0+)
 * JsonNode analysis = client.analyzeJobs(
 *     "Senior TypeScript Engineer",
 *     "Remote",
 *     "past_week",
 *     1,
 *     List.of("TypeScript", "React", "Node.js")
 * );
 * int score = analysis.get("jobs").get(0).get("insights").get("matchScore").asInt();
 * }</pre>
 */
public class LinkedInJobsClient {

    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final int retries;

    private LinkedInJobsClient(Builder builder) {
        this.baseUrl = builder.baseUrl != null ? builder.baseUrl : "http://localhost:3000/api/v1";
        this.retries = builder.retries > 0 ? builder.retries : 3;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(builder.timeoutSeconds > 0 ? builder.timeoutSeconds : 30))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    // ─── Builder ─────────────────────────────────────────────────────────────

    public static class Builder {
        private String baseUrl;
        private int retries = 3;
        private int timeoutSeconds = 30;

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder retries(int retries) {
            this.retries = retries;
            return this;
        }

        public Builder timeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
            return this;
        }

        public LinkedInJobsClient build() {
            return new LinkedInJobsClient(this);
        }
    }

    public static Builder builder() {
        return new Builder();
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private String trimBase() {
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    private JsonNode executeWithRetry(HttpRequest request) throws Exception {
        Exception lastException = null;
        for (int i = 0; i < retries; i++) {
            try {
                HttpResponse<String> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return objectMapper.readTree(response.body());
                } else if (response.statusCode() >= 400 && response.statusCode() < 500
                        && response.statusCode() != 429) {
                    throw new RuntimeException(
                            "Client error " + response.statusCode() + ": " + response.body());
                }
                if (response.statusCode() == 429) {
                    Thread.sleep((long) Math.pow(2, i) * 1000);
                }
            } catch (RuntimeException e) {
                throw e; // Don't retry definitive client errors
            } catch (Exception e) {
                lastException = e;
                if (i < retries - 1) {
                    Thread.sleep((long) Math.pow(2, i) * 1000);
                }
            }
        }
        throw new RuntimeException("Request failed after " + retries + " retries", lastException);
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Search for jobs on LinkedIn (raw listings, no intelligence).
     *
     * @param keywords       Job title, keywords, or company name (nullable)
     * @param location       City, state, country, or "Remote" (nullable)
     * @param dateSincePosted "past_24h", "past_week", "past_month", or null
     * @param page           Pagination page (1-based)
     * @return JsonNode representing the search response
     * @throws Exception on request failure after all retries
     */
    public JsonNode searchJobs(String keywords, String location, String dateSincePosted, int page)
            throws Exception {
        StringBuilder urlBuilder = new StringBuilder(trimBase()).append("/jobs/search?");
        if (keywords != null && !keywords.isEmpty()) {
            urlBuilder.append("keywords=")
                    .append(URLEncoder.encode(keywords, StandardCharsets.UTF_8)).append("&");
        }
        if (location != null && !location.isEmpty()) {
            urlBuilder.append("location=")
                    .append(URLEncoder.encode(location, StandardCharsets.UTF_8)).append("&");
        }
        if (dateSincePosted != null && !dateSincePosted.isEmpty()) {
            urlBuilder.append("dateSincePosted=")
                    .append(URLEncoder.encode(dateSincePosted, StandardCharsets.UTF_8)).append("&");
        }
        urlBuilder.append("page=").append(page);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(urlBuilder.toString()))
                .GET()
                .header("Accept", "application/json")
                .build();

        return executeWithRetry(request);
    }

    /**
     * Search for jobs and enrich each listing with intelligence insights.
     *
     * <p>The server computes seniority level, remote detection, skill extraction,
     * experience/salary parsing, and optional match scoring — all deterministically,
     * with no external AI API calls. Results are cached server-side for 5 minutes.
     *
     * <p>When {@code userSkills} is non-empty, results are sorted by {@code matchScore}
     * descending.
     *
     * @param keywords       Job title, keywords, or company name (nullable)
     * @param location       City, state, country, or "Remote" (nullable)
     * @param dateSincePosted "past_24h", "past_week", "past_month", or null
     * @param page           Pagination page (1-based)
     * @param userSkills     Your skills for match scoring (null or empty to skip)
     * @return JsonNode with {@code success}, {@code metadata} (includes {@code cached}),
     *         and {@code jobs} array (each with an {@code insights} sub-object)
     * @throws Exception on request failure after all retries
     *
     * @since 2.1.0
     */
    public JsonNode analyzeJobs(
            String keywords,
            String location,
            String dateSincePosted,
            int page,
            List<String> userSkills) throws Exception {

        // Build JSON request body
        ObjectNode body = objectMapper.createObjectNode();
        body.put("page", page);
        if (keywords != null && !keywords.isEmpty()) body.put("keywords", keywords);
        if (location != null && !location.isEmpty()) body.put("location", location);
        if (dateSincePosted != null && !dateSincePosted.isEmpty())
            body.put("dateSincePosted", dateSincePosted);
        if (userSkills != null && !userSkills.isEmpty()) {
            ArrayNode skillsNode = body.putArray("userSkills");
            userSkills.forEach(skillsNode::add);
        }

        String jsonBody = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(trimBase() + "/jobs/analyze"))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .build();

        return executeWithRetry(request);
    }

    /**
     * Convenience overload for {@link #analyzeJobs} without match scoring.
     *
     * @since 2.1.0
     */
    public JsonNode analyzeJobs(String keywords, String location, String dateSincePosted, int page)
            throws Exception {
        return analyzeJobs(keywords, location, dateSincePosted, page, null);
    }
}
