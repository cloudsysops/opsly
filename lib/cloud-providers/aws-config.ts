/**
 * AWS Integration Configuration
 * S3 for media uploads, SES for email, CloudWatch for logs
 */

import { z } from 'zod';

const awsEnvSchema = z.object({
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_S3_BUCKET: z.string().optional().default(''),
  AWS_S3_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  AWS_SES_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  AWS_CLOUDWATCH_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
});

export type AWSConfig = z.infer<typeof awsEnvSchema>;

class AWSConfigManager {
  private config: AWSConfig;

  constructor() {
    this.config = awsEnvSchema.parse(process.env);
  }

  getS3Config() {
    return {
      enabled: this.config.AWS_S3_ENABLED,
      bucket: this.config.AWS_S3_BUCKET,
      region: this.config.AWS_REGION,
    };
  }

  getSESConfig() {
    return {
      enabled: this.config.AWS_SES_ENABLED,
      region: this.config.AWS_REGION,
    };
  }

  getCloudWatchConfig() {
    return {
      enabled: this.config.AWS_CLOUDWATCH_ENABLED,
      region: this.config.AWS_REGION,
    };
  }

  isConfigured(): boolean {
    return !!this.config.AWS_ACCESS_KEY_ID && !!this.config.AWS_SECRET_ACCESS_KEY;
  }
}

export const awsConfig = new AWSConfigManager();

/**
 * Health check for AWS services
 */
export async function checkAWSHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  s3?: boolean;
  ses?: boolean;
  cloudwatch?: boolean;
}> {
  try {
    const config = awsConfig.getS3Config();

    if (!config.enabled) {
      return { status: 'healthy', s3: false };
    }

    // TODO: Attempt S3 list-buckets call to verify credentials
    // This would require AWS SDK initialization

    return {
      status: 'healthy',
      s3: true,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      s3: false,
    };
  }
}
