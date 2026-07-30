import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from '../utils/logger';

puppeteer.use(StealthPlugin());

export interface JobSearchFilters {
  keywords?: string;
  location?: string;
  dateSincePosted?: string; // e.g. "past_24h", "past_week", "past_month"
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

export class ScraperService {
  private static constructSearchUrl(filters: JobSearchFilters): string {
    const baseUrl = 'https://www.linkedin.com/jobs/search';
    const params = new URLSearchParams();
    
    if (filters.keywords) params.append('keywords', filters.keywords);
    if (filters.location) params.append('location', filters.location);
    if (filters.dateSincePosted) {
      // f_TPR=r86400 (past 24h), f_TPR=r604800 (past week), f_TPR=r2592000 (past month)
      const timeMap: Record<string, string> = {
        'past_24h': 'r86400',
        'past_week': 'r604800',
        'past_month': 'r2592000'
      };
      const tpr = timeMap[filters.dateSincePosted] || '';
      if (tpr) params.append('f_TPR', tpr);
    }
    
    params.append('position', '1');
    params.append('pageNum', '0');
    
    // Pagination (start offset)
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const start = (page - 1) * 25; // LinkedIn typically paginates by 25
    if (start > 0) {
      params.append('start', start.toString());
    }

    return `${baseUrl}?${params.toString()}`;
  }

  static async searchJobs(filters: JobSearchFilters): Promise<JobListing[]> {
    const searchUrl = this.constructSearchUrl(filters);
    logger.info(`Scraping URL: ${searchUrl}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      // Randomize user agent somewhat
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for either the job list to load, or the fallback selector
      try {
        await page.waitForSelector('ul.jobs-search__results-list, .jobs-search-results__list', { timeout: 10000 });
      } catch (e) {
        logger.warn('Initial wait for job list timed out, attempting fallback or checking if page is empty');
      }

      // Scroll a bit to trigger lazy loading
      await page.evaluate(() => {
        window.scrollBy(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('ul.jobs-search__results-list li, .jobs-search-results__list li.jobs-search-results__list-item');
        
        return Array.from(jobElements).map(element => {
          // Both non-logged in and logged in variant classes
          const titleEl = element.querySelector('.base-search-card__title, .job-card-list__title');
          const companyEl = element.querySelector('.base-search-card__subtitle, .job-card-container__company-name');
          const locationEl = element.querySelector('.job-search-card__location, .job-card-container__metadata-item');
          const linkEl = element.querySelector('.base-card__full-link, a.job-card-list__title');
          const dateEl = element.querySelector('time');
          
          let link = linkEl ? (linkEl as HTMLAnchorElement).href : '';
          // Extract ID from link
          let id = '';
          if (link) {
             const match = link.match(/-(\d+)\?/);
             if (match && match[1]) id = match[1];
             else {
               const viewMatch = link.match(/view\/(\d+)\//);
               if (viewMatch && viewMatch[1]) id = viewMatch[1];
             }
          }

          return {
            id,
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            link,
            listDate: dateEl?.getAttribute('datetime') || ''
          };
        }).filter(j => j.title !== ''); // Filter out empty elements
      });

      return jobs;
    } catch (error: any) {
      logger.error(`Error during scraping: ${error.message}`);
      throw new Error('Failed to scrape jobs');
    } finally {
      await browser.close();
    }
  }
}
