#!/usr/bin/env python3
"""
Automated test coverage analysis for Opsly codebase.
Scans all apps/lib modules and generates coverage report.

Usage:
    python3 scripts/analyze-test-coverage.py
    python3 scripts/analyze-test-coverage.py --format json --output coverage-report.json
    python3 scripts/analyze-test-coverage.py --threshold 70 --fail-threshold 50
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict

@dataclass
class CoverageStats:
    """Coverage statistics for a module."""
    name: str
    test_files: int
    source_files: int
    coverage_pct: float
    status: str  # "critical", "high", "low", "none"

    @property
    def coverage_str(self) -> str:
        if self.test_files == 0:
            return "0% (no tests)"
        if self.source_files == 0:
            return "N/A (no source)"
        return f"{self.coverage_pct:.1f}%"


class CoverageAnalyzer:
    """Analyze test coverage across codebase."""

    CRITICAL_THRESHOLD = 70  # 70%+ coverage
    HIGH_THRESHOLD = 50      # 50%+ coverage
    LOW_THRESHOLD = 20       # 20%+ coverage

    def __init__(self, repo_root: str = "."):
        self.repo_root = Path(repo_root)
        self.results: Dict[str, CoverageStats] = {}

    def analyze(self) -> Dict[str, CoverageStats]:
        """Analyze coverage for all modules."""
        self.results = {}

        # Analyze apps
        apps_dir = self.repo_root / "apps"
        if apps_dir.exists():
            for app in apps_dir.iterdir():
                if app.is_dir() and not app.name.startswith("_"):
                    self._analyze_module(app, "apps")

        # Analyze lib modules
        lib_dir = self.repo_root / "lib"
        if lib_dir.exists():
            for lib in lib_dir.iterdir():
                if lib.is_dir() and not lib.name.startswith("_"):
                    self._analyze_module(lib, "lib")

        # Analyze packages/skills
        skills_dir = self.repo_root / "packages" / "skills" / "manifest"
        if skills_dir.exists():
            self._analyze_module(skills_dir, "packages/skills/manifest")

        return self.results

    def _analyze_module(self, module_path: Path, prefix: str) -> None:
        """Analyze a single module (app or lib)."""
        module_name = module_path.name
        full_name = f"{prefix}/{module_name}"

        # Count test files
        test_patterns = [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.spec.ts",
            "**/*.spec.tsx",
            "**/__tests__/**/*.ts",
        ]
        test_files = []
        for pattern in test_patterns:
            test_files.extend(module_path.glob(pattern))

        # Count source files
        source_patterns = [
            "**/*.ts",
            "**/*.tsx",
        ]
        source_files = []
        for pattern in source_patterns:
            for f in module_path.glob(pattern):
                # Exclude test files
                if not any(
                    part in f.parts
                    for part in ["__tests__", "node_modules", "dist"]
                ) and not any(
                    f.name.endswith(suffix)
                    for suffix in [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"]
                ):
                    source_files.append(f)

        # Calculate coverage percentage
        test_count = len(test_files)
        source_count = len(source_files)

        if source_count == 0:
            coverage_pct = 0.0 if test_count == 0 else 100.0
        else:
            coverage_pct = (test_count / source_count) * 100

        # Determine status
        if test_count == 0:
            status = "none"
        elif coverage_pct >= self.CRITICAL_THRESHOLD:
            status = "critical"
        elif coverage_pct >= self.HIGH_THRESHOLD:
            status = "high"
        elif coverage_pct >= self.LOW_THRESHOLD:
            status = "low"
        else:
            status = "low"

        self.results[full_name] = CoverageStats(
            name=full_name,
            test_files=test_count,
            source_files=source_count,
            coverage_pct=coverage_pct,
            status=status,
        )

    def get_summary(self) -> Dict:
        """Get summary statistics."""
        by_status = {"critical": [], "high": [], "low": [], "none": []}
        total_tests = 0
        total_sources = 0

        for stats in self.results.values():
            by_status[stats.status].append(stats.name)
            total_tests += stats.test_files
            total_sources += stats.source_files

        return {
            "total_modules": len(self.results),
            "total_test_files": total_tests,
            "total_source_files": total_sources,
            "by_status": by_status,
            "coverage_distribution": {
                "critical": len(by_status["critical"]),
                "high": len(by_status["high"]),
                "low": len(by_status["low"]),
                "none": len(by_status["none"]),
            },
        }

    def print_report(self) -> None:
        """Print human-readable report."""
        print("\n" + "=" * 80)
        print("📊 TEST COVERAGE ANALYSIS")
        print("=" * 80 + "\n")

        # Group by status
        by_status = {}
        for stats in self.results.values():
            if stats.status not in by_status:
                by_status[stats.status] = []
            by_status[stats.status].append(stats)

        # Print by status
        status_order = ["critical", "high", "low", "none"]
        status_icons = {
            "critical": "🟢",
            "high": "🟡",
            "low": "🔴",
            "none": "⚫",
        }

        for status in status_order:
            if status not in by_status:
                continue

            items = by_status[status]
            icon = status_icons[status]
            print(f"\n{icon} {status.upper()} ({len(items)} modules)")
            print("-" * 80)

            for stats in sorted(items, key=lambda s: s.coverage_pct, reverse=True):
                print(
                    f"  {stats.name:<40} "
                    f"Tests: {stats.test_files:>3}  "
                    f"Sources: {stats.source_files:>3}  "
                    f"Coverage: {stats.coverage_str:>10}"
                )

        # Print summary
        summary = self.get_summary()
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total modules analyzed:  {summary['total_modules']}")
        print(f"Total test files:        {summary['total_test_files']}")
        print(f"Total source files:      {summary['total_source_files']}")
        print(f"\nCritical (>=70%):        {summary['coverage_distribution']['critical']}")
        print(f"High (50-70%):           {summary['coverage_distribution']['high']}")
        print(f"Low (20-50%):            {summary['coverage_distribution']['low']}")
        print(f"None (0%):               {summary['coverage_distribution']['none']}")
        print("=" * 80 + "\n")

    def export_json(self, output_file: str) -> None:
        """Export results as JSON."""
        data = {
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "summary": self.get_summary(),
            "modules": {
                name: {
                    "test_files": stats.test_files,
                    "source_files": stats.source_files,
                    "coverage_pct": stats.coverage_pct,
                    "status": stats.status,
                }
                for name, stats in self.results.items()
            },
        }

        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)
        print(f"✅ Report exported to {output_file}")

    def export_markdown(self, output_file: str) -> None:
        """Export results as Markdown."""
        summary = self.get_summary()

        md = [
            "# Test Coverage Analysis Report",
            "",
            f"**Generated:** {__import__('datetime').datetime.now().isoformat()}",
            "",
            "## Summary",
            "",
            f"- Total modules: {summary['total_modules']}",
            f"- Total test files: {summary['total_test_files']}",
            f"- Total source files: {summary['total_source_files']}",
            "",
            "### Coverage Distribution",
            "",
            "| Status | Count |",
            "|--------|-------|",
        ]

        for status in ["critical", "high", "low", "none"]:
            count = summary["coverage_distribution"][status]
            md.append(f"| {status.capitalize()} | {count} |")

        md.extend([
            "",
            "## Modules by Status",
            "",
        ])

        by_status = {}
        for stats in self.results.values():
            if stats.status not in by_status:
                by_status[stats.status] = []
            by_status[stats.status].append(stats)

        for status in ["critical", "high", "low", "none"]:
            if status not in by_status:
                continue

            items = by_status[status]
            md.append(f"### {status.upper()} ({len(items)} modules)")
            md.append("")
            md.append("| Module | Tests | Sources | Coverage |")
            md.append("|--------|-------|---------|----------|")

            for stats in sorted(items, key=lambda s: s.coverage_pct, reverse=True):
                md.append(
                    f"| {stats.name} | {stats.test_files} | "
                    f"{stats.source_files} | {stats.coverage_str} |"
                )
            md.append("")

        with open(output_file, "w") as f:
            f.write("\n".join(md))
        print(f"✅ Report exported to {output_file}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Analyze test coverage across codebase"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json", "markdown"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--output",
        help="Output file (for json/markdown formats)",
    )
    parser.add_argument(
        "--repo",
        default=".",
        help="Repository root (default: current directory)",
    )

    args = parser.parse_args()

    analyzer = CoverageAnalyzer(args.repo)
    analyzer.analyze()

    if args.format == "text":
        analyzer.print_report()
    elif args.format == "json":
        if not args.output:
            print("Error: --output required for json format", file=sys.stderr)
            sys.exit(1)
        analyzer.export_json(args.output)
    elif args.format == "markdown":
        if not args.output:
            print("Error: --output required for markdown format", file=sys.stderr)
            sys.exit(1)
        analyzer.export_markdown(args.output)
        analyzer.print_report()

    return 0


if __name__ == "__main__":
    sys.exit(main())
