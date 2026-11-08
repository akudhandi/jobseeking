export interface JobItem {
  job_id: string;
  title: string;
  url: string;
  company: string | null;
  company_slug: string | null;
  location_raw: string | null;
  city: string | null;
  province: string | null;
  is_jatim: boolean;
  work_type: string;
  employment_type: string | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  salary_currency: string;
  has_salary: boolean;
  posted_at: string | null;
  scraped_at: string | null;
  search_keyword: string | null;
  source: string;
  skills: string[];
  requirements: string[];
  description?: string | null;
}

export interface JobsResponse {
  total: number;
  limit: number;
  offset: number;
  items: JobItem[];
}

export interface NameCount {
  name: string;
  count: number;
}

export interface Overview {
  total_jobs: number;
  total_companies: number;
  jobs_with_salary: number;
  salary_coverage: number;
  jatim_jobs: number;
  remote_jobs: number;
  last_scraped_at: string | null;
  by_city: NameCount[];
  by_work_type: NameCount[];
  by_seniority: NameCount[];
  by_keyword: NameCount[];
  by_employment_type: NameCount[];
}

export interface SkillStat {
  slug: string;
  name: string;
  category: string;
  count: number;
}

export interface CompanyStat {
  company: string;
  slug: string;
  count: number;
  avg_salary_min: number | null;
  avg_salary_max: number | null;
}

export interface SalaryGroup {
  name: string;
  count: number;
  avg_min: number | null;
  avg_max: number | null;
  avg_mid: number | null;
}

export interface SalaryStats {
  sample_size: number;
  overall: { count: number; min: number; max: number; avg: number; median: number } | null;
  salary_min: { count: number; min: number; max: number; avg: number; median: number } | null;
  salary_max: { count: number; min: number; max: number; avg: number; median: number } | null;
  distribution: { bucket: string; count: number }[];
  by_seniority: SalaryGroup[];
  by_city: SalaryGroup[];
  by_keyword: SalaryGroup[];
}

export interface TrendItem {
  bucket: string;
  count: number;
}

export interface LocationStat {
  city: string;
  province: string | null;
  is_jatim: boolean;
  count: number;
}

export interface Meta {
  cities: string[];
  provinces: string[];
  work_types: string[];
  seniorities: string[];
  employment_types: string[];
  keywords: string[];
  skills: { slug: string; name: string; category: string }[];
}
