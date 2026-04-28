export interface SandboxPolicy {
  allowedImages: string[];
  maxTimeoutSeconds: number;
  allowNetwork: boolean;
  requireApproval: boolean;
}

export type PlanType = 'startup' | 'business' | 'enterprise';

export function resolveSandboxPolicy(plan: PlanType = 'startup'): SandboxPolicy {
  const policies: Record<PlanType, SandboxPolicy> = {
    startup: {
      allowedImages: ['alpine:latest', 'node:22-alpine', 'python:3.12-slim'],
      maxTimeoutSeconds: 300,
      allowNetwork: false,
      requireApproval: false,
    },
    business: {
      allowedImages: [
        'alpine:latest',
        'node:22-alpine',
        'python:3.12-slim',
        'ubuntu:24.04',
        'debian:12-slim',
        'golang:1.22-alpine',
      ],
      maxTimeoutSeconds: 600,
      allowNetwork: true,
      requireApproval: true,
    },
    enterprise: {
      allowedImages: [
        'alpine:latest',
        'node:22-alpine',
        'python:3.12-slim',
        'ubuntu:24.04',
        'debian:12-slim',
        'golang:1.22-alpine',
        'postgres:16-alpine',
        'redis:7-alpine',
      ],
      maxTimeoutSeconds: 1800,
      allowNetwork: true,
      requireApproval: false,
    },
  };

  return policies[plan] || policies.startup;
}

export interface SandboxValidationError {
  field: string;
  reason: string;
}

export class SandboxPolicyViolation extends Error {
  constructor(
    public violations: SandboxValidationError[],
  ) {
    super(
      `Sandbox policy violation: ${violations.map((v) => `${v.field}: ${v.reason}`).join('; ')}`,
    );
    this.name = 'SandboxPolicyViolation';
  }
}

export function assertSandboxAllowed(
  data: { image: string; timeout_seconds: number; allow_network?: boolean },
  policy: SandboxPolicy,
): void {
  const violations: SandboxValidationError[] = [];

  if (!policy.allowedImages.includes(data.image)) {
    violations.push({
      field: 'image',
      reason: `not in allowed list: ${policy.allowedImages.join(', ')}`,
    });
  }

  if (data.timeout_seconds > policy.maxTimeoutSeconds) {
    violations.push({
      field: 'timeout_seconds',
      reason: `exceeds max ${policy.maxTimeoutSeconds}s`,
    });
  }

  if (data.allow_network && !policy.allowNetwork) {
    violations.push({
      field: 'allow_network',
      reason: 'not permitted by policy',
    });
  }

  if (violations.length > 0) {
    throw new SandboxPolicyViolation(violations);
  }
}
