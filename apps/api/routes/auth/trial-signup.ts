import { Router } from 'express';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { sendWelcomeEmail } from '@/lib/mail';
import { getOnboardingQueue } from '@/lib/onboarding-queue';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /auth/trial-signup
 *
 * Handles new agency signup for Opsly trial:
 * 1. Create Stripe customer + trial subscription (Business plan, 14 days)
 * 2. Create tenant in Supabase
 * 3. Enqueue onboarding job (will trigger onboard-tenant.sh via BullMQ)
 * 4. Send welcome email
 *
 * Body:
 * {
 *   company_name: string,
 *   email: string,
 *   agency_size: "small" | "medium" | "large",
 *   automation_stack: string[],
 *   num_customers: number,
 *   contact_name?: string
 * }
 */
router.post('/trial-signup', async (req, res) => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  try {
    const {
      company_name,
      email,
      agency_size,
      automation_stack,
      num_customers,
      contact_name,
    } = req.body;

    // Validate input
    if (!company_name || !email) {
      logger.warn('Invalid trial signup request', {
        requestId,
        reason: 'missing_required_fields',
        company_name,
        email,
      });
      return res.status(400).json({ error: 'Company name and email required' });
    }

    // Generate tenant slug from company name
    const tenantSlug = generateTenantSlug(company_name);

    logger.info('Trial signup initiated', {
      requestId,
      company_name,
      email,
      tenant_slug: tenantSlug,
    });

    // 1. Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: company_name,
      metadata: {
        agency_size,
        automation_stack: automation_stack.join(','),
        num_customers: num_customers.toString(),
        request_id: requestId,
        tenant_slug: tenantSlug,
      },
    });

    logger.info('Stripe customer created', {
      requestId,
      stripe_customer_id: customer.id,
    });

    // 2. Create trial subscription (Business plan, 14 days)
    const businessPriceId = process.env.STRIPE_BUSINESS_PLAN_PRICE_ID!;

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: businessPriceId }],
      trial_period_days: 14,
      metadata: {
        request_id: requestId,
        tenant_slug: tenantSlug,
        trial_type: 'agency_onboarding',
      },
    });

    logger.info('Trial subscription created', {
      requestId,
      subscription_id: subscription.id,
      trial_end: subscription.trial_end,
    });

    // 3. Create tenant in Supabase
    const { data: tenantData, error: tenantError } = await supabase()
      .schema('platform')
      .from('tenants')
      .insert({
        slug: tenantSlug,
        name: company_name,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        plan: 'business',
        status: 'trial',
        trial_end_at: new Date(subscription.trial_end! * 1000),
        metadata: {
          agency_size,
          automation_stack,
          num_customers,
          contact_email: email,
          contact_name,
        },
      })
      .select();

    if (tenantError) {
      logger.error('Failed to create tenant in Supabase', {
        requestId,
        error: tenantError.message,
      });
      return res.status(500).json({ error: 'Failed to create tenant' });
    }

    const tenant = tenantData?.[0];
    if (!tenant) {
      throw new Error('Tenant creation returned no data');
    }

    logger.info('Tenant created', {
      requestId,
      tenant_id: tenant.id,
      tenant_slug: tenantSlug,
    });

    // 4. Enqueue onboarding job (BullMQ)
    // This will trigger the onboard-tenant.sh script via a worker
    const onboardingQueue = getOnboardingQueue(); // Assume this is injected/global

    const job = await onboardingQueue.add('onboard-tenant', {
      tenant_id: tenant.id,
      tenant_slug: tenantSlug,
      email,
      plan: 'business',
      request_id: requestId,
      trial: true,
      trial_end_at: tenant.trial_end_at,
    }, {
      priority: 1, // High priority
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    logger.info('Onboarding job enqueued', {
      requestId,
      job_id: job.id,
      tenant_slug: tenantSlug,
    });

    // 5. Send welcome email (via Resend)
    // This would call the Resend API or trigger another job
    try {
      await sendWelcomeEmail({
        email,
        company_name,
        tenant_slug: tenantSlug,
        dashboard_url: `https://portal.${process.env.PLATFORM_DOMAIN}/dashboard?tenant=${tenantSlug}`,
        request_id: requestId,
      });
    } catch (emailError) {
      logger.error('Failed to send welcome email', {
        requestId,
        error: emailError instanceof Error ? emailError.message : 'unknown',
      });
      // Don't fail the entire signup; email will be retried
    }

    // Return success with tenant info
    res.status(201).json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenantSlug,
        name: company_name,
        plan: 'business',
        status: 'trial',
        trial_end_at: tenant.trial_end_at,
      },
      stripe: {
        customer_id: customer.id,
        subscription_id: subscription.id,
      },
      message: 'Trial signup successful. Check your email for onboarding details.',
      request_id: requestId,
    });

  } catch (error) {
    logger.error('Trial signup failed', {
      requestId,
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'Trial signup failed',
      request_id: requestId,
    });
  }
});

/**
 * Stripe webhook: handle trial_created, payment_succeeded, trial_will_end
 */
router.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.trial_start && sub.trial_end) {
          const trialDays = Math.floor((sub.trial_end - sub.trial_start) / 86400);
          logger.info('Subscription trial created', {
            subscription_id: sub.id,
            trial_days: trialDays,
            trial_start: sub.trial_start,
            trial_end: sub.trial_end,
          });
          // Trial already enqueued at signup; just log
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription;
        logger.info('Trial ending soon', {
          subscription_id: sub.id,
          ends_at: sub.trial_end,
        });
        // TODO: Send "trial ending in 4 days" email
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          logger.info('Payment succeeded', {
            subscription_id: invoice.subscription,
            amount: invoice.amount_paid,
          });
          // TODO: Update tenant status to 'active'
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        logger.info('Subscription cancelled', {
          subscription_id: sub.id,
        });
        // TODO: Mark tenant as 'inactive'
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Helper functions
function generateRequestId(): string {
  return `trial_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateTenantSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export default router;
