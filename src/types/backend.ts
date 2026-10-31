/**
 * ==============================================================================
 * SIH26103: MoSPI PAIMANA Platform - Backend API Schemas & Types
 * ==============================================================================
 * Strongly typed TypeScript interfaces mirroring Python FastAPI Pydantic models
 * in AI-Backend/app/models/*.
 * ==============================================================================
 */

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp_utc: string;
  dataset: {
    loaded: boolean;
    total_projects: number;
    total_observations: number;
    validation_passed: boolean;
    coverage_period: string;
  };
}

export interface ProjectObservation {
  project_id: string;
  project_name?: string | null;
  agency?: string | null;
  ministry?: string | null;
  sector?: string | null;
  state?: string | null;
  district?: string | null;
  legacy_ocms_code?: string | null;
  approval_date?: string | null;
  start_date?: string | null;
  original_doc?: string | null;
  revised_doc?: string | null;
  original_cost_cr?: number | null;
  revised_cost_cr?: number | null;
  cumulative_expenditure_cr?: number | null;
  physical_progress_pct?: number | null;
  report_month?: string | null;
  report_month_key?: string | null;
  source_file?: string | null;
  serial_no?: number | null;
}

export interface ProjectSummary {
  project_id: string;
  project_name?: string | null;
  agency?: string | null;
  ministry?: string | null;
  sector?: string | null;
  state?: string | null;
  district?: string | null;
  legacy_ocms_code?: string | null;
  approval_date?: string | null;
  start_date?: string | null;
  original_doc?: string | null;
  revised_doc?: string | null;
  original_cost_cr?: number | null;
  revised_cost_cr?: number | null;
  cumulative_expenditure_cr?: number | null;
  physical_progress_pct?: number | null;
  cost_overrun_cr?: number | null;
  cost_overrun_pct?: number | null;
  time_overrun_months?: number | null;
  derived_status?: string | null;
  months_reported_count?: number | null;
  latest_reported_month?: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  first_reported_month?: string | null;
  reported_months_list?: string | null;
  initial_cost_cr?: number | null;
  initial_expenditure_cr?: number | null;
  initial_progress_pct?: number | null;
  progress_delta_pct?: number | null;
  history: ProjectObservation[];
}

export interface ProjectListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ProjectSummary[];
}

export interface SectorMetric {
  count: number;
  original_cost_cr: number;
  revised_cost_cr: number;
  expenditure_cr: number;
  cost_overrun_cr: number;
  avg_progress_pct: number;
}

export interface AnalyticsSummaryResponse {
  generated_at: string;
  report_month_coverage: string;
  total_projects: number;
  total_observations: number;
  cost_summary: {
    total_original_cost_cr: number;
    total_revised_cost_cr: number;
    total_cumulative_expenditure_cr: number;
    total_cost_overrun_cr: number;
    overall_cost_overrun_pct: number;
    financial_progress_pct: number;
  };
  schedule_summary: {
    delayed_projects_count: number;
    delayed_projects_pct: number;
    avg_delay_months: number;
    max_delay_months: number;
  };
  status_breakdown: Record<string, number>;
  top_sectors_by_count: Record<string, SectorMetric>;
  top_cost_overrun_projects: ProjectSummary[];
  top_time_overrun_projects: ProjectSummary[];
}

export interface MonthlyForecastPoint {
  horizon_step: number;
  month_key: string;
  month_label: string;
  predicted_progress_pct: number;
  lower_bound_80_pct: number;
  upper_bound_80_pct: number;
  baseline_persistence_pct: number;
}

export interface ForecastModelMetadata {
  model_name: string;
  baseline_comparison: string;
  sample_observations_used: number;
  estimated_monthly_velocity_pct: number;
  sector_prior_velocity_pct: number;
  evaluation_benchmark: Record<string, any>;
}

export interface ProjectForecastResponse {
  project_id: string;
  project_name?: string | null;
  sector?: string | null;
  agency?: string | null;
  derived_status?: string | null;
  data_sufficiency: 'sufficient' | 'limited' | 'insufficient' | string;
  latest_reported_month?: string | null;
  latest_reported_progress_pct?: number | null;
  official_original_doc?: string | null;
  official_revised_doc?: string | null;
  forecasted_completion_doc?: string | null;
  projected_slippage_months?: number | null;
  trajectory: MonthlyForecastPoint[];
  model_metadata: ForecastModelMetadata;
  limitations_and_disclaimers: string[];
}

export interface OfficialScheduleInfo {
  approval_date?: string | null;
  start_date?: string | null;
  original_doc?: string | null;
  revised_doc?: string | null;
  official_time_overrun_months?: number | null;
  official_derived_status?: string | null;
  latest_reported_progress_pct?: number | null;
  latest_reported_month?: string | null;
}

export interface ModelInferredScheduleInfo {
  data_sufficiency: string;
  observations_analyzed: number;
  trailing_stagnant_months: number;
  is_prolonged_stagnation: boolean;
  estimated_monthly_velocity_pct?: number | null;
  model_forecasted_doc?: string | null;
  inferred_slippage_months?: number | null;
}

export interface RiskIndicator {
  indicator_code: string;
  name: string;
  severity: 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  triggered: boolean;
  description: string;
  observed_value?: any;
  threshold?: any;
}

export interface ProjectDelayRiskResponse {
  project_id: string;
  project_name?: string | null;
  sector?: string | null;
  agency?: string | null;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical' | 'Indeterminate' | string;
  risk_score: number;
  official_schedule: OfficialScheduleInfo;
  model_inferred: ModelInferredScheduleInfo;
  risk_indicators: RiskIndicator[];
  explanation: string;
  actionable_recommendations: string[];
  disclaimer: string;
}

