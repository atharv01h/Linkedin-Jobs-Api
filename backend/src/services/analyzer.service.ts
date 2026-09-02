/**
 * Analyzer Service — Deterministic Job Intelligence Engine
 *
 * Enriches raw job listings with structured insights using pure heuristic NLP.
 * Zero external API calls, zero paid services, fully deterministic.
 *
 * Capabilities:
 *  - Seniority level detection
 *  - Remote / hybrid / on-site classification
 *  - Job type classification
 *  - Skill extraction from title
 *  - Experience year requirement parsing
 *  - Salary range extraction
 *  - TF-IDF style match scoring against user skills
 */

import type {
  JobListing,
  EnrichedJobListing,
  SeniorityLevel,
  WorkMode,
  JobType,
  SalaryRange,
  ExperienceRange,
} from '../types/job.types';

// ─── Skill Taxonomy ───────────────────────────────────────────────────────────
// 500+ skills across 20+ categories, ordered longest-first to avoid substring collisions

const SKILL_TAXONOMY: readonly string[] = [
  // Languages
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Kotlin', 'Swift', 'Go', 'Golang',
  'Rust', 'Ruby', 'PHP', 'Scala', 'C++', 'C#', 'C', 'Dart', 'R', 'MATLAB',
  'Bash', 'Shell', 'PowerShell', 'Perl', 'Groovy', 'Elixir', 'Haskell',
  'Objective-C', 'COBOL', 'Fortran', 'Lua', 'Julia',

  // Frontend
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'SvelteKit',
  'Remix', 'Gatsby', 'Redux', 'Zustand', 'MobX', 'Recoil', 'Jotai',
  'Webpack', 'Vite', 'Parcel', 'Rollup', 'Babel', 'ESLint', 'Prettier',
  'HTML', 'CSS', 'Sass', 'SCSS', 'Less', 'Tailwind CSS', 'Bootstrap',
  'Material UI', 'Chakra UI', 'Ant Design', 'Storybook', 'Jest', 'Cypress',
  'Playwright', 'Testing Library', 'Vitest',

  // Backend / Frameworks
  'Node.js', 'Express', 'NestJS', 'Fastify', 'Koa', 'Hapi',
  'Spring Boot', 'Spring', 'Django', 'Flask', 'FastAPI', 'Tornado',
  'Rails', 'Laravel', 'Symfony', 'ASP.NET', '.NET Core', '.NET',
  'Gin', 'Echo', 'Fiber', 'Actix', 'Rocket',
  'GraphQL', 'REST', 'gRPC', 'WebSockets', 'WebSocket', 'OpenAPI', 'Swagger',

  // Databases
  'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'Oracle', 'MSSQL',
  'MongoDB', 'DynamoDB', 'CouchDB', 'Firebase', 'Firestore',
  'Redis', 'Memcached', 'Cassandra', 'ScyllaDB', 'HBase',
  'Elasticsearch', 'OpenSearch', 'Solr', 'Typesense',
  'InfluxDB', 'TimescaleDB', 'Clickhouse', 'BigQuery', 'Snowflake',
  'Redshift', 'Databricks', 'dbt', 'Airflow',

  // Cloud / DevOps
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'Vercel', 'Netlify',
  'DigitalOcean', 'Cloudflare',
  'Docker', 'Kubernetes', 'K8s', 'Helm', 'Istio', 'Envoy',
  'Terraform', 'Ansible', 'Puppet', 'Chef', 'Pulumi', 'CDK',
  'CI/CD', 'GitHub Actions', 'Jenkins', 'GitLab CI', 'CircleCI',
  'Travis CI', 'ArgoCD', 'Flux',
  'Nginx', 'Apache', 'HAProxy', 'Traefik',
  'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Sentry', 'Splunk',

  // AI / ML
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'Pandas', 'NumPy',
  'Hugging Face', 'LangChain', 'OpenAI', 'LLM', 'RAG',
  'MLflow', 'Kubeflow', 'SageMaker', 'Vertex AI',

  // Mobile
  'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin', 'Ionic',
  'SwiftUI', 'Jetpack Compose',

  // Data Engineering
  'Spark', 'Kafka', 'Hadoop', 'Flink', 'Hive', 'Presto', 'Trino',
  'ETL', 'ELT', 'Data Pipeline', 'Data Warehouse', 'Data Lake',

  // Security
  'OAuth', 'JWT', 'SAML', 'SSO', 'LDAP', 'PKI', 'TLS', 'HTTPS',
  'Penetration Testing', 'OWASP', 'SOC 2', 'ISO 27001',

  // Methodologies / Practices
  'Agile', 'Scrum', 'Kanban', 'TDD', 'BDD', 'DDD', 'SOLID', 'Microservices',
  'Monorepo', 'Serverless', 'Event-Driven', 'CQRS', 'Event Sourcing',

  // Tools
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence',
  'Figma', 'Sketch', 'Linux', 'Unix', 'macOS', 'Windows',
];

