"""Project Delay Detection Service for PAIMANA Infrastructure Monitoring."""
from typing import Dict, Any, List, Optional
import math
from datetime import datetime

from .data_loader import data_loader
from .forecast_service import forecast_service

# Fallback reporting month in case metadata is uninitialized
DEFAULT_LATEST_MONTH = "2026-03"


def parse_year_month(ym_str: Optional[str]) -> Optional[int]:
    """Converts 'YYYY-MM' into total months from year 0 for exact calendar arithmetic."""
    if not ym_str or not isinstance(ym_str, str):
        return None
    try:
        parts = ym_str.strip().split("-")
        if len(parts) >= 2:
            return int(parts[0]) * 12 + int(parts[1])
    except Exception:
        return None
    return None


class DelayRiskService:
    """Evaluates project delay risks combining official figures and inferred run-rate patterns."""

    def evaluate_delay_risk(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Evaluates delay risk and stagnation indicators for a project."""
        if not data_loader.is_loaded:
            data_loader.load_and_validate()

        pid = str(project_id).strip()
        project = data_loader.projects_cache.get(pid)
        if not project:
            return None

        history = data_loader.history_by_project.get(pid, [])
        valid_obs = [
            o for o in history
            if o.get("physical_progress_pct") is not None and 0.0 <= o.get("physical_progress_pct", -1) <= 100.0
        ]
        valid_obs.sort(key=lambda x: str(x.get("report_month_key", "")))
        n_obs = len(valid_obs)

        # Official Metrics
        orig_doc = project.get("original_doc")
        rev_doc = project.get("revised_doc")
        approval_date = project.get("approval_date")
        start_date = project.get("start_date")
        official_time_overrun = project.get("time_overrun_months")
        derived_status = project.get("derived_status") or "Unknown"

        raw_prog = project.get("physical_progress_pct")
        latest_progress = float(raw_prog) if raw_prog is not None and 0.0 <= raw_prog <= 100.0 else 0.0
        
        # Ground latest report month in loaded PAIMANA dataset metadata, never machine clock
        dataset_coverage_end = data_loader.quality_summary.get("coverage_end") or DEFAULT_LATEST_MONTH
        latest_month = str(project.get("report_month_key") or dataset_coverage_end)

        # Check if project is already concluded
        is_completed = (latest_progress >= 100.0) or (derived_status.lower() in ("completed", "commissioned"))

        # 1. Trailing Stagnation Analysis (Accounting for calendar months)
        trailing_stagnant_count = 0
        if n_obs >= 2 and not is_completed:
            diffs = []
            for i in range(1, n_obs):
                prev_val = float(valid_obs[i - 1]["physical_progress_pct"])
                curr_val = float(valid_obs[i]["physical_progress_pct"])
                diffs.append(round(curr_val - prev_val, 3))

            # Count consecutive zeroes from the tail backwards
            for d in reversed(diffs):
                if d == 0.0:
                    trailing_stagnant_count += 1
                else:
                    break

        is_prolonged_stagnation = (trailing_stagnant_count >= 3) and (latest_progress < 98.0) and not is_completed

        # 2. Forecasting Integration (Separate from official dates)
        try:
            forecast_res = forecast_service.get_project_forecast(pid, horizon_months=12)
        except Exception:
            forecast_res = None

        model_velocity = None
        model_forecasted_doc = None
        inferred_slippage_months = None

        if forecast_res:
            meta = forecast_res.get("model_metadata", {})
            model_velocity = meta.get("estimated_monthly_velocity_pct")
            model_forecasted_doc = forecast_res.get("forecasted_completion_doc")
            inferred_slippage_months = forecast_res.get("projected_slippage_months")

        # 3. Data Sufficiency Classification
        if n_obs >= 4:
            sufficiency = "sufficient"
        elif n_obs >= 2:
            sufficiency = "limited"
        else:
            sufficiency = "insufficient"

        # 4. Evaluate Structured Risk Indicators
        indicators: List[Dict[str, Any]] = []
        risk_points = 0.0

        # Indicator A: Official Reported Schedule Overrun
        has_official_overrun = (
            official_time_overrun is not None and float(official_time_overrun) > 0.0
        ) or derived_status.lower() == "delayed"

        overrun_val = float(official_time_overrun) if official_time_overrun is not None else 0.0
        
        if is_completed:
            severity_a = "INFO"
            pts_a = 0.0
            desc_a = f"Project completed. Historical time overrun of {overrun_val:.1f} months was recorded during execution." if overrun_val > 0 else "Project completed with no reported schedule overrun."
        elif overrun_val > 24.0:
            severity_a = "CRITICAL"
            pts_a = 0.40
            desc_a = f"Major official schedule overrun of {overrun_val:.1f} months recorded in MoSPI reports."
        elif overrun_val > 6.0:
            severity_a = "HIGH"
            pts_a = 0.30
            desc_a = f"Official schedule delay of {overrun_val:.1f} months recorded in MoSPI reports."
        elif overrun_val > 0.0:
            severity_a = "MODERATE"
            pts_a = 0.15
            desc_a = f"Minor official schedule overrun of {overrun_val:.1f} months reported."
        else:
            severity_a = "LOW"
            pts_a = 0.0
            desc_a = "No official schedule overrun reported."

        indicators.append({
            "indicator_code": "OFFICIAL_TIME_OVERRUN",
            "name": "Official MoSPI Schedule Overrun",
            "severity": severity_a,
            "triggered": has_official_overrun and not is_completed,
            "description": desc_a,
            "observed_value": overrun_val if official_time_overrun is not None else None,
            "threshold": "> 0 months",
        })
        risk_points += pts_a

        # Indicator B: Past Commissioning Date (Target date elapsed without completion)
        latest_m_idx = parse_year_month(latest_month)
        has_revised_doc = bool(rev_doc)
        effective_doc = rev_doc if has_revised_doc else orig_doc
        doc_idx = parse_year_month(effective_doc)
        
        is_past_doc = False
        desc_b = "Current reporting date is within target commissioning schedule."
        sev_b = "LOW"
        pts_b = 0.0

        if is_completed:
            sev_b = "INFO"
            desc_b = "Project is physically complete / commissioned; deadline tracking concluded."
        elif doc_idx and latest_m_idx and (doc_idx < latest_m_idx) and (latest_progress < 98.0):
            is_past_doc = True
            months_past = latest_m_idx - doc_idx
            
            if has_revised_doc:
                if latest_progress < 80.0:
                    sev_b = "CRITICAL"
                    pts_b = 0.40
                    desc_b = f"Anticipated commissioning deadline ({rev_doc}) has passed by {months_past} month(s) with only {latest_progress:.1f}% completed."
                else:
                    sev_b = "HIGH"
                    pts_b = 0.25
                    desc_b = f"Project is {months_past} month(s) past revised commissioning date ({rev_doc}), but near completion ({latest_progress:.1f}%)."
            else:
                # Revised DOC is missing in reports; evaluating against original DOC without score double-inflation
                if has_official_overrun:
                    sev_b = "MODERATE"
                    pts_b = 0.15
                    desc_b = f"Original target ({orig_doc}) passed by {months_past} month(s); schedule delay is officially declared and revised DOC is unrecorded."
                else:
                    sev_b = "HIGH"
                    pts_b = 0.35
                    desc_b = f"Original target ({orig_doc}) passed by {months_past} month(s) without published revised schedule."

        indicators.append({
            "indicator_code": "PAST_COMMISSIONING_DATE",
            "name": "Past Commissioning Date",
            "severity": sev_b,
            "triggered": is_past_doc,
            "description": desc_b,
            "observed_value": effective_doc,
            "threshold": f"Commissioning Date < {latest_month} and Progress < 98%",
        })
        risk_points += pts_b

        # Indicator C: Progress Stagnation (Carefully avoiding 1-month false alarms)
        if is_completed or latest_progress >= 98.0:
            sev_c = "INFO"
            trig_c = False
            pts_c = 0.0
            desc_c = "Project is completed or substantially complete (>98%); progress plateaus are expected at handover/testing."
        elif trailing_stagnant_count >= 4:
            sev_c = "HIGH"
            trig_c = True
            pts_c = 0.25
            desc_c = f"Severe progress stagnation: {trailing_stagnant_count} consecutive monthly reports with 0.0% physical progress change."
        elif trailing_stagnant_count == 3:
            sev_c = "MODERATE"
            trig_c = True
            pts_c = 0.15
            desc_c = "Prolonged progress stagnation: 3 consecutive monthly reports with zero progress advancement."
        elif trailing_stagnant_count in (1, 2):
            sev_c = "LOW"
            trig_c = False
            pts_c = 0.0
            desc_c = f"Progress unchanged for {trailing_stagnant_count} month(s). Normal in periodic inspection and billing cycles; not flagged as a delay."
        else:
            sev_c = "LOW"
            trig_c = False
            pts_c = 0.0
            desc_c = "Recent monthly progress continues to advance actively."

        indicators.append({
            "indicator_code": "PROGRESS_STAGNATION",
            "name": "Prolonged Progress Stagnation",
            "severity": sev_c,
            "triggered": trig_c,
            "description": desc_c,
            "observed_value": trailing_stagnant_count,
            "threshold": ">= 3 consecutive months of 0.0% change (incomplete projects)",
        })
        risk_points += pts_c

        # Indicator D: Inferred Schedule Slippage (Model Forecast vs Official Target)
        trig_d = False
        sev_d = "LOW"
        pts_d = 0.0
        desc_d = "Model forecast completion aligns with or precedes official revised date."

        if is_completed:
            sev_d = "INFO"
            desc_d = "Project already completed; run-rate projection concluded."
        elif inferred_slippage_months is not None:
            if inferred_slippage_months > 12.0:
                trig_d = True
                sev_d = "HIGH"
                pts_d = 0.20
                desc_d = f"Run-rate model projects completion {inferred_slippage_months:.1f} months past official revised target."
            elif inferred_slippage_months > 3.0:
                trig_d = True
                sev_d = "MODERATE"
                pts_d = 0.10
                desc_d = f"Run-rate model projects completion {inferred_slippage_months:.1f} months beyond official target."
        elif model_forecasted_doc and "Stalled" in str(model_forecasted_doc) and latest_progress < 90.0:
            trig_d = True
            sev_d = "HIGH"
            pts_d = 0.25
            desc_d = "Historical run-rate velocity is near zero (<0.05%/month), projecting indeterminate completion."

        indicators.append({
            "indicator_code": "MODEL_INFERRED_SLIPPAGE",
            "name": "Model Inferred Schedule Slippage",
            "severity": sev_d,
            "triggered": trig_d,
            "description": desc_d,
            "observed_value": f"{inferred_slippage_months:.1f} months" if inferred_slippage_months is not None else str(model_forecasted_doc),
            "threshold": "Projected slippage > 3.0 months beyond official revised DOC",
        })
        risk_points += pts_d

        # Indicator E: Missing Key Dates
        missing_dates = []
        if not orig_doc:
            missing_dates.append("Original DOC")
        if not rev_doc:
            missing_dates.append("Revised DOC")
        if not start_date:
            missing_dates.append("Start Date")

        trig_e = len(missing_dates) > 0 and not is_completed
        desc_e = f"Missing schedule milestones: {', '.join(missing_dates)}." if trig_e else "All official milestone dates are documented."

        indicators.append({
            "indicator_code": "MISSING_MILESTONE_DATES",
            "name": "Missing Schedule Dates",
            "severity": "INFO" if not trig_e else "LOW",
            "triggered": trig_e,
            "description": desc_e,
            "observed_value": missing_dates,
            "threshold": "All core dates (Start, Original DOC, Revised DOC) present",
        })

        # Calculate final composite risk score (0.0 to 1.0)
        risk_score = round(min(1.0, max(0.0, risk_points)), 2)

        # Categorize Overall Risk Level (Calibrated composite thresholds)
        if is_completed:
            risk_level = "Low"
            risk_score = 0.0
        elif sufficiency == "insufficient" and not has_official_overrun and not is_past_doc:
            risk_level = "Indeterminate"
        elif risk_score >= 0.70 or (overrun_val > 24.0 and not is_completed) or (is_past_doc and latest_progress < 80.0 and has_revised_doc):
            risk_level = "Critical"
        elif risk_score >= 0.40 or (overrun_val > 6.0 and not is_completed) or is_prolonged_stagnation:
            risk_level = "High"
        elif risk_score >= 0.15 or (overrun_val > 0.0 and not is_completed) or trailing_stagnant_count == 3:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        # Generate Transparent Explanation
        explanation_parts = []
        if is_completed:
            explanation_parts.append(
                f"Project {pid} is physically complete / commissioned (progress: {latest_progress:.1f}%, status: {derived_status}). No active schedule delay risk remains."
            )
            if overrun_val > 0.0:
                explanation_parts.append(
                    f"Official MoSPI reports document that project execution required a total time overrun of {overrun_val:.1f} months prior to completion."
                )
        else:
            explanation_parts.append(
                f"Project {pid} is classified as '{risk_level}' delay risk (composite score: {risk_score:.2f})."
            )

            if has_official_overrun:
                explanation_parts.append(
                    f"Official MoSPI reports document a time overrun of {overrun_val:.1f} months (status: {derived_status})."
                )
            else:
                explanation_parts.append(
                    f"Official MoSPI reports do not declare a schedule delay (status: {derived_status})."
                )

            if is_past_doc:
                target_label = "revised" if has_revised_doc else "original"
                explanation_parts.append(
                    f"The scheduled {target_label} commissioning deadline ({effective_doc}) has already elapsed while physical progress stands at {latest_progress:.1f}%."
                )

            if is_prolonged_stagnation:
                explanation_parts.append(
                    f"Progress has stalled across {trailing_stagnant_count} consecutive monthly reports."
                )
            elif trailing_stagnant_count in (1, 2) and latest_progress < 98.0:
                explanation_parts.append(
                    f"Progress is unchanged for {trailing_stagnant_count} month(s), which is common in periodic inspection intervals and not considered a delay."
                )

            if inferred_slippage_months is not None and inferred_slippage_months > 3.0:
                explanation_parts.append(
                    f"The run-rate forecasting model projects that completing remaining work will require {inferred_slippage_months:.1f} additional months beyond the official revised date ({rev_doc})."
                )

            if sufficiency != "sufficient":
                explanation_parts.append(
                    f"Note: Historical data depth is '{sufficiency}' ({n_obs} reports analyzed); model inference incorporates sector prior velocity."
                )

        explanation = " ".join(explanation_parts)

        # Actionable Recommendations
        recommendations = []
        if is_completed:
            recommendations.append("Project execution concluded; close out final financial expenditure reconciliations.")
        else:
            if risk_level in ("Critical", "High"):
                recommendations.append("Initiate on-site progress audit to identify bottlenecks (land acquisition, clearances, contractor cashflow).")
                recommendations.append("Require implementing agency to submit a revised catch-up schedule.")
            if is_prolonged_stagnation:
                recommendations.append(f"Investigate cause of zero physical progress advancement over the last {trailing_stagnant_count} months.")
            if trig_e and "Revised DOC" in missing_dates:
                recommendations.append("Request administrative ministry to publish an updated Anticipated Date of Commissioning (DOC).")
            if risk_level == "Low":
                recommendations.append("Maintain routine monthly milestone monitoring.")

        return {
            "project_id": pid,
            "project_name": project.get("project_name"),
            "sector": project.get("sector"),
            "agency": project.get("agency"),
            "risk_level": risk_level,
            "risk_score": risk_score,
            "official_schedule": {
                "approval_date": approval_date,
                "start_date": start_date,
                "original_doc": orig_doc,
                "revised_doc": rev_doc,
                "official_time_overrun_months": official_time_overrun,
                "official_derived_status": derived_status,
                "latest_reported_progress_pct": latest_progress,
                "latest_reported_month": latest_month,
            },
            "model_inferred": {
                "data_sufficiency": sufficiency,
                "observations_analyzed": n_obs,
                "trailing_stagnant_months": trailing_stagnant_count,
                "is_prolonged_stagnation": is_prolonged_stagnation,
                "estimated_monthly_velocity_pct": model_velocity,
                "model_forecasted_doc": model_forecasted_doc,
                "inferred_slippage_months": inferred_slippage_months,
            },
            "risk_indicators": indicators,
            "explanation": explanation,
            "actionable_recommendations": recommendations,
        }


delay_risk_service = DelayRiskService()
