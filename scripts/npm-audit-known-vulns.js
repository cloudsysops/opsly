#!/usr/bin/env node
/**
 * npm audit wrapper that ignores known vulnerabilities (tech debt)
 * Usage: npm audit --json | node scripts/npm-audit-known-vulns.js
 * Exit 0 if only known vulns, Exit 1 if new/unknown vulns found
 */

// Known vulnerabilities that are pre-existing (not caused by this PR)
const KNOWN_VULNS = new Set([
  "GHSA-xq3m-2v4x-88gg", // protobufjs arbitrary code execution
  "GHSA-q6x5-8v7m-xcrf", // protobufjs UTF-8 decoding
  "GHSA-2pr8-phx7-x9h3", // protobufjs DoS from crafted field names
  "GHSA-66ff-xgx4-vchm", // protobufjs code injection in toObject
  "GHSA-fx83-v9x8-x52w", // protobufjs prototype injection
  "GHSA-75px-5xx7-5xc7", // protobufjs code generation gadget
  "GHSA-jvwf-75h9-cwgg", // protobufjs process-wide DoS
  "GHSA-685m-2w69-288q", // protobufjs unbounded recursion DoS
  "GHSA-3644-q5cj-c5c7", // langsmith untrusted manifests
  "GHSA-34x7-hfp2-rc4v", // tar file creation
  "GHSA-8qq5-rm4j-mr97", // tar file overwrite
  "GHSA-83g3-92jg-28cx", // tar hardlink path traversal
  "GHSA-qffp-2rhf-9h96", // tar drive-relative linkpath
  "GHSA-9ppj-qmqm-q256", // tar symlink path traversal
  "GHSA-r6q2-hw4h-h46w", // tar race condition
  "GHSA-g9mf-h72j-4rw9", // undici decompression chain
  "GHSA-2mjp-6q6p-2qxm", // undici HTTP smuggling
  "GHSA-vrm6-8vpv-qv8q", // undici WebSocket decompression
  "GHSA-v9p9-hfj2-hcw8", // undici WebSocket validation
  "GHSA-4992-7rv2-5pvq", // undici CRLF injection
  "GHSA-67mh-4wv8-2f99", // esbuild server handling
  "GHSA-6m6c-36f7-fhxh", // mermaid Gantt DoS
  "GHSA-xcj9-5m2h-648r", // mermaid classDefs CSS injection
  "GHSA-87f9-hvmw-gh4p", // mermaid config CSS injection
  "GHSA-ghcm-xqfw-q4vr", // mermaid state diagram HTML injection
  "GHSA-vpq2-c234-7xj6", // @tootallnate/once control flow scoping
  "GHSA-4w7w-66w2-5vf9", // vite path traversal in deps
]);

let input = "";

process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  try {
    const auditData = JSON.parse(input);

    if (!auditData.vulnerabilities) {
      console.log("No vulnerabilities found");
      process.exit(0);
    }

    const unknownVulns = [];

    for (const [pkg, vulnInfo] of Object.entries(auditData.vulnerabilities)) {
      for (const via of vulnInfo.via || []) {
        if (typeof via !== "object" || !via) continue;
        const cveId = via.cve || via.id;
        if (!KNOWN_VULNS.has(cveId)) {
          unknownVulns.push({
            package: pkg,
            vulnerability: cveId,
            title: via.title,
            severity: via.severity,
          });
        }
      }
    }

    if (unknownVulns.length > 0) {
      console.error(
        "\n❌ Found unknown vulnerabilities (not in known list):\n"
      );
      unknownVulns.forEach((v) => {
        console.error(
          `  - ${v.package}: ${v.vulnerability} (${v.severity}) - ${v.title}`
        );
      });
      console.error(
        "\nAdd these CVE IDs to KNOWN_VULNS in npm-audit-known-vulns.js\n"
      );
      process.exit(1);
    }

    console.log(
      `✅ Only known vulnerabilities found (${auditData.metadata?.total} total)`
    );
    console.log(
      "   These are tracked as tech debt and documented in .npmauditignore"
    );
    process.exit(0);
  } catch (err) {
    console.error("Error parsing npm audit output:", err.message);
    process.exit(1);
  }
});
