import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface JobSearchFilters {
  keywords?: string;
  location?: string;
  dateSincePosted?: 'past_24h' | 'past_week' | 'past_month';
  page?: number;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  listDate: string;
}

export interface SearchResponse {
  success: boolean;
  metadata: {
    count: number;
    page: number;
  };
  jobs: JobListing[];
}

export interface LinkedInJobsClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

export class LinkedInJobsClient {
  private client: AxiosInstance;
  private retries: number;

  constructor(options: LinkedInJobsClientOptions = {}) {
    const baseURL = options.baseURL || 'http://localhost:3000/api/v1';
    this.retries = options.retries ?? 3;
    
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  private async requestWithRetry<T>(config: AxiosRequestConfig): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error: any) {
        lastError = error;
        // Don't retry on 4xx client errors
        if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          break;
        }
        // Exponential backoff for retries
        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    throw new Error(`Request failed after ${this.retries} attempts: ${lastError?.message}`);
  }

  /**
   * Search for jobs on LinkedIn
   * @param filters - The search criteria
   * @returns A promise resolving to the search response containing job listings
   */
  public async searchJobs(filters: JobSearchFilters): Promise<SearchResponse> {
    return this.requestWithRetry<SearchResponse>({
      method: 'GET',
      url: '/jobs/search',
      params: filters
    });
  }
}
