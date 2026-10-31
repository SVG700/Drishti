"""Progress and Expenditure Anomaly Detection Service for PAIMANA Infrastructure Monitoring."""
from typing import Dict, Any, List, Optional, Tuple
import math
import numpy as np

from .data_loader import data_loader
from .forecast_service import parse_year_month


class AnomalyThresholds:
    """Configurable heuristic thresholds for anomaly detection."""
    def __init__(
        self,
        exp_surge_min_cr: float = 30.0,
        exp_surge_pct_of_cost: float = 5.0,
        exp_surge_max_prog_delta: float = 0.5,
        prog_surge_min_pct: float = 15.0,
        prog_surge_max_exp_delta_cr: float = 0.5,
        budget_exhaustion_fin_min: float = 70.0,
        budget_exhaustion_phys_max: float = 35.0,
        budget_exhaustion_gap_min: float = 40.0,
        exp_breach_min_cr: float = 5.0,
        min_obs_for_outliers: int = 5,
        z_score_threshold: float = 2.5,
    ):
        self.exp_surge_min_cr = exp_surge_min_cr
        self.exp_surge_pct_of_cost = exp_surge_pct_of_cost
        self.exp_surge_max_prog_delta = exp_surge_max_prog_delta
        self.prog_surge_min_pct = prog_surge_min_pct
        self.prog_surge_max_exp_delta_cr = prog_surge_max_exp_delta_cr
        self.budget_exhaustion_fin_min = budget_exhaustion_fin_min
        self.budget_exhaustion_phys_max = budget_exhaustion_phys_max
        self.budget_exhaustion_gap_min = budget_exhaustion_gap_min
        self.exp_breach_min_cr = exp_breach_min_cr
        self.min_obs_for_outliers = min_obs_for_outliers
        self.z_score_threshold = z_score_threshold


