"""Deep dive statistical inspection of PAIMANA history time-series data."""
import sys
from pathlib import Path
import pandas as pd
import numpy as np

backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def inspect():
    csv_path = backend_root / "datasets" / "paimana_history.csv"
    df = pd.read_csv(csv_path, dtype={"project_id": str})
    
    print(f"Total rows in history: {len(df)}")
    print(f"Unique project IDs: {df['project_id'].nunique()}")
    print("Report month distribution:")
    month_counts = df["report_month_key"].value_counts().sort_index()
    for m, c in month_counts.items():
        print(f"  {m}: {c} projects")

    # Observation count distribution per project
    obs_counts = df.groupby("project_id").size()
    print("\nObservation count per project distribution:")
    print(obs_counts.value_counts().sort_index())

    # Progress field analysis
    print("\nProgress field (physical_progress_pct) missing values:", df["physical_progress_pct"].isna().sum())
    print("Expenditure (cumulative_expenditure_cr) missing values:", df["cumulative_expenditure_cr"].isna().sum())

    # Check progress progression per project across sorted months
    df = df.sort_values(by=["project_id", "report_month_key"])
    df["progress_diff"] = df.groupby("project_id")["physical_progress_pct"].diff()
    df["exp_diff"] = df.groupby("project_id")["cumulative_expenditure_cr"].diff()

    diffs = df["progress_diff"].dropna()
    print("\nMonthly physical progress delta distribution:")
    print(f"  Zero progress delta (stagnant): {(diffs == 0).sum()} ({(diffs == 0).mean()*100:.1f}%)")
    print(f"  Positive progress delta:        {(diffs > 0).sum()} ({(diffs > 0).mean()*100:.1f}%)")
    print(f"  Negative progress delta (revisions): {(diffs < 0).sum()} ({(diffs < 0).mean()*100:.1f}%)")
    print(f"  Mean monthly progress delta:    {diffs.mean():.2f}%")
    print(f"  Median monthly progress delta:  {diffs.median():.2f}%")
    print(f"  Max monthly progress delta:     {diffs.max():.2f}%")

    # Projects with at least 5 observations
    sufficient_5 = (obs_counts >= 5).sum()
    sufficient_7 = (obs_counts >= 7).sum()
    full_9 = (obs_counts == 9).sum()
    print(f"\nProjects with >= 5 observations: {sufficient_5} ({sufficient_5/len(obs_counts)*100:.1f}%)")
    print(f"Projects with >= 7 observations: {sufficient_7} ({sufficient_7/len(obs_counts)*100:.1f}%)")
    print(f"Projects with exactly 9 observations: {full_9} ({full_9/len(obs_counts)*100:.1f}%)")

if __name__ == "__main__":
    inspect()