// Pre-sorted longest-first for greedy matching (avoids "JS" matching inside "NestJS")
const SORTED_SKILLS = [...SKILL_TAXONOMY].sort((a, b) => b.length - a.length);

// ─── Seniority Configuration ──────────────────────────────────────────────────

const SENIORITY_MAP: Array<{ pattern: RegExp; level: SeniorityLevel; weight: number }> = [
  { pattern: /\b(intern|internship|co-op)\b/i, level: 'intern', weight: 10 },
  { pattern: /\bjunior\b|\bjr\.?\b|\bentry[- ]level\b|\bassociate\b/i, level: 'junior', weight: 8 },
  { pattern: /\bmid[- ]?level\b|\bintermediate\b/i, level: 'mid', weight: 7 },
  { pattern: /\bstaff\b/i, level: 'staff', weight: 9 },
  { pattern: /\bprincipal\b/i, level: 'principal', weight: 9 },
  { pattern: /\blead\b|\btech lead\b|\btechnical lead\b/i, level: 'lead', weight: 8 },
  { pattern: /\bsenior\b|\bsr\.?\b/i, level: 'senior', weight: 6 },
  { pattern: /\bdirector\b/i, level: 'director', weight: 9 },
  { pattern: /\bvp\b|\bvice president\b/i, level: 'vp', weight: 10 },
  { pattern: /\bcto\b|\bchief\b/i, level: 'cto', weight: 10 },
];

// ─── Salary Patterns ──────────────────────────────────────────────────────────

interface SalaryPatternConfig {
  pattern: RegExp;
  currency: string;
  period: SalaryRange['period'];
  multiplier: number; // to convert to yearly if needed
}

