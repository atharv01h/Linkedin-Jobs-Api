package com.linkedin.jobs.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Structured intelligence computed for a single job listing.
 * Returned by {@link LinkedInJobsClient#analyzeJobs(String, String, String, int, List)}.
 *
 * <p>All fields are computed deterministically by the server-side NLP engine —
 * no external AI API is required.
 *
 * @since 2.1.0
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class JobInsight {

    /** Inferred seniority level from job title keywords. */
    @JsonProperty("seniorityLevel")
    public String seniorityLevel;

    /** True when workMode is remote or hybrid. */
    @JsonProperty("isRemote")
    public boolean isRemote;

    /** Detailed work mode: "remote", "hybrid", "on-site", or "unknown". */
    @JsonProperty("workMode")
    public String workMode;

    /** Job type: "full-time", "part-time", "contract", "internship", "freelance", or "unknown". */
    @JsonProperty("jobType")
    public String jobType;

    /** Technologies extracted from the job title using a 500+ skill taxonomy. */
    @JsonProperty("requiredSkills")
    public List<String> requiredSkills;

    /** Parsed experience requirement. */
    @JsonProperty("experienceYears")
    public ExperienceRange experienceYears;

    /** Salary range parsed from the job title. */
    @JsonProperty("salaryRange")
    public SalaryRange salaryRange;

    /**
     * Match score 0–100 against user-provided skills.
     * Null when no userSkills were sent in the request.
     */
    @JsonProperty("matchScore")
    public Integer matchScore;

    // ─── Nested types ─────────────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExperienceRange {
        /** Minimum years required. Null when not mentioned. */
        @JsonProperty("min")
        public Integer min;

        /** Maximum years. Null when not mentioned or open-ended (e.g. "5+ years"). */
        @JsonProperty("max")
        public Integer max;

        @Override
        public String toString() {
            if (min == null && max == null) return "not specified";
            if (max == null) return min + "+ years";
            return min + "–" + max + " years";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SalaryRange {
        /** Minimum salary (normalised to yearly). Null when not mentioned. */
        @JsonProperty("min")
        public Integer min;

        /** Maximum salary (normalised to yearly). Null when not mentioned. */
        @JsonProperty("max")
        public Integer max;

        /** ISO 4217 currency code: "USD", "EUR", "GBP", "INR". Default "USD". */
        @JsonProperty("currency")
        public String currency;

        /** Granularity before normalisation: "yearly", "monthly", "hourly", "unknown". */
        @JsonProperty("period")
        public String period;

        @Override
        public String toString() {
            if (min == null) return "not specified";
            return currency + " " + min + "–" + max + " (" + period + ")";
        }
    }

    @Override
    public String toString() {
        return "JobInsight{" +
                "seniorityLevel='" + seniorityLevel + '\'' +
                ", workMode='" + workMode + '\'' +
                ", jobType='" + jobType + '\'' +
                ", requiredSkills=" + requiredSkills +
                ", matchScore=" + matchScore +
                '}';
    }
}
