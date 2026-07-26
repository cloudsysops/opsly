import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

export type StoreProduct = Database['peskids']['Tables']['store_products']['Row'];
export type StoreOrder = Database['peskids']['Tables']['store_orders']['Row'];
export type StoreOrderItem = Database['peskids']['Tables']['store_order_items']['Row'];
export type StoreCartItem = Database['peskids']['Tables']['store_cart_items']['Row'];

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

// ========================
// PRODUCT MANAGEMENT
// ========================

export async function listStoreProducts(filters?: {
  category?: string;
  active?: boolean;
}): Promise<StoreProduct[]> {
  let query = peskidsClient().from('store_products').select('*').eq('tenant_slug', tenantSlug());

  if (filters?.category) {
    query = query.eq(
      'category',
      filters.category as Database['peskids']['Tables']['store_products']['Row']['category']
    );
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StoreProduct[];
}

export async function getProductById(productId: string): Promise<StoreProduct | null> {
  const { data, error } = await peskidsClient()
    .from('store_products')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('id', productId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as StoreProduct | null;
}

export async function createProduct(input: {
  category: 'utilities' | 'merchandise' | 'services';
  title: string;
  description?: string;
  price_cents: number;
  image_url?: string;
  inventory_count?: number;
  active?: boolean;
}): Promise<StoreProduct> {
  const { data, error } = await peskidsClient()
    .from('store_products')
    .insert({
      tenant_slug: tenantSlug(),
      category: input.category,
      title: input.title,
      description: input.description || null,
      price_cents: input.price_cents,
      image_url: input.image_url || null,
      inventory_count: input.inventory_count || 0,
      active: input.active !== false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as StoreProduct;
}

export async function updateProduct(
  productId: string,
  input: Partial<{
    title: string;
    description: string;
    price_cents: number;
    image_url: string;
    inventory_count: number;
    active: boolean;
  }>
): Promise<StoreProduct> {
  const { data, error } = await peskidsClient()
    .from('store_products')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('id', productId)
    .select('*')
    .single();

  if (error) throw error;
  return data as StoreProduct;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await peskidsClient()
    .from('store_products')
    .delete()
    .eq('tenant_slug', tenantSlug())
    .eq('id', productId);

  if (error) throw error;
}

// ========================
// SHOPPING CART
// ========================

export async function addToCart(
  studentId: string,
  productId: string,
  quantity: number = 1
): Promise<StoreCartItem> {
  // Upsert: insert or update if already in cart
  const { data, error } = await peskidsClient()
    .from('store_cart_items')
    .upsert(
      {
        tenant_slug: tenantSlug(),
        student_id: studentId,
        product_id: productId,
        quantity,
      },
      { onConflict: 'tenant_slug,student_id,product_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as StoreCartItem;
}

export async function getCart(
  studentId: string
): Promise<(StoreCartItem & { product: StoreProduct })[]> {
  const { data, error } = await peskidsClient()
    .from('store_cart_items')
    .select('*, product:product_id(*)')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId);

  if (error) throw error;
  return (data ?? []) as (StoreCartItem & { product: StoreProduct })[];
}

export async function removeFromCart(studentId: string, productId: string): Promise<void> {
  const { error } = await peskidsClient()
    .from('store_cart_items')
    .delete()
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId)
    .eq('product_id', productId);

  if (error) throw error;
}

export async function clearCart(studentId: string): Promise<void> {
  const { error } = await peskidsClient()
    .from('store_cart_items')
    .delete()
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId);

  if (error) throw error;
}

// ========================
// ORDERS
// ========================

export async function createOrder(input: {
  student_id: string;
  items: Array<{ product_id: string; quantity: number; unit_price_cents: number }>;
  total_cents: number;
  discount_cents?: number;
  referral_code_used?: string;
  payment_status?: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id?: string;
  wompi_transaction_id?: string;
}): Promise<StoreOrder> {
  const finalAmount = input.total_cents - (input.discount_cents || 0);

  // Create order
  const { data: orderData, error: orderError } = await peskidsClient()
    .from('store_orders')
    .insert({
      tenant_slug: tenantSlug(),
      student_id: input.student_id,
      total_cents: input.total_cents,
      discount_cents: input.discount_cents || 0,
      final_amount_cents: finalAmount,
      referral_code_used: input.referral_code_used || null,
      payment_status: input.payment_status || 'pending',
      stripe_payment_intent_id: input.stripe_payment_intent_id || null,
      wompi_transaction_id: input.wompi_transaction_id || null,
    })
    .select('*')
    .single();

  if (orderError) throw orderError;
  const order = orderData as StoreOrder;

  // Create order items
  if (input.items.length > 0) {
    const { error: itemsError } = await peskidsClient()
      .from('store_order_items')
      .insert(
        input.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
        }))
      );

    if (itemsError) throw itemsError;
  }

  return order;
}

export async function getOrder(orderId: string): Promise<StoreOrder | null> {
  const { data, error } = await peskidsClient()
    .from('store_orders')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as StoreOrder | null;
}

export async function getOrderItems(orderId: string): Promise<StoreOrderItem[]> {
  const { data, error } = await peskidsClient()
    .from('store_order_items')
    .select('*')
    .eq('order_id', orderId);

  if (error) throw error;
  return (data ?? []) as StoreOrderItem[];
}

export async function listStudentOrders(studentId: string): Promise<StoreOrder[]> {
  const { data, error } = await peskidsClient()
    .from('store_orders')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StoreOrder[];
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded'
): Promise<StoreOrder> {
  const { data, error } = await peskidsClient()
    .from('store_orders')
    .update({
      payment_status: status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) throw error;
  return data as StoreOrder;
}
