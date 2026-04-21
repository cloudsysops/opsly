#!/usr/bin/env python3
"""
Knowledge Brain Collector
Recolecta contenido de RSS feeds y APIs externas
"""

import os
import sys
import yaml
import feedparser
import requests
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

CONFIG_FILE = "config/knowledge-sources.yaml"
VAULT_PATH = Path("docs/knowledge")
TEMPLATE_PATH = VAULT_PATH / "_templates" / "article-note.md"


class KnowledgeCollector:
    def __init__(self, config_path: str = CONFIG_FILE):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
        self.sources = self.config.get("sources", {})
        self.settings = self.config.get("settings", {})

    def fetch_rss(self, url: str) -> List[Dict]:
        """Fetch RSS/Atom feed"""
        try:
            feed = feedparser.parse(url)
            return [
                {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "summary": entry.get("summary", entry.get("description", "")),
                    "published": entry.get("published", datetime.now().isoformat()),
                    "author": entry.get("author", ""),
                }
                for entry in feed.entries[
                    : self.settings.get("max_entries_per_source", 10)
                ]
            ]
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return []

    def fetch_json(self, url: str, headers: Dict = None) -> List[Dict]:
        """Fetch JSON API"""
        try:
            resp = requests.get(url, headers=headers or {}, timeout=10)
            data = resp.json()

            if isinstance(data, list):
                return data[: self.settings.get("max_entries_per_source", 10)]
            elif isinstance(data, dict) and "items" in data:
                return data["items"][: self.settings.get("max_entries_per_source", 10)]
            return []
        except Exception as e:
            print(f"Error fetching JSON {url}: {e}")
            return []

    def generate_summary(self, entry: Dict) -> Dict:
        """Generate AI summary (placeholder - integrate with LLM Gateway)"""
        # TODO: Integrate with @intcloudsysops/llm-gateway
        summary_text = entry.get("summary", "")[:500]

        return {
            "summary": summary_text,
            "key_points": [
                "Punto clave 1 extraído por IA",
                "Punto clave 2",
                "Punto clave 3",
            ],
            "tags": ["auto-generated", "ai-summary"],
            "importance": 3,
        }

    def create_note_filename(self, entry: Dict, category: str) -> str:
        """Create safe filename from entry"""
        date = entry.get("published", datetime.now().isoformat())[:10]
        title_hash = hashlib.md5(entry.get("link", "").encode()).hexdigest()[:8]
        return f"{date}-{title_hash}.md"

    def create_note(self, entry: Dict, source: Dict, summary: Dict) -> Path:
        """Create Obsidian note from entry"""
        category = source.get("category", "99-archive")
        category_folder = VAULT_PATH / category
        category_folder.mkdir(parents=True, exist_ok=True)

        filename = self.create_note_filename(entry, category)
        note_path = category_folder / filename

        # Skip if already exists
        if note_path.exists():
            return note_path

        content = f"""---
title: "{entry.get("title", "Untitled").replace('"', '\\"')}"
date: {entry.get("published", datetime.now().isoformat())}
category: {category}
tags: {source.get("tags", []) + summary.get("tags", [])}
importance: {summary.get("importance", 3)}
source: {entry.get("link", "")}
source_name: {source.get("name", "Unknown")}
reviewed: false
created: {datetime.now().isoformat()}
---

# {entry.get("title", "Untitled")}

## 📝 Resumen
{summary.get("summary", entry.get("summary", ""))}

## 🔑 Puntos Clave
"""
        for point in summary.get("key_points", []):
            content += f"- {point}\n"

        content += f"""
## 📚 Fuente
[Leer original]({entry.get("link", "")})

---
*Recolectado automáticamente por Knowledge Brain | {datetime.now().isoformat()}*
"""

        note_path.write_text(content)
        return note_path

    def collect_source(self, source: Dict) -> List[Path]:
        """Collect from single source"""
        notes_created = []
        url = source.get("url", "")
        fmt = source.get("format", "rss").lower()

        print(f"  📥 Fetching {source.get('name', 'Unknown')}...")

        if fmt == "json":
            entries = self.fetch_json(url, source.get("headers"))
        else:
            entries = self.fetch_rss(url)

        for entry in entries:
            summary = self.generate_summary(entry)
            note_path = self.create_note(entry, source, summary)
            notes_created.append(note_path)
            print(f"    ✓ {note_path.name}")

        return notes_created

    def run(self, categories: List[str] = None):
        """Run collection for all or selected categories"""
        print(f"🧠 Knowledge Brain Collector")
        print(f"   Started: {datetime.now().isoformat()}")
        print("-" * 50)

        total_notes = 0

        for category, sources in self.sources.items():
            if categories and category not in categories:
                continue

            if not sources:
                continue

            print(f"\n📂 Category: {category}")

            for source in sources:
                if not source.get("enabled", True):
                    continue

                notes = self.collect_source(source)
                total_notes += len(notes)

        print("-" * 50)
        print(f"✅ Completed: {total_notes} notes created")
        print(f"   Finished: {datetime.now().isoformat()}")


def main():
    collector = KnowledgeCollector()

    # Check for category filter
    categories = None
    if len(sys.argv) > 1:
        categories = sys.argv[1:]

    collector.run(categories)


if __name__ == "__main__":
    main()
