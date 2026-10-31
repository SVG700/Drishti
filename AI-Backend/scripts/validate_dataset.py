"""Standalone CLI script to validate PAIMANA CSV datasets and generate audit summary."""
import sys
from pathlib import Path

# Add project root to sys.path so app imports work
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.services.data_loader import DataLoader


def main():
    print("=" * 70)
    print("MoSPI PAIMANA Dataset Quality & Integrity Auditor")
    print("=" * 70)

    loader = DataLoader(datasets_dir=backend_root / "datasets")
    success, msg = loader.load_and_validate()

    if not success:
        print(f"\n[FAIL] Validation Failed: {msg}")
        sys.exit(1)

    qs = loader.quality_summary
    print("\n[SUCCESS] Dataset validated successfully!\n")
    print(f"Projects File:      {qs['projects_file']}")
    print(f"History File:       {qs['history_file']}")
    print("-" * 70)
    print(f"Total Projects:     {qs['total_projects']:,}")
    print(f"Unique Project IDs: {qs['unique_projects']:,}")
    print(f"Duplicate Projects: {qs['duplicate_projects']}")
    print(f"Total Observations: {qs['total_observations']:,}")
    print(f"Duplicate Obs:      {qs['duplicate_observations']}")
    print(f"Coverage Period:    {qs['coverage_start']} to {qs['coverage_end']}")
    print("-" * 70)
    print(f"Original Cost Sum:  Rs. {qs['cumulative_original_cost_cr']:,.2f} Cr")
    print(f"Revised Cost Sum:   Rs. {qs['cumulative_revised_cost_cr']:,.2f} Cr")
    print(f"Expenditure Sum:    Rs. {qs['cumulative_expenditure_cr']:,.2f} Cr")
    print(f"Total Cost Overrun: Rs. {qs['total_cost_overrun_cr']:,.2f} Cr")
    print("-" * 70)
    print("Missing Values per Column in paimana_projects.csv:")
    for col, count in qs['projects_missing_fields_count'].items():
        if count > 0:
            pct = (count / qs['total_projects']) * 100
            print(f"  - {col:28s}: {count:5d} ({pct:5.1f}%)")

    print("\nIntegrity Guarantees:")
    print(f"  - Synthetic records injected : {qs['synthetic_values_injected']}")
    print(f"  - Authentic missing preserved: {qs['missing_values_preserved']}")
    print("=" * 70)


if __name__ == "__main__":
    main()