class AnomalyDetectionService:
    """Evaluates project expenditure vs physical progress for anomalies and decoupling."""

    def __init__(self, thresholds: Optional[AnomalyThresholds] = None):
        self.thresholds = thresholds or AnomalyThresholds()

    def evaluate_anomalies(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Evaluates progress and expenditure anomalies for a project."""
        if not data_loader.is_loaded:
            data_loader.load_and_validate()

        pid = str(project_id).strip()
        project = data_loader.projects_cache.get(pid)
        if not project:
            return None

        # Official Financial & Progress Data
        orig_cost = project.get("original_cost_cr")
        rev_cost = project.get("revised_cost_cr")
        cum_exp = project.get("cumulative_expenditure_cr")
        raw_prog = project.get("physical_progress_pct")
        official_cost_overrun = project.get("cost_overrun_cr")
        official_cost_overrun_pct = project.get("cost_overrun_pct")
        latest_month = str(project.get("report_month_key") or "2026-03")

        phys_prog = float(raw_prog) if raw_prog is not None and 0.0 <= raw_prog <= 100.0 else None
        
        # Missing fields audit
        missing_fields = []
        if orig_cost is None:
            missing_fields.append("original_cost_cr")
        if rev_cost is None:
            missing_fields.append("revised_cost_cr")
        if cum_exp is None:
            missing_fields.append("cumulative_expenditure_cr")
        if phys_prog is None:
            missing_fields.append("physical_progress_pct")

        # Historical Observations
        history = data_loader.history_by_project.get(pid, [])
        valid_obs = [
            o for o in history
            if o.get("cumulative_expenditure_cr") is not None
            and o.get("physical_progress_pct") is not None
            and 0.0 <= float(o.get("physical_progress_pct")) <= 100.0
        ]
        valid_obs.sort(key=lambda x: str(x.get("report_month_key", "")))
        n_obs = len(valid_obs)

        # Data Sufficiency
        if n_obs >= self.thresholds.min_obs_for_outliers:
            sufficiency = "sufficient"
        elif n_obs >= 2:
            sufficiency = "limited"
        else:
            sufficiency = "insufficient"

        # Financial Progress Calculation (Strictly respecting available budget)
        effective_budget = rev_cost if rev_cost is not None and rev_cost > 0 else orig_cost
        fin_prog_pct = None
        if cum_exp is not None and effective_budget is not None and effective_budget > 0:
            fin_prog_pct = round(float(cum_exp / effective_budget) * 100.0, 2)

        # Tracking anomaly results
        indicators: List[Dict[str, Any]] = []
        monthly_anomalies: List[Dict[str, Any]] = []
        risk_points = 0.0

        # ---------------------------------------------------------
        # Dimension A: Expenditure–Progress Decoupling (Month-over-Month)
        # ---------------------------------------------------------
        exp_surge_count = 0
        prog_surge_count = 0
        largest_exp_surge = 0.0
        largest_prog_surge = 0.0

        if n_obs >= 2:
            for i in range(1, n_obs):
                prev = valid_obs[i - 1]
                curr = valid_obs[i]
                
                prev_m = parse_year_month(str(prev.get("report_month_key")))
                curr_m = parse_year_month(str(curr.get("report_month_key")))
                elapsed = (curr_m - prev_m) if (curr_m and prev_m and curr_m > prev_m) else 1

                exp_prev = float(prev["cumulative_expenditure_cr"])
                exp_curr = float(curr["cumulative_expenditure_cr"])
                p_prev = float(prev["physical_progress_pct"])
                p_curr = float(curr["physical_progress_pct"])

                delta_exp = round(exp_curr - exp_prev, 2)
                delta_p = round(p_curr - p_prev, 2)

                # Normalized monthly equivalent if reports had calendar gaps
                monthly_exp_rate = delta_exp / max(1, elapsed)
                monthly_p_rate = delta_p / max(1, elapsed)

                # Check Pattern 1: Expenditure Surge without physical progress
                is_exp_surge = False
                if delta_exp >= self.thresholds.exp_surge_min_cr and delta_p <= self.thresholds.exp_surge_max_prog_delta:
                    is_exp_surge = True
                elif effective_budget and effective_budget > 0:
                    pct_spent = (delta_exp / effective_budget) * 100.0
                    if pct_spent >= self.thresholds.exp_surge_pct_of_cost and delta_p <= self.thresholds.exp_surge_max_prog_delta:
                        is_exp_surge = True

                if is_exp_surge:
                    exp_surge_count += 1
                    largest_exp_surge = max(largest_exp_surge, delta_exp)
                    sev_str = "HIGH" if delta_exp > 100.0 else "MODERATE"
                    monthly_anomalies.append({
                        "month_key": str(curr.get("report_month_key")),
                        "anomaly_type": "EXPENDITURE_SURGE_WITHOUT_PROGRESS",
                        "severity": sev_str,
                        "expenditure_delta_cr": delta_exp,
                        "progress_delta_pct": delta_p,
                        "elapsed_months": elapsed,
                        "description": (
                            f"Expenditure increased by ₹{delta_exp:,.2f} Cr over {elapsed} month(s) "
                            f"while reported physical progress changed by only {delta_p:.2f}%."
                        ),
                    })

                # Check Pattern 2: Progress Surge without expenditure increase
                if delta_p >= self.thresholds.prog_surge_min_pct and delta_exp <= self.thresholds.prog_surge_max_exp_delta_cr:
                    prog_surge_count += 1
                    largest_prog_surge = max(largest_prog_surge, delta_p)
                    monthly_anomalies.append({
                        "month_key": str(curr.get("report_month_key")),
                        "anomaly_type": "PROGRESS_SURGE_WITHOUT_EXPENDITURE",
                        "severity": "MODERATE",
                        "expenditure_delta_cr": delta_exp,
                        "progress_delta_pct": delta_p,
                        "elapsed_months": elapsed,
                        "description": (
                            f"Physical progress jumped by +{delta_p:.1f}% over {elapsed} month(s) "
                            f"with negligible recorded expenditure (₹{delta_exp:.2f} Cr)."
                        ),
                    })

        # Indicator A1: Expenditure Surge without Progress
        trig_a1 = exp_surge_count > 0
        sev_a1 = "HIGH" if largest_exp_surge > 100.0 or exp_surge_count >= 2 else ("MODERATE" if trig_a1 else "LOW")
        pts_a1 = 0.25 if sev_a1 == "HIGH" else (0.15 if trig_a1 else 0.0)
        risk_points += pts_a1

        indicators.append({
            "indicator_code": "EXPENDITURE_SURGE_NO_PROGRESS",
            "name": "Expenditure Surge Without Progress",
            "dimension": "DECOUPLING",
            "severity": sev_a1,
            "triggered": trig_a1,
            "observed_value": f"{exp_surge_count} event(s), max +₹{largest_exp_surge:.2f} Cr" if trig_a1 else "No decoupling detected",
            "threshold": f"Monthly ΔExp >= ₹{self.thresholds.exp_surge_min_cr} Cr with ΔProg <= {self.thresholds.exp_surge_max_prog_delta}%",
            "description": (
                f"Detected {exp_surge_count} monthly reporting interval(s) where capital expenditure rose sharply without commensurate physical progress."
                if trig_a1 else "Month-over-month expenditure disbursements correlate consistently with physical progress increments."
            ),
        })

        # Indicator A2: Progress Surge without Expenditure
        trig_a2 = prog_surge_count > 0
        sev_a2 = "MODERATE" if trig_a2 else "LOW"
        pts_a2 = 0.10 if trig_a2 else 0.0
        risk_points += pts_a2

        indicators.append({
            "indicator_code": "PROGRESS_SURGE_NO_EXPENDITURE",
            "name": "Progress Advance Without Expenditure",
            "dimension": "DECOUPLING",
            "severity": sev_a2,
            "triggered": trig_a2,
            "observed_value": f"{prog_surge_count} event(s), max +{largest_prog_surge:.1f}%" if trig_a2 else "No decoupling detected",
            "threshold": f"Monthly ΔProg >= {self.thresholds.prog_surge_min_pct}% with ΔExp <= ₹{self.thresholds.prog_surge_max_exp_delta_cr} Cr",
            "description": (
                f"Detected {prog_surge_count} interval(s) with major progress jumps without recorded financial expenditure. Typically reflects contractor credit or delayed milestone invoice booking."
                if trig_a2 else "Physical progress advances are consistently matched by recorded project expenditure."
            ),
        })

        # ---------------------------------------------------------
        # Dimension B: Budget Exhaustion Ahead of Physical Completion
        # ---------------------------------------------------------
        trig_b = False
        sev_b = "LOW"
        pts_b = 0.0
        gap_val = None
        desc_b = "Financial budget drawdown is commensurate with physical progress."

        if fin_prog_pct is not None and phys_prog is not None:
            gap_val = round(fin_prog_pct - phys_prog, 2)
            
            # Critical exhaustion: spent >= 85% with progress < 30%
            if fin_prog_pct >= 85.0 and phys_prog < 30.0:
                trig_b = True
                sev_b = "CRITICAL"
                pts_b = 0.35
                desc_b = (
                    f"Severe capital exhaustion: {fin_prog_pct:.1f}% of budget disbursed "
                    f"while physical progress stands at only {phys_prog:.1f}% (gap: {gap_val:.1f}% points)."
                )
            # High exhaustion: spent >= 70% with progress <= 35% or gap >= 40%
            elif (fin_prog_pct >= self.thresholds.budget_exhaustion_fin_min and phys_prog <= self.thresholds.budget_exhaustion_phys_max) or gap_val >= self.thresholds.budget_exhaustion_gap_min:
                trig_b = True
                sev_b = "HIGH"
                pts_b = 0.25
                desc_b = (
                    f"High budget depletion ahead of physical execution: {fin_prog_pct:.1f}% financial progress "
                    f"versus {phys_prog:.1f}% physical progress (gap: {gap_val:.1f}% points)."
                )
            # Moderate gap: spent >= 50% with gap >= 25% points
            elif fin_prog_pct >= 50.0 and gap_val >= 25.0:
                trig_b = True
                sev_b = "MODERATE"
                pts_b = 0.15
                desc_b = (
                    f"Moderate pacing asymmetry: financial disbursement ({fin_prog_pct:.1f}%) "
                    f"outpaces physical progress ({phys_prog:.1f}%) by {gap_val:.1f}% points."
                )

        indicators.append({
            "indicator_code": "BUDGET_EXHAUSTION_ASYMMETRY",
            "name": "Budget Exhaustion Ahead of Physical Progress",
            "dimension": "BUDGET_EXHAUSTION",
            "severity": sev_b,
            "triggered": trig_b,
            "observed_value": f"Fin: {fin_prog_pct:.1f}%, Phys: {phys_prog:.1f}% (Gap: {gap_val:.1f}%)" if gap_val is not None else None,
            "threshold": f"Fin >= {self.thresholds.budget_exhaustion_fin_min}% and Phys <= {self.thresholds.budget_exhaustion_phys_max}% (Gap >= {self.thresholds.budget_exhaustion_gap_min}%)",
            "description": desc_b,
        })
        risk_points += pts_b

        # ---------------------------------------------------------
        # Dimension C: Cost Overrun & Expenditure Budget Breach
        # ---------------------------------------------------------
        trig_c = False
        sev_c = "LOW"
        pts_c = 0.0
        breach_amount = None
        desc_c = "Cumulative expenditure is within sanctioned budget limits."

        if cum_exp is not None and rev_cost is not None and rev_cost > 0:
            if cum_exp > (rev_cost + self.thresholds.exp_breach_min_cr):
                trig_c = True
                breach_amount = round(cum_exp - rev_cost, 2)
                breach_pct = round((breach_amount / rev_cost) * 100.0, 1)
                
                # Mitigation of double-counting: if budget exhaustion already fired, cap points
                if breach_amount > 50.0 or breach_pct > 10.0:
                    sev_c = "CRITICAL"
                    pts_c = 0.35 if not trig_b else 0.20
                    desc_c = (
                        f"Cumulative expenditure (₹{cum_exp:,.2f} Cr) has breached revised sanctioned cost (₹{rev_cost:,.2f} Cr) "
                        f"by ₹{breach_amount:,.2f} Cr (+{breach_pct}%). This represents actual cash expenditure exceeding approved budget."
                    )
                else:
                    sev_c = "HIGH"
                    pts_c = 0.25 if not trig_b else 0.15
                    desc_c = (
                        f"Cumulative expenditure (₹{cum_exp:,.2f} Cr) exceeds revised sanctioned cost (₹{rev_cost:,.2f} Cr) "
                        f"by ₹{breach_amount:,.2f} Cr (+{breach_pct}%)."
                    )
        elif rev_cost is None:
            desc_c = "Revised sanctioned cost is not published in MoSPI reports; cash budget breach cannot be computed without inferring values."

        indicators.append({
            "indicator_code": "EXPENDITURE_BUDGET_BREACH",
            "name": "Cumulative Expenditure Exceeds Budget",
            "dimension": "COST_OVERRUN",
            "severity": sev_c,
            "triggered": trig_c,
            "observed_value": f"Breach: +₹{breach_amount:,.2f} Cr" if breach_amount is not None else (f"Exp: ₹{cum_exp} Cr vs RevCost: ₹{rev_cost} Cr" if rev_cost else "Revised cost missing"),
            "threshold": f"Cumulative Expenditure > Revised Cost + ₹{self.thresholds.exp_breach_min_cr} Cr",
            "description": desc_c,
        })
        risk_points += pts_c

        # ---------------------------------------------------------
        # Dimension D: Historical Outlier Detection (Z-Score)
        # ---------------------------------------------------------
        trig_d = False
        sev_d = "LOW"
        pts_d = 0.0
        outlier_events = []
        desc_d = "Monthly expenditure and progress variations are within expected statistical bounds."

        if n_obs >= self.thresholds.min_obs_for_outliers:
            exp_diffs = []
            prog_diffs = []
            months_seq = []
            for i in range(1, n_obs):
                e_diff = float(valid_obs[i]["cumulative_expenditure_cr"]) - float(valid_obs[i - 1]["cumulative_expenditure_cr"])
                p_diff = float(valid_obs[i]["physical_progress_pct"]) - float(valid_obs[i - 1]["physical_progress_pct"])
                exp_diffs.append(e_diff)
                prog_diffs.append(p_diff)
                months_seq.append(str(valid_obs[i].get("report_month_key")))

            exp_arr = np.array(exp_diffs)
            prog_arr = np.array(prog_diffs)

            # Compute Z-scores if variance exists
            exp_std = np.std(exp_arr)
            prog_std = np.std(prog_arr)

            if exp_std > 1.0:
                exp_z = (exp_arr - np.mean(exp_arr)) / exp_std
                for idx, z in enumerate(exp_z):
                    if z >= self.thresholds.z_score_threshold:
                        outlier_events.append(f"Month {months_seq[idx]}: Expenditure surge Z-score={z:.1f} (+₹{exp_arr[idx]:.2f} Cr)")

            if prog_std > 1.0:
                prog_z = (prog_arr - np.mean(prog_arr)) / prog_std
                for idx, z in enumerate(prog_z):
                    if z >= self.thresholds.z_score_threshold:
                        outlier_events.append(f"Month {months_seq[idx]}: Progress surge Z-score={z:.1f} (+{prog_arr[idx]:.1f}%)")

            if len(outlier_events) > 0:
                trig_d = True
                sev_d = "MODERATE"
                pts_d = 0.15
                desc_d = f"Statistical outliers detected: {'; '.join(outlier_events)}."
        else:
            desc_d = f"Statistical outlier analysis skipped: requires >= {self.thresholds.min_obs_for_outliers} historical reports (only {n_obs} available)."

        indicators.append({
            "indicator_code": "HISTORICAL_STATISTICAL_OUTLIER",
            "name": "Historical Run-Rate Statistical Outlier",
            "dimension": "STATISTICAL_OUTLIER",
            "severity": sev_d,
            "triggered": trig_d,
            "observed_value": f"{len(outlier_events)} outlier event(s)" if len(outlier_events) > 0 else (f"{n_obs} observations" if n_obs < 5 else "Normal variance"),
            "threshold": f"Z-score >= {self.thresholds.z_score_threshold} on projects with >= {self.thresholds.min_obs_for_outliers} observations",
            "description": desc_d,
        })
        risk_points += pts_d

        # ---------------------------------------------------------
        # Composite Scoring & Categorization
        # ---------------------------------------------------------
        composite_score = round(min(1.0, max(0.0, risk_points)), 2)

        # Handle Insufficient / Missing Data cleanly
        if sufficiency == "insufficient" and cum_exp is None:
            anomaly_status = "Indeterminate"
        elif sev_c == "CRITICAL" or sev_b == "CRITICAL" or composite_score >= 0.70:
            anomaly_status = "Critical"
        elif any(i["severity"] == "HIGH" for i in indicators) or composite_score >= 0.40:
            anomaly_status = "Warning"
        elif any(i["severity"] == "MODERATE" for i in indicators) or composite_score >= 0.15:
            anomaly_status = "Watchlist"
        else:
            anomaly_status = "Normal"

        # ---------------------------------------------------------
        # Narrative Explanation Generation
        # ---------------------------------------------------------
        explanation_parts = [
            f"Project {pid} is classified as '{anomaly_status}' anomaly status (composite score: {composite_score:.2f})."
        ]

        if trig_c:
            explanation_parts.append(
                f"Critical budget overrun: cumulative expenditure (₹{cum_exp:,.2f} Cr) has breached revised sanctioned cost (₹{rev_cost:,.2f} Cr) by ₹{breach_amount:,.2f} Cr."
            )
        elif official_cost_overrun and official_cost_overrun > 0:
            explanation_parts.append(
                f"Official MoSPI reports document an approved cost overrun of ₹{official_cost_overrun:,.2f} Cr (revised cost vs original cost), but expenditure has not breached the revised ceiling."
            )

        if trig_b:
            explanation_parts.append(
                f"Disproportionate budget exhaustion: financial drawdown stands at {fin_prog_pct:.1f}% while physical asset progress is only {phys_prog:.1f}%."
            )

        if trig_a1:
            explanation_parts.append(
                f"Expenditure decoupling: {exp_surge_count} interval(s) demonstrated large financial outlays without physical progress advancement."
            )

        if trig_a2:
            explanation_parts.append(
                f"Progress decoupling: {prog_surge_count} interval(s) reported sudden physical progress increases with zero recorded expenditure."
            )

        if trig_d:
            explanation_parts.append(
                f"Statistical deviations: {len(outlier_events)} month-over-month transitions deviated by >= {self.thresholds.z_score_threshold} standard deviations from the project's own historical velocity."
            )

        if anomaly_status == "Normal":
            explanation_parts.append(
                "Expenditure drawdown, physical milestone delivery, and budget allocations are well-aligned with expected baseline trends."
            )

        if missing_fields:
            explanation_parts.append(
                f"Note: Certain fields are unrecorded in official reports ({', '.join(missing_fields)}); evaluations rely solely on verified reported attributes without synthetic imputation."
            )

        explanation = " ".join(explanation_parts)

        # Actionable Recommendations
        recommendations = []
        if trig_c:
            recommendations.append("Immediate financial audit required: reconcile contractor invoices and verify whether revised administrative sanction has been approved.")
        if trig_b:
            recommendations.append("Conduct physical verification audit to confirm whether reported site progress matches high expenditure disbursements.")
        if trig_a1:
            recommendations.append("Review milestone completion certificates for recent expenditure spikes.")
        if trig_a2:
            recommendations.append("Confirm whether recent progress advances represent contractor credit or catch-up reporting of previously executed work.")
        if anomaly_status == "Normal":
            recommendations.append("Maintain routine quarterly expenditure monitoring.")

        return {
            "project_id": pid,
            "project_name": project.get("project_name"),
            "sector": project.get("sector"),
            "agency": project.get("agency"),
            "anomaly_status": anomaly_status,
            "composite_anomaly_score": composite_score,
            "official_financials": {
                "original_cost_cr": orig_cost,
                "revised_cost_cr": rev_cost,
                "cumulative_expenditure_cr": cum_exp,
                "physical_progress_pct": phys_prog,
                "official_cost_overrun_cr": official_cost_overrun,
                "official_cost_overrun_pct": official_cost_overrun_pct,
                "financial_progress_pct": fin_prog_pct,
                "latest_reported_month": latest_month,
            },
            "data_sufficiency": {
                "sufficiency": sufficiency,
                "observations_analyzed": n_obs,
                "missing_fields": missing_fields,
                "statistical_outliers_applicable": n_obs >= self.thresholds.min_obs_for_outliers,
            },
            "indicators": indicators,
            "monthly_anomalies": monthly_anomalies,
            "explanation": explanation,
            "actionable_recommendations": recommendations,
        }


anomaly_service = AnomalyDetectionService()
