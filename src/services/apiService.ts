/**
 * ==============================================================================
 * SIH26103: MoSPI PAIMANA Platform - Centralized API Service Layer
 * ==============================================================================
 * Connects the React application to the Python FastAPI AI backend running at
 * http://127.0.0.1:8000 (or VITE_API_BASE_URL).
 * Handles timeouts, network retries, typed responses, and graceful fallback info.
 * ==============================================================================
 */

import type {
  HealthResponse,
  ProjectListResponse,
  ProjectDetail,
  AnalyticsSummaryResponse,
  ProjectForecastResponse,
  ProjectDelayRiskResponse,
  ProjectAnomalyResponse,
  AIAssistantRequest,
  AIAssistantResponse,
  SessionResetResponse,
  ProjectExecutiveReportResponse
} from '../types/backend';

// Determine default API base URL
// In development with Vite proxy, relative requests or direct 127.0.0.1:8000 work.
const ENV_API_BASE = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = (ENV_API_BASE && ENV_API_BASE.trim() !== '')
  ? ENV_API_BASE.replace(/\/+$/, '')
  : 'http://127.0.0.1:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) {
            errorDetail = typeof errJson.detail === 'string'
              ? errJson.detail
              : JSON.stringify(errJson.detail);
          }
        } catch {
          // ignore non-json response
        }
        throw new Error(errorDetail);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request to ${endpoint} timed out after 20 seconds`);
      }
      throw err;
    }
  }

  /**
   * Check backend health and dataset readiness
   */
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /**
   * Quick boolean health check
   */
  public async isBackendOnline(): Promise<boolean> {
    try {
      const res = await this.getHealth();
      return res.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Paginated list of projects with optional filters
   */
  public async getProjects(params?: {
    page?: number;
    pageSize?: number;
    sector?: string;
    state?: string;
    status?: string;
    search?: string;
  }): Promise<ProjectListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));
    if (params?.sector && params.sector !== 'ALL') searchParams.set('sector', params.sector);
    if (params?.state && params.state !== 'ALL') searchParams.set('state', params.state);
    if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params?.search && params.search.trim() !== '') searchParams.set('search', params.search.trim());

    const qs = searchParams.toString();
    return this.request<ProjectListResponse>(`/projects${qs ? `?${qs}` : ''}`);
  }

  /**
   * Comprehensive project details with history
   */
  public async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    return this.request<ProjectDetail>(`/projects/${encodeURIComponent(projectId)}`);
  }

  /**
   * Portfolio-wide statistical summary
   */
  public async getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
    return this.request<AnalyticsSummaryResponse>('/analytics/summary');
  }

  /**
   * Data quality report
   */
  public async getDataQuality(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('/analytics/data-quality');
  }

  /**
   * Physical progress forecast
   */
  public async getProjectForecast(projectId: string, horizon: number = 6): Promise<ProjectForecastResponse> {
    return this.request<ProjectForecastResponse>(
      `/ai/forecast/${encodeURIComponent(projectId)}?horizon=${horizon}`
    );
  }

  /**
   * Multidimensional delay risk evaluation
   */
  public async getProjectDelayRisk(projectId: string): Promise<ProjectDelayRiskResponse> {
    return this.request<ProjectDelayRiskResponse>(
      `/ai/delay-risk/${encodeURIComponent(projectId)}`
    );
  }

  /**
   * Progress and expenditure anomaly detection
   */
  public async getProjectAnomalies(projectId: string): Promise<ProjectAnomalyResponse> {
    return this.request<ProjectAnomalyResponse>(
      `/ai/anomalies/${encodeURIComponent(projectId)}`
    );
  }

  /**
   * Ask natural language inquiry assistant grounded on MoSPI PAIMANA data
   */
  public async askAssistant(request: AIAssistantRequest): Promise<AIAssistantResponse> {
    return this.request<AIAssistantResponse>('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Reset conversation context for an active session
   */
  public async resetAssistantSession(sessionId: string): Promise<SessionResetResponse> {
    return this.request<SessionResetResponse>('/ai/assistant/reset', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  /**
   * Generate executive intelligence report for a project
   */
  public async getProjectReport(projectId: string): Promise<ProjectExecutiveReportResponse> {
    return this.request<ProjectExecutiveReportResponse>(
      `/ai/report/${encodeURIComponent(projectId)}`
    );
  }
}

export const apiService = new ApiService();
export default apiService;
