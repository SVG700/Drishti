"""Chronological train/test benchmark on valid physical progress series."""
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple

backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def prepare_benchmark_data(csv_path: Path) -> Tuple[pd.DataFrame, List[str]]:
    df = pd.read_csv(csv_path, dtype={"project_id": str})
    df["project_id"] = df["project_id"].astype(str).str.strip()
    df["physical_progress_pct"] = pd.to_numeric(df["physical_progress_pct"], errors="coerce")
    
    # Filter to valid physical progress range: 0.0 to 100.0%
    df = df[(df["physical_progress_pct"] >= 0.0) & (df["physical_progress_pct"] <= 100.0)]
    df = df.dropna(subset=["physical_progress_pct", "report_month_key"])
    df = df.sort_values(by=["project_id", "report_month_key"])

    months = sorted(df["report_month_key"].unique())
    return df, months


def evaluate_models():
    csv_path = backend_root / "datasets" / "paimana_history.csv"
    df, months = prepare_benchmark_data(csv_path)

    print(f"Chronological Months available: {months}")
    train_cutoff = "2026-01"
    target_month_1 = "2026-02"
    target_month_2 = "2026-03"

    train_df = df[df["report_month_key"] <= train_cutoff]
    test_df_1 = df[df["report_month_key"] == target_month_1].set_index("project_id")["physical_progress_pct"]
    test_df_2 = df[df["report_month_key"] == target_month_2].set_index("project_id")["physical_progress_pct"]

    common_pids_1 = sorted(list(set(train_df["project_id"]).intersection(set(test_df_1.index))))
    common_pids_2 = sorted(list(set(train_df["project_id"]).intersection(set(test_df_2.index))))

    print(f"Projects with valid history through {train_cutoff} and observed in {target_month_1}: {len(common_pids_1)}")
    print(f"Projects with valid history through {train_cutoff} and observed in {target_month_2}: {len(common_pids_2)}")

    train_df_sorted = train_df.sort_values(by=["project_id", "report_month_key"])
    train_df_sorted["diff"] = train_df_sorted.groupby("project_id")["physical_progress_pct"].diff()
    sector_medians = train_df_sorted.groupby("sector")["diff"].median().to_dict()
    global_median_velocity = train_df_sorted["diff"].median()

    for horizon, target_month, common_pids, test_series in [
        (1, target_month_1, common_pids_1, test_df_1),
        (2, target_month_2, common_pids_2, test_df_2),
    ]:
        print("\n" + "=" * 65)
        print(f"EVALUATION: Forecasting horizon h={horizon} month(s) -> Target Month: {target_month}")
        print("=" * 65)

        actuals = []
        preds_naive = []
        preds_linear = []
        preds_ewma = []
        preds_adaptive = []

        for pid in common_pids:
            proj_train = train_df[train_df["project_id"] == pid].sort_values(by="report_month_key")
            y_hist = proj_train["physical_progress_pct"].values
            n_obs = len(y_hist)
            y_actual = test_series.loc[pid]

            y_last = y_hist[-1]
            p_naive = y_last

            # Linear Trend (OLS slope)
            if n_obs >= 2:
                x = np.arange(n_obs)
                slope, _ = np.polyfit(x, y_hist, 1)
                slope = max(0.0, min(slope, 15.0))
                p_linear = min(100.0, max(y_last, y_last + slope * horizon))
            else:
                p_linear = y_last

            # EWMA Recent velocity
            if n_obs >= 2:
                diffs = np.diff(y_hist)
                # Dampen negative adjustments, cap individual month jumps
                clean_diffs = np.clip(diffs, 0.0, 15.0)
                weights = np.array([0.7 ** (len(clean_diffs) - 1 - i) for i in range(len(clean_diffs))])
                weights /= weights.sum()
                v_ewma = np.sum(clean_diffs * weights)
                p_ewma = min(100.0, max(y_last, y_last + v_ewma * horizon))
            else:
                p_ewma = y_last

            # Adaptive Run-rate Velocity (shrinkage)
            sector = proj_train["sector"].iloc[0] if "sector" in proj_train.columns and pd.notna(proj_train["sector"].iloc[0]) else "Unknown"
            prior_v = sector_medians.get(sector, global_median_velocity)
            if pd.isna(prior_v) or prior_v < 0:
                prior_v = 0.5

            if n_obs >= 2:
                raw_v = (y_hist[-1] - y_hist[0]) / (n_obs - 1)
                raw_v = max(0.0, min(raw_v, 15.0))
                w = min(1.0, (n_obs - 1) / 4.0)
                v_adaptive = w * raw_v + (1.0 - w) * prior_v
            else:
                v_adaptive = prior_v

            p_adaptive = min(100.0, max(y_last, y_last + v_adaptive * horizon))

            actuals.append(y_actual)
            preds_naive.append(p_naive)
            preds_linear.append(p_linear)
            preds_ewma.append(p_ewma)
            preds_adaptive.append(p_adaptive)

        actuals = np.array(actuals)
        results = {}
        for name, p in [
            ("Baseline (Persistence / Last Known)", np.array(preds_naive)),
            ("Linear Trend (Bounded OLS)", np.array(preds_linear)),
            ("EWMA Recent Velocity", np.array(preds_ewma)),
            ("Adaptive Run-Rate Velocity", np.array(preds_adaptive)),
        ]:
            mae = np.mean(np.abs(actuals - p))
            rmse = np.sqrt(np.mean((actuals - p) ** 2))
            max_err = np.max(np.abs(actuals - p))
            results[name] = {"MAE": round(mae, 4), "RMSE": round(rmse, 4), "Max Error": round(max_err, 4)}

        res_df = pd.DataFrame(results).T
        print(res_df.to_string())


if __name__ == "__main__":
    evaluate_models()