export interface OfficialFinancials {
  original_cost_cr?: number | null;
  revised_cost_cr?: number | null;
  cumulative_expenditure_cr?: number | null;
  physical_progress_pct?: number | null;
  official_cost_overrun_cr?: number | null;
  official_cost_overrun_pct?: number | null;
  financial_progress_pct?: number | null;
  latest_reported_month?: string | null;
}

export interface MonthlyAnomalyDetail {
  month_key: string;
  anomaly_type: string;
  severity: string;
  expenditure_delta_cr?: number | null;
  progress_delta_pct?: number | null;
  elapsed_months: number;
  description: string;
}

export interface AnomalyIndicator {
  indicator_code: string;
  name: string;
  dimension: string;
  severity: string;
  triggered: boolean;
  observed_value?: any;
  threshold?: any;
  description: string;
}

export interface ProjectAnomalyResponse {
  project_id: string;
  project_name?: string | null;
  sector?: string | null;
  agency?: string | null;
  anomaly_status: 'Normal' | 'Watchlist' | 'Warning' | 'Critical' | 'Indeterminate' | string;
  composite_anomaly_score: number;
  official_financials: OfficialFinancials;
  data_sufficiency: {
    sufficiency: string;
    observations_analyzed: number;
    missing_fields: string[];
    statistical_outliers_applicable: boolean;
  };
  indicators: AnomalyIndicator[];
  monthly_anomalies: MonthlyAnomalyDetail[];
  explanation: string;
  actionable_recommendations: string[];
  disclaimer: string;
}

export interface AssistantClarificationOption {
  project_id: string;
  project_name?: string | null;
  sector?: string | null;
  agency?: string | null;
  latest_reported_progress_pct?: number | null;
}

export interface AIAssistantRequest {
  query: string;
  project_id?: string | null;
  include_analytical_context?: boolean;
  session_id?: string | null;
  reset_session?: boolean;
}

export interface AIAssistantResponse {
  answer: string;
  project_id?: string | null;
  project_name?: string | null;
  latest_reported_month?: string | null;
  official_data_used: Record<string, any>;
  analytical_results_used: Record<string, any>;
  sources_used: string[];
  missing_or_unavailable_data: string[];
  clarification_options?: AssistantClarificationOption[] | null;
  llm_synthesized: boolean;
  session_id?: string | null;
  context_retained: boolean;
  disclaimer: string;
}

export interface SessionResetResponse {
  session_id: string;
  status: string;
  message: string;
}

export interface ReportProjectOverview {
  project_id: string;
  project_name?: string | null;
  sector?: string | null;
  agency?: string | null;
  ministry?: string | null;
  state?: string | null;
  original_cost_cr?: number | null;
  revised_cost_cr?: number | null;
  official_cost_overrun_cr?: number | null;
  official_cost_overrun_pct?: number | null;
  latest_reported_physical_progress_pct?: number | null;
  latest_reported_month?: string | null;
  data_currency: string;
  source_attribution: string;
}

export interface ReportTrajectoryPoint {
  horizon_step: number;
  month_key: string;
  month_label: string;
  predicted_progress_pct: number;
  lower_bound_80_pct: number;
  upper_bound_80_pct: number;
}

export interface ReportProgressAssessment {
  status: string;
  latest_reported_progress_pct?: number | null;
  data_sufficiency?: string | null;
  estimated_monthly_velocity_pct?: number | null;
  forecast_horizon_months?: number | null;
  forecasted_completion_doc?: string | null;
  projected_slippage_months?: number | null;
  trajectory: ReportTrajectoryPoint[];
  assessment_notes: string;
  disclaimer: string;
}

export interface ReportScheduleAssessment {
  status: string;
  risk_level?: string | null;
  risk_score?: number | null;
  official_derived_status?: string | null;
  official_time_overrun_months?: number | null;
  original_doc?: string | null;
  revised_doc?: string | null;
  start_date?: string | null;
  approval_date?: string | null;
  missing_milestones: string[];
  triggered_indicators: string[];
  indicator_details: RiskIndicator[];
  assessment_notes: string;
  disclaimer: string;
}

export interface ReportFinancialAssessment {
  status: string;
  cumulative_expenditure_cr?: number | null;
  revised_cost_cr?: number | null;
  financial_progress_pct?: number | null;
  anomaly_status?: string | null;
  composite_anomaly_score?: number | null;
  triggered_indicators: string[];
  indicator_details: AnomalyIndicator[];
  monthly_anomalies: MonthlyAnomalyDetail[];
  assessment_notes: string;
  disclaimer: string;
}

export interface ReportFollowUpAction {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'ROUTINE' | string;
  category: 'SCHEDULE' | 'FINANCIAL' | 'MILESTONE_AUDIT' | 'DATA_QUALITY' | string;
  action: string;
  rationale: string;
  advisory_notice: string;
}

export interface ExecutiveSummary {
  overall_health: string;
  summary_text: string;
  key_findings: string[];
  primary_risks: string[];
  data_limitations: string[];
}

export interface ProjectExecutiveReportResponse {
  report_id: string;
  project_id: string;
  generated_at: string;
  system_version: string;
  project_overview: ReportProjectOverview;
  progress_assessment: ReportProgressAssessment;
  schedule_assessment: ReportScheduleAssessment;
  financial_assessment: ReportFinancialAssessment;
  executive_summary: ExecutiveSummary;
  recommended_actions: ReportFollowUpAction[];
  general_disclaimer: string;
}
