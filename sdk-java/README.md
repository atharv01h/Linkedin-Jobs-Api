# LinkedIn Jobs API Java SDK

[![Maven Central](https://img.shields.io/maven-central/v/io.github.atharv01h.linkedin.jobs/linkedin-jobs-api.svg)](https://central.sonatype.com/artifact/io.github.atharv01h.linkedin.jobs/linkedin-jobs-api)
[![Java 17](https://img.shields.io/badge/Java-17%2B-orange.svg)](https://adoptium.net/)

The official Java SDK for the LinkedIn Jobs API. This library uses modern `java.net.http.HttpClient` to cleanly and efficiently query the LinkedIn Jobs backend service.

## Installation

### Maven
```xml
<dependency>
    <groupId>io.github.atharv01h.linkedin.jobs</groupId>
    <artifactId>linkedin-jobs-api</artifactId>
    <version>2.0.0</version>
</dependency>
```

### Gradle
```gradle
implementation 'io.github.atharv01h.linkedin.jobs:linkedin-jobs-api:2.0.0'
```

## Usage

```java
import com.linkedin.jobs.api.LinkedInJobsClient;
import com.fasterxml.jackson.databind.JsonNode;

public class Example {
    public static void main(String[] args) throws Exception {
        
        // 1. Initialize the client pointing to your backend
        LinkedInJobsClient client = LinkedInJobsClient.builder()
                .baseUrl("http://localhost:3000/api/v1")
                .timeoutSeconds(30)
                .retries(3)
                .build();
                
        // 2. Search for jobs
        JsonNode response = client.searchJobs(
            "Software Engineer", 
            "Seattle", 
            "past_month", 
            1
        );
        
        // 3. Process results
        System.out.println("Jobs found: " + response.get("metadata").get("count").asInt());
        
        for (JsonNode job : response.get("jobs")) {
            System.out.println("- " + job.get("title").asText() + " at " + job.get("company").asText());
        }
    }
}
```

## Repository
For more information, the backend service code, and other SDKs (Python, Node.js), please visit the [Main GitHub Repository](https://github.com/atharv01h/Linkedin-Jobs-Api).
