export type TenantStackType = 'incubator-app' | 'full-tenant-stack' | (string & Record<never, never>);

export interface TenantProfile {
  tenant_name: string;
  tenant_slug: string;
  schema_name: string;
  platform_domain: string;
  public_url?: string;
  internal_port?: number;
  stack_type?: TenantStackType;
  brand_logo_path?: string;
  staff_login_path?: string;
  invite_email_subject?: string;
  notes?: string;
}

export interface PortalInviteBranding {
  brandName: string;
  logoUrl: string | null;
  emailSubject: string;
}