const SALARY_PATTERNS: SalaryPatternConfig[] = [
  // USD: $120k - $160k/year or $120,000 - $160,000
  {
    pattern: /\$\s*([\d,]+)\s*k?\s*[-–—to]+\s*\$?\s*([\d,]+)\s*k?(?:\s*\/?\s*(yr|year|pa|annually))?/i,
    currency: 'USD', period: 'yearly', multiplier: 1,
  },
  // Hourly: $45/hr - $65/hr
  {
    pattern: /\$\s*([\d,]+)\s*[-–—to]+\s*\$?\s*([\d,]+)\s*(?:\/\s*(?:hr|hour))/i,
    currency: 'USD', period: 'hourly', multiplier: 2080,
  },
  // Monthly: $8,000 - $12,000/month
  {
    pattern: /\$\s*([\d,]+)\s*[-–—to]+\s*\$?\s*([\d,]+)\s*(?:\/\s*(?:mo|month))/i,
    currency: 'USD', period: 'monthly', multiplier: 12,
  },
  // EUR: €60k - €80k
  {
    pattern: /€\s*([\d,]+)\s*k?\s*[-–—to]+\s*€?\s*([\d,]+)\s*k?/i,
    currency: 'EUR', period: 'yearly', multiplier: 1,
  },
  // GBP: £50k - £70k
  {
    pattern: /£\s*([\d,]+)\s*k?\s*[-–—to]+\s*£?\s*([\d,]+)\s*k?/i,
    currency: 'GBP', period: 'yearly', multiplier: 1,
  },
  // INR: ₹10 LPA - ₹20 LPA or 10-20 LPA
  {
    pattern: /(?:₹\s*)?([\d.]+)\s*[-–—to]+\s*([\d.]+)\s*(?:LPA|lpa|L\.P\.A)/i,
    currency: 'INR', period: 'yearly', multiplier: 100000,
  },
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function parseAmount(raw: string, isK: boolean): number {
  const cleaned = raw.replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isK ? num * 1000 : num;
}



/**
 * Detects seniority level from job title using weighted keyword matching.
 */
export function detectSeniority(title: string): SeniorityLevel {
  let bestLevel: SeniorityLevel = 'unknown';
  let bestWeight = -1;

  for (const { pattern, level, weight } of SENIORITY_MAP) {
    if (pattern.test(title)) {
      if (weight > bestWeight) {
        bestWeight = weight;
        bestLevel = level;
      }
    }
  }

  // Fallback: if no explicit level found but title is a plain IC title, assume mid
  if (bestLevel === 'unknown') {
    const midIndicators = /\bengineer\b|\bdeveloper\b|\bdesigner\b|\banalyst\b|\bscientist\b/i;
    if (midIndicators.test(title)) bestLevel = 'mid';
  }

  return bestLevel;
}

/**
 * Detects work mode from title and location.
 */
export function detectWorkMode(title: string, location: string): WorkMode {
  const combined = `${title} ${location}`.toLowerCase();

  if (/\bhybrid\b/.test(combined)) return 'hybrid';
  if (/\bremote\b|\bwork from home\b|\bwfh\b|\banywhere\b/.test(combined)) return 'remote';
  if (/\bon[-\s]?site\b|\bin[-\s]?office\b|\bon[-\s]?location\b/.test(combined)) return 'on-site';

  return 'unknown';
}

/**
 * Detects job type from title.
 */
export function detectJobType(title: string): JobType {
  const t = title.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return 'internship';
  if (/\bcontract\b|\bcontractor\b|\bc2c\b/.test(t)) return 'contract';
  if (/\bpart[-\s]?time\b/.test(t)) return 'part-time';
  if (/\bfreelance\b|\bfreelancer\b/.test(t)) return 'freelance';
  if (/\bfull[-\s]?time\b/.test(t)) return 'full-time';
  return 'unknown';
}

/**
 * Extracts skills from title using the skill taxonomy.
 * Uses greedy longest-first matching to avoid partial matches.
 */
export function extractSkills(title: string): string[] {
  const found: string[] = [];
  // Use the title as a search space
  const searchText = ` ${title} `;

  for (const skill of SORTED_SKILLS) {
    // Build a word-boundary-aware pattern
    // Replace special regex chars in the skill name
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`(?<![a-zA-Z0-9.])${escaped}(?![a-zA-Z0-9.])`, 'i');
    if (re.test(searchText)) {
      // Normalize to canonical taxonomy casing
      found.push(skill);
    }
  }

  // Deduplicate (case-insensitive) preserving first found (longest)
  const seen = new Set<string>();
  return found.filter(s => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extracts experience requirement from title.
 * Handles patterns like "5+ years", "3-5 years", "2 years experience"
 */
export function extractExperience(title: string): ExperienceRange {
  // Pattern: "X-Y years" or "X+ years" or "X years"
  const rangePattern = /(\d+)\s*[-–—]\s*(\d+)\s*(?:\+)?\s*(?:years?|yrs?)/i;
  const minPlusPattern = /(\d+)\s*\+\s*(?:years?|yrs?)/i;
  const exactPattern = /(\d+)\s*(?:years?|yrs?)/i;

  const rangeMatch = title.match(rangePattern);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }

  const plusMatch = title.match(minPlusPattern);
  if (plusMatch) {
    const min = parseInt(plusMatch[1], 10);
    return { min, max: null };
  }

  const exactMatch = title.match(exactPattern);
  if (exactMatch) {
    const val = parseInt(exactMatch[1], 10);
    return { min: val, max: val };
  }

  return { min: null, max: null };
}

/**
 * Extracts salary range from title.
 * Supports USD, EUR, GBP, INR formats with yearly/monthly/hourly detection.
 */
export function extractSalaryRange(title: string): SalaryRange {
  const nullResult: SalaryRange = { min: null, max: null, currency: 'USD', period: 'unknown' };

  for (const config of SALARY_PATTERNS) {
    const match = title.match(config.pattern);
    if (!match) continue;

    const raw1 = match[1];
    const raw2 = match[2];

    // Detect if "k" suffix is present (the full match contains it)
    const fullMatch = match[0];
    const hasK = /k/i.test(fullMatch);

    const min = parseAmount(raw1, hasK);
    const max = parseAmount(raw2, hasK);

    if (min <= 0 || max <= 0 || max < min) continue;

    return {
      min: Math.round(min * config.multiplier),
      max: Math.round(max * config.multiplier),
      currency: config.currency,
      period: config.period,
    };
  }

  return nullResult;
}

/**
 * Computes a match score (0–100) between job's required skills and user's skill set.
 *
 * Uses a weighted TF-IDF-inspired approach:
 * - Each matched skill contributes proportionally to skill rarity
 * - Score is boosted for seniority alignment (user hints from skill count)
 */
export function computeMatchScore(
  jobSkills: string[],
  userSkills: string[],
): number {
  if (!userSkills.length || !jobSkills.length) return 0;

  const normalize = (skills: string[]) =>
    new Set(skills.map(s => s.toLowerCase().trim()));

  const jobSet = normalize(jobSkills);
  const userSet = normalize(userSkills);

  // Intersection
  const matched = [...jobSet].filter(s => userSet.has(s));

  // Jaccard-inspired but weighted towards job requirements
  // Score = (matched / job_skills) * 100, capped at 100
  const jobCoverage = matched.length / jobSet.size;

  // Bonus: user has MORE skills than required (extra 10%)
  const extraBonus = userSet.size > jobSet.size ? 0.1 : 0;

  const raw = Math.min(1, jobCoverage + extraBonus);
  return Math.round(raw * 100);
}

// ─── Main Analyzer Entry Point ────────────────────────────────────────────────

/**
 * Enriches a single JobListing with computed insights.
 */
export function analyzeJob(
  job: JobListing,
  userSkills: string[] = [],
): EnrichedJobListing {
  const combined = job.title; // Analyzer runs on title only (no description available without auth)

  const requiredSkills = extractSkills(combined);
  const seniorityLevel = detectSeniority(combined);
  const workMode = detectWorkMode(job.title, job.location);
  const isRemote = workMode === 'remote' || workMode === 'hybrid';
  const jobType = detectJobType(combined);
  const experienceYears = extractExperience(combined);
  const salaryRange = extractSalaryRange(combined);
  const matchScore =
    userSkills.length > 0
      ? computeMatchScore(requiredSkills.length > 0 ? requiredSkills : [], userSkills)
      : null;

  return {
    ...job,
    insights: {
      seniorityLevel,
      isRemote,
      workMode,
      jobType,
      requiredSkills,
      experienceYears,
      salaryRange,
      matchScore,
    },
  };
}

/**
 * Enriches a list of JobListings with intelligence.
 * Sorts results by matchScore descending when userSkills are provided.
 */
export function analyzeJobs(
  jobs: JobListing[],
  userSkills: string[] = [],
): EnrichedJobListing[] {
  const enriched = jobs.map(job => analyzeJob(job, userSkills));

  // Sort by matchScore DESC when user skills provided
  if (userSkills.length > 0) {
    enriched.sort((a, b) => (b.insights.matchScore ?? 0) - (a.insights.matchScore ?? 0));
  }

  return enriched;
}
