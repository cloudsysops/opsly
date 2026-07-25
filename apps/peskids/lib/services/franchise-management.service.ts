import { supabaseServer } from '@/lib/supabase';

/**
 * Franchise Management Service
 * Handles franchise provisioning, approval, and KPI tracking
 */

const PLATFORM_SCHEMA = 'platform';

function platformClient() {
  // @ts-ignore - platform schema access via service role
  return supabaseServer().schema(PLATFORM_SCHEMA);
}

export interface FranchiseInfo {
  id: string;
  tenantSlug: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  tier: 'startup' | 'business' | 'enterprise';
  status: 'provisioning' | 'under_review' | 'approved' | 'active' | 'suspended';
  approvalDate?: string;
  activationDate?: string;
  createdAt: string;
}

/**
 * List all franchises (admin view)
 */
export async function listFranchises(filters?: {
  status?: string;
  tier?: string;
  offset?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  franchises?: FranchiseInfo[];
  total?: number;
  error?: string;
}> {
  try {
    let query = (platformClient()
      .from('tenants')
      .select('*', { count: 'exact' })
      .eq('franchise_type', 'child')) as any;

    if (filters?.status) {
      query = query.eq('approval_status', filters.status);
    }

    if (filters?.tier) {
      query = query.eq('tier', filters.tier);
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    query = query.range(offset, offset + limit - 1);

    const result = (await query.order('created_at', { ascending: false })) as any;

    if (result.error) throw result.error;

    const franchises = (result.data || []).map((row: any) => ({
      id: row.id,
      tenantSlug: row.tenant_slug,
      name: row.tenant_name,
      email: row.contact_email,
      phone: row.contact_phone,
      country: row.country,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      tier: row.tier,
      status: row.approval_status,
      approvalDate: row.approval_date,
      activationDate: row.activated_at,
      createdAt: row.created_at,
    }));

    return {
      success: true,
      franchises,
      total: result.count || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list franchises',
    };
  }
}

/**
 * Get nearby franchises by location
 * Used by users to find closest franchise
 */
export async function getNearbyFranchises(input: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}): Promise<{
  success: boolean;
  franchises?: Array<FranchiseInfo & { distanceKm: number }>;
  error?: string;
}> {
  try {
    const radiusKm = input.radiusKm || 50; // Default 50km radius
    const earthRadiusKm = 6371;

    // Get all active franchises
    const result = (await (platformClient()
      .from('tenants')
      .select('*')
      .eq('franchise_type', 'child')
      .eq('approval_status', 'active')) as any) as any;

    if (result.error) throw result.error;

    const franchises = (result.data || [])
      .map((row: any) => {
        // Calculate distance using Haversine formula
        const lat1 = (input.latitude * Math.PI) / 180;
        const lat2 = (row.latitude * Math.PI) / 180;
        const deltaLat = ((row.latitude - input.latitude) * Math.PI) / 180;
        const deltaLon = ((row.longitude - input.longitude) * Math.PI) / 180;

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = earthRadiusKm * c;

        return {
          id: row.id,
          tenantSlug: row.tenant_slug,
          name: row.tenant_name,
          email: row.contact_email,
          phone: row.contact_phone,
          country: row.country,
          city: row.city,
          latitude: row.latitude,
          longitude: row.longitude,
          tier: row.tier,
          status: row.approval_status,
          createdAt: row.created_at,
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
      .filter((f) => f.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      success: true,
      franchises,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find nearby franchises',
    };
  }
}

/**
 * Get franchise details
 */
export async function getFranchiseDetails(franchiseTenantId: string): Promise<{
  success: boolean;
  franchise?: FranchiseInfo & {
    kpis?: {
      studentCount: number;
      monthlyRevenue: number;
      churnRate: number;
      nps: number;
    };
  };
  error?: string;
}> {
  try {
    const result = (await (platformClient()
      .from('tenants')
      .select('*')
      .eq('id', franchiseTenantId)
      .single()) as any) as any;

    if (result.error || !result.data) {
      return {
        success: false,
        error: 'Franchise not found',
      };
    }

    const row = result.data;
    const franchise: any = {
      id: row.id,
      tenantSlug: row.tenant_slug,
      name: row.tenant_name,
      email: row.contact_email,
      phone: row.contact_phone,
      country: row.country,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      tier: row.tier,
      status: row.approval_status,
      createdAt: row.created_at,
    };

    // TODO: Fetch KPIs from franchise_kpis table
    // For now, return placeholder

    return {
      success: true,
      franchise,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get franchise details',
    };
  }
}

/**
 * Update franchise status (approve, activate, suspend)
 */
export async function updateFranchiseStatus(input: {
  franchiseTenantId: string;
  status: 'approved' | 'active' | 'suspended' | 'rejected';
  notes?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const updates: any = {
      approval_status: input.status,
      updated_at: new Date().toISOString(),
    };

    if (input.status === 'approved') {
      updates.approval_date = new Date().toISOString();
    }

    if (input.status === 'active') {
      updates.activated_at = new Date().toISOString();
    }

    if (input.notes) {
      updates.admin_notes = input.notes;
    }

    const result = (await (platformClient()
      .from('tenants')
      .update(updates as any)
      .eq('id', input.franchiseTenantId)) as any) as any;

    if (result.error) throw result.error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update franchise status',
    };
  }
}

/**
 * Get franchise features/capabilities by tier
 */
export function getFranchiseFeatures(tier: 'startup' | 'business' | 'enterprise') {
  const features: Record<string, Record<string, boolean | number>> = {
    startup: {
      maxStudents: 50,
      apiAccess: false,
      customDomain: false,
      advancedReports: false,
      supportTier: 1,
      monthlyPayment: 99,
    },
    business: {
      maxStudents: 200,
      apiAccess: true,
      customDomain: true,
      advancedReports: true,
      supportTier: 2,
      monthlyPayment: 499,
    },
    enterprise: {
      maxStudents: 9999,
      apiAccess: true,
      customDomain: true,
      advancedReports: true,
      supportTier: 3,
      monthlyPayment: 1999,
    },
  };

  return features[tier] || features.startup;
}
