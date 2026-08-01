package com.linkedin.jobs.api;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

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
                .connectTimeout(Duration.ofSeconds(builder.timeoutSeconds > 0 ? builder.timeoutSeconds : 10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public static class Builder {
        private String baseUrl;
        private int retries = 3;
        private int timeoutSeconds = 10;

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

    public JsonNode searchJobs(String keywords, String location, String dateSincePosted, int page) throws Exception {
        String basePath = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        StringBuilder urlBuilder = new StringBuilder(basePath).append("/jobs/search?");
        if (keywords != null && !keywords.isEmpty()) {
            urlBuilder.append("keywords=").append(URLEncoder.encode(keywords, StandardCharsets.UTF_8)).append("&");
        }
        if (location != null && !location.isEmpty()) {
            urlBuilder.append("location=").append(URLEncoder.encode(location, StandardCharsets.UTF_8)).append("&");
        }
        if (dateSincePosted != null && !dateSincePosted.isEmpty()) {
            urlBuilder.append("dateSincePosted=").append(URLEncoder.encode(dateSincePosted, StandardCharsets.UTF_8)).append("&");
        }
        urlBuilder.append("page=").append(page);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(urlBuilder.toString()))
                .GET()
                .header("Accept", "application/json")
                .build();

        Exception lastException = null;
        for (int i = 0; i < retries; i++) {
            try {
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return objectMapper.readTree(response.body());
                } else if (response.statusCode() >= 400 && response.statusCode() < 500 && response.statusCode() != 429) {
                    throw new RuntimeException("Client error for URI " + request.uri().toString() + ": " + response.statusCode() + " - " + response.body());
                }
                
                if (response.statusCode() == 429) {
                    Thread.sleep((long) Math.pow(2, i) * 1000);
                }

            } catch (Exception e) {
                lastException = e;
                Thread.sleep((long) Math.pow(2, i) * 1000);
            }
        }
        throw new RuntimeException("Request failed after " + retries + " retries", lastException);
    }
}
