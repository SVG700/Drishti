"""Executive Intelligence Project Report Service for SIH26103 PAIMANA.

Synthesizes data validation, progress forecasting, schedule delay-risk, and expenditure
anomaly detection into a cohesive, deterministic executive intelligence report.
"""
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timezone

from .data_loader import data_loader
from .forecast_service import forecast_service, parse_year_month
from .delay_risk_service import delay_risk_service
from .anomaly_service import anomaly_service


class ReportService:
    """Generates unified executive project intelligence reports."""

    def generate_report(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Synthesizes all analytical modules for a project into a structured executive report."""
        if not data_loader.is_loaded:
            data_loader.load_and_validate()

        pid = str(project_id).strip()
        project = data_loader.projects_cache.get(pid)
        if not project:
            return None

        # -------------------------------------------------------------
        # 1. Official Project Overview & Identity
        # -------------------------------------------------------------
        orig_cost = project.get("original_cost_cr")
        rev_cost = project.get("revised_cost_cr")
        cost_overrun = project.get("cost_overrun_cr")
        cost_overrun_pct = project.get("cost_overrun_pct")
        cum_exp = project.get("cumulative_expenditure_cr")
        raw_prog = project.get("physical_progress_pct")
        phys_prog = float(raw_prog) if raw_prog is not None and 0.0 <= raw_prog <= 100.0 else None
        
        latest_month = str(project.get("report_month_key") or project.get("latest_reported_month") or "2026-03")
        derived_status = project.get("derived_status") or "In Progress"
        is_completed = (derived_status == "Completed") or (phys_prog is not None and phys_prog >= 100.0)

        # Evaluate Data Currency relative to latest dataset snapshot (March 2026)
        if latest_month == "2026-03":
            data_currency = "Current (March 2026 portfolio snapshot)"
        else:
            latest_m_val = parse_year_month(latest_month)
            ref_m_val = parse_year_month("2026-03")
            lag = (ref_m_val - latest_m_val) if (ref_m_val and latest_m_val) else 0
            data_currency = f"Outdated (Last reported {latest_month}; {lag} month(s) behind portfolio snapshot)"

        overview_data = {
            "project_id": pid,
            "project_name": project.get("project_name"),
            "sector": project.get("sector"),
            "agency": project.get("agency"),
            "ministry": project.get("ministry"),
            "state": project.get("state"),
            "original_cost_cr": orig_cost,
            "revised_cost_cr": rev_cost,
            "official_cost_overrun_cr": cost_overrun,
            "official_cost_overrun_pct": cost_overrun_pct,
            "latest_reported_physical_progress_pct": phys_prog,
            "latest_reported_month": latest_month,
            "data_currency": data_currency,
            "source_attribution": "Official MoSPI Central Sector Flash Reports (July 2025 - March 2026)",
        }

        # -------------------------------------------------------------
        # 2. Progress Forecasting Assessment
        # -------------------------------------------------------------
        forecast_res = None
        try:
            forecast_res = forecast_service.get_project_forecast(pid, horizon_months=6)
        except Exception:
            forecast_res = None

        if forecast_res:
            traj_raw = forecast_res.get("trajectory", [])
            trajectory_data = [
                {
                    "horizon_step": pt.get("horizon_step", idx + 1),
                    "month_key": pt.get("month_key") or pt.get("forecast_month_key", ""),
                    "month_label": pt.get("month_label", ""),
                    "predicted_progress_pct": float(pt.get("predicted_progress_pct", 0.0)),
                    "lower_bound_80_pct": float(pt.get("lower_bound_80_pct", 0.0)),
                    "upper_bound_80_pct": float(pt.get("upper_bound_80_pct", 0.0)),
                }
                for idx, pt in enumerate(traj_raw)
            ]
            meta = forecast_res.get("model_metadata", {})
            f_doc = forecast_res.get("forecasted_completion_doc")
            f_slippage = forecast_res.get("projected_slippage_months")
            f_velocity = meta.get("estimated_monthly_velocity_pct")
            f_suff = forecast_res.get("data_sufficiency", "sufficient")
            
            if is_completed:
                f_notes = f"Project is 100% complete / commissioned. Forecast trajectory is capped at full completion."
                f_status = "Available"
            elif f_velocity is not None and f_velocity > 0:
                f_notes = (
                    f"Adaptive run-rate velocity estimated at {f_velocity:.2f}%/month. "
                    f"Model-projected commissioning: {f_doc}."
                )
                if f_slippage is not None and f_slippage > 0:
                    f_notes += f" Inferred schedule slippage: +{f_slippage:.1f} months beyond official target."
                f_status = "Available"
            else:
                f_notes = "Progress run-rate velocity is near zero or stalled; extrapolation indicates prolonged completion horizon."
                f_status = "Available" if traj_raw else "Limited Data"

            progress_data = {
                "status": f_status,
                "latest_reported_progress_pct": phys_prog,
                "data_sufficiency": f_suff,
                "estimated_monthly_velocity_pct": f_velocity,
                "forecast_horizon_months": len(trajectory_data),
                "forecasted_completion_doc": f_doc,
                "projected_slippage_months": f_slippage,
                "trajectory": trajectory_data,
                "assessment_notes": f_notes,
                "disclaimer": "Progress forecasts are model-generated projections based on historical run-rates; they do not represent official government commitments or targets.",
            }
        else:
            progress_data = {
                "status": "Unavailable",
                "latest_reported_progress_pct": phys_prog,
                "data_sufficiency": "insufficient",
                "estimated_monthly_velocity_pct": None,
                "forecast_horizon_months": None,
                "forecasted_completion_doc": None,
                "projected_slippage_months": None,
                "trajectory": [],
                "assessment_notes": "Progress forecasting model unavailable due to missing or insufficient historical reports.",
                "disclaimer": "Progress forecasts are model-generated projections based on historical run-rates; they do not represent official government commitments or targets.",
            }

        # -------------------------------------------------------------
        # 3. Schedule & Delay Risk Assessment
        # -------------------------------------------------------------
        delay_res = None
        try:
            delay_res = delay_risk_service.evaluate_delay_risk(pid)
        except Exception:
            delay_res = None

        if delay_res:
            sched = delay_res.get("official_schedule", {})
            orig_doc = sched.get("original_doc")
            rev_doc = sched.get("revised_doc")
            start_date = sched.get("start_date")
            approval_date = sched.get("approval_date")
            time_overrun = sched.get("official_time_overrun_months")
            derived_stat = sched.get("official_derived_status") or derived_status

            missing_milestones = []
            if not orig_doc:
                missing_milestones.append("original_doc")
            if not rev_doc:
                missing_milestones.append("revised_doc")
            if not start_date:
                missing_milestones.append("start_date")

            risk_ind_list = delay_res.get("risk_indicators", [])
            triggered_risk_codes = [i["indicator_code"] for i in risk_ind_list if i.get("triggered")]
            indicator_details = [
                {
                    "indicator_code": i["indicator_code"],
                    "name": i["name"],
                    "severity": i["severity"],
                    "triggered": i["triggered"],
                    "observed_value": i.get("observed_value"),
                    "threshold": i.get("threshold"),
                    "description": i.get("description", ""),
                }
                for i in risk_ind_list
            ]

            schedule_data = {
                "status": "Available" if not missing_milestones else "Incomplete Dates",
                "risk_level": delay_res.get("risk_level"),
                "risk_score": delay_res.get("risk_score"),
                "official_derived_status": derived_stat,
                "official_time_overrun_months": time_overrun,
                "original_doc": orig_doc,
                "revised_doc": rev_doc,
                "start_date": start_date,
                "approval_date": approval_date,
                "missing_milestones": missing_milestones,
                "triggered_indicators": triggered_risk_codes,
                "indicator_details": indicator_details,
                "assessment_notes": delay_res.get("explanation", ""),
                "disclaimer": "Delay risk levels and inferred slippage reflect analytical run-rate modeling and are distinct from official MoSPI delay classifications.",
            }
        else:
            schedule_data = {
                "status": "Unavailable",
                "risk_level": "Indeterminate",
                "risk_score": None,
                "official_derived_status": derived_status,
                "official_time_overrun_months": None,
                "original_doc": None,
                "revised_doc": None,
                "start_date": None,
                "approval_date": None,
                "missing_milestones": ["schedule_records_unavailable"],
                "triggered_indicators": [],
                "indicator_details": [],
                "assessment_notes": "Schedule delay evaluation could not be completed for this project.",
                "disclaimer": "Delay risk levels and inferred slippage reflect analytical run-rate modeling and are distinct from official MoSPI delay classifications.",
            }

        # -------------------------------------------------------------
        # 4. Financial & Anomaly Assessment
        # -------------------------------------------------------------
        anomaly_res = None
        try:
            anomaly_res = anomaly_service.evaluate_anomalies(pid)
        except Exception:
            anomaly_res = None

        if anomaly_res:
            fin = anomaly_res.get("official_financials", {})
            fin_prog = fin.get("financial_progress_pct")
            anom_indicators = anomaly_res.get("indicators", [])
            triggered_anom_codes = [i["indicator_code"] for i in anom_indicators if i.get("triggered")]
            anom_details = [
                {
                    "indicator_code": i["indicator_code"],
                    "name": i["name"],
                    "dimension": i["dimension"],
                    "severity": i["severity"],
                    "triggered": i["triggered"],
                    "observed_value": i.get("observed_value"),
                    "threshold": i.get("threshold"),
                    "description": i.get("description", ""),
                }
                for i in anom_indicators
            ]
            monthly_anoms = [
                {
                    "month_key": m.get("month_key"),
                    "anomaly_type": m.get("anomaly_type"),
                    "severity": m.get("severity"),
                    "expenditure_delta_cr": m.get("expenditure_delta_cr"),
                    "progress_delta_pct": m.get("progress_delta_pct"),
                    "elapsed_months": m.get("elapsed_months", 1),
                    "description": m.get("description", ""),
                }
                for m in anomaly_res.get("monthly_anomalies", [])
            ]

            fin_status = "Available" if (orig_cost is not None or rev_cost is not None) else "Missing Financial Data"

            financial_data = {
                "status": fin_status,
                "cumulative_expenditure_cr": cum_exp,
                "revised_cost_cr": rev_cost,
                "financial_progress_pct": fin_prog,
                "anomaly_status": anomaly_res.get("anomaly_status"),
                "composite_anomaly_score": anomaly_res.get("composite_anomaly_score"),
                "triggered_indicators": triggered_anom_codes,
                "indicator_details": anom_details,
                "monthly_anomalies": monthly_anoms,
                "assessment_notes": anomaly_res.get("explanation", ""),
                "disclaimer": "Anomaly alerts identify statistical decoupling for audit verification; they do not assert fraud, corruption, or contractual wrongdoing.",
            }
        else:
            financial_data = {
                "status": "Unavailable",
                "cumulative_expenditure_cr": cum_exp,
                "revised_cost_cr": rev_cost,
                "financial_progress_pct": None,
                "anomaly_status": "Indeterminate",
                "composite_anomaly_score": None,
                "triggered_indicators": [],
                "indicator_details": [],
                "monthly_anomalies": [],
                "assessment_notes": "Financial and anomaly evaluation unavailable for this project.",
                "disclaimer": "Anomaly alerts identify statistical decoupling for audit verification; they do not assert fraud, corruption, or contractual wrongdoing.",
            }

        # -------------------------------------------------------------
        # 5. Synthesize Executive Summary
        # -------------------------------------------------------------
        r_level = schedule_data.get("risk_level")
        a_status = financial_data.get("anomaly_status")

        if is_completed:
            overall_health = "Good"
        elif r_level == "Critical" or a_status == "Critical":
            overall_health = "Critical Concern"
        elif r_level == "High" or a_status == "Warning":
            overall_health = "High Risk"
        elif r_level == "Moderate" or a_status == "Watchlist":
            overall_health = "Watchlist"
        elif r_level == "Indeterminate" and a_status == "Indeterminate":
            overall_health = "Indeterminate"
        elif phys_prog is not None and phys_prog >= 60.0:
            overall_health = "Good"
        else:
            overall_health = "Satisfactory"

        key_findings = []
        # Finding: Physical completion
        if phys_prog is not None:
            key_findings.append(f"Physical progress stands at {phys_prog:.1f}% as of {latest_month} (Status: {derived_status}).")
        else:
            key_findings.append(f"Physical progress percentage is not recorded in available MoSPI reports.")

        # Finding: Financial progress & expenditure
        if cum_exp is not None:
            if fin_prog is not None:
                key_findings.append(f"Cumulative expenditure reached ₹{cum_exp:.2f} Cr, representing {fin_prog:.1f}% financial budget utilization.")
            else:
                key_findings.append(f"Cumulative expenditure reached ₹{cum_exp:.2f} Cr; financial progress could not be calculated due to missing cost ceiling.")

        # Finding: Schedule position
        overrun_m = schedule_data.get("official_time_overrun_months")
        if overrun_m is not None and overrun_m > 0:
            key_findings.append(f"Official reports document an accumulated schedule time overrun of {overrun_m:.1f} months.")
        elif schedule_data.get("revised_doc"):
            key_findings.append(f"Projected target commissioning date is {schedule_data.get('revised_doc')}.")

        # Finding: Cost Overrun
        if cost_overrun is not None and cost_overrun > 0:
            key_findings.append(f"Official administrative cost revision has increased budget by +₹{cost_overrun:.2f} Cr (+{cost_overrun_pct:.1f}%).")

        # Compile Primary Risks from triggered indicators
        primary_risks = []
        for ind in schedule_data.get("indicator_details", []):
            if ind.get("triggered"):
                primary_risks.append(f"[Schedule] {ind['name']}: {ind['description']}")

        for ind in financial_data.get("indicator_details", []):
            if ind.get("triggered"):
                primary_risks.append(f"[Financial] {ind['name']}: {ind['description']}")

        if not primary_risks:
            primary_risks.append("No critical schedule delays, budget exhaustion, or expenditure decoupling indicators triggered.")

        # Explicit Data Limitations
        data_limitations = []
        if schedule_data.get("missing_milestones"):
            data_limitations.append(
                f"Missing milestone schedule dates: {', '.join(schedule_data['missing_milestones'])}."
            )
        if orig_cost is None or rev_cost is None:
            data_limitations.append("Sanctioned budget baseline (original or revised cost) is missing from official records.")
        if progress_data.get("data_sufficiency") != "sufficient":
            data_limitations.append(
                f"Historical observation depth is limited ({progress_data.get('data_sufficiency')}), which constrains statistical outlier confidence."
            )
        if "Outdated" in data_currency:
            data_limitations.append(f"Reporting timeliness: {data_currency}.")
        data_limitations.append(
            "External operational contingencies (land acquisition, right-of-way disputes, environmental clearances) are not captured in quantitative flash reports."
        )

        # High-level narrative summary
        summary_sentences = [
            f"Project {pid} ('{project.get('project_name')}') under the {project.get('sector')} sector is assessed at '{overall_health}' status.",
            f"Physical execution is at {phys_prog if phys_prog is not None else 'N/A'}% against an expenditure of ₹{cum_exp if cum_exp is not None else 'N/A'} Cr.",
        ]
        if primary_risks and "No critical" not in primary_risks[0]:
            summary_sentences.append(f"Key areas of concern include {len(primary_risks)} active risk and anomaly indicator(s).")
        else:
            summary_sentences.append("Execution is progressing without detected statistical anomalies or acute delay signals.")
        summary_text = " ".join(summary_sentences)

        executive_summary = {
            "overall_health": overall_health,
            "summary_text": summary_text,
            "key_findings": key_findings,
            "primary_risks": primary_risks,
            "data_limitations": data_limitations,
        }

        # -------------------------------------------------------------
        # 6. Structured Follow-up Actions
        # -------------------------------------------------------------
        actions: List[Dict[str, Any]] = []

        # Action 1: Cash budget breach
        if "EXPENDITURE_BUDGET_BREACH" in financial_data.get("triggered_indicators", []):
            actions.append({
                "priority": "CRITICAL",
                "category": "FINANCIAL",
                "action": "Initiate comprehensive financial audit and verify revised administrative sanction approvals.",
                "rationale": "Cumulative cash expenditure has exceeded the authorized revised cost ceiling.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 2: Budget exhaustion asymmetry
        if "BUDGET_EXHAUSTION_ASYMMETRY" in financial_data.get("triggered_indicators", []):
            actions.append({
                "priority": "CRITICAL",
                "category": "FINANCIAL",
                "action": "Conduct milestone reconciliation to align capital disbursements with certified site deliverables.",
                "rationale": "Financial budget drawdown significantly outpaces verified physical execution progress.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 3: Schedule time overrun
        if "OFFICIAL_TIME_OVERRUN" in schedule_data.get("triggered_indicators", []) or "PAST_COMMISSIONING_DATE" in schedule_data.get("triggered_indicators", []):
            actions.append({
                "priority": "HIGH",
                "category": "SCHEDULE",
                "action": "Request revised critical path schedule and milestone recovery plan from the executing agency.",
                "rationale": "Project is operating with an accumulated schedule time overrun or past its target commissioning deadline.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 4: Progress stagnation
        if "PROGRESS_STAGNATION" in schedule_data.get("triggered_indicators", []):
            actions.append({
                "priority": "HIGH",
                "category": "MILESTONE_AUDIT",
                "action": "Deploy site inspection team to investigate causes of physical milestone stagnation.",
                "rationale": "Reported physical progress has remained completely static across 3 or more consecutive reporting cycles.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 5: Expenditure surge without progress
        if "EXPENDITURE_SURGE_NO_PROGRESS" in financial_data.get("triggered_indicators", []):
            actions.append({
                "priority": "MEDIUM",
                "category": "FINANCIAL",
                "action": "Verify contractor invoice measurement book entries for recent capital disbursement spikes.",
                "rationale": "Unusual expenditure surges were recorded without commensurate recorded progress advancement.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 6: Progress surge without expenditure
        if "PROGRESS_SURGE_NO_EXPENDITURE" in financial_data.get("triggered_indicators", []):
            actions.append({
                "priority": "MEDIUM",
                "category": "MILESTONE_AUDIT",
                "action": "Cross-reference reported progress increments against physical milestone handovers and pending billing entries.",
                "rationale": "Substantial physical progress advancement was reported with negligible recorded capital expenditure.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 7: Missing baseline data
        if schedule_data.get("missing_milestones") or orig_cost is None:
            actions.append({
                "priority": "MEDIUM",
                "category": "DATA_QUALITY",
                "action": "Direct the Project Management Unit (PMU) to update missing baseline cost and milestone dates in PAIMANA.",
                "rationale": "Missing baseline schedule or sanctioned cost fields impede comprehensive analytical oversight.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Action 8: Routine monitoring if no critical issues
        if not actions:
            actions.append({
                "priority": "ROUTINE",
                "category": "MILESTONE_AUDIT",
                "action": "Maintain routine quarterly physical milestone and expenditure tracking.",
                "rationale": "Project performance indicators are currently operating within normal baseline variance.",
                "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive.",
            })

        # Report Metadata
        report_id = f"REP-{pid}-{latest_month}-{str(uuid.uuid4())[:8].upper()}"
        generated_at = datetime.now(timezone.utc).isoformat()

        return {
            "report_id": report_id,
            "project_id": pid,
            "generated_at": generated_at,
            "system_version": "PAIMANA-AI-v1.0",
            "project_overview": overview_data,
            "progress_assessment": progress_data,
            "schedule_assessment": schedule_data,
            "financial_assessment": financial_data,
            "executive_summary": executive_summary,
            "recommended_actions": actions,
            "general_disclaimer": "This automated executive intelligence report is generated for senior infrastructure monitoring and decision support. Official figures originate directly from MoSPI Flash Reports. All forecasts, risk scores, and anomaly alerts are statistical heuristics and must be cross-referenced with official project documentation.",
        }


report_service = ReportService()
