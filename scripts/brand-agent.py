#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from tools.cli.brand_agent import main as brand_agent_main
    return brand_agent_main()


if __name__ == "__main__":
    raise SystemExit(main())

