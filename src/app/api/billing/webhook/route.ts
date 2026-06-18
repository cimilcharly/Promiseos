import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use service role key since webhook needs to bypass RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-01-27.acacia' as any,
  });

  const signature = req.headers.get('stripe-signature') || '';
  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed:`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    const session = event.data.object as any;

    switch (event.type) {
      case 'checkout.session.completed': {
        const orgId = session.metadata?.org_id;
        const planName = session.metadata?.plan_name;

        if (orgId && planName) {
          // Update organization details
          const { error } = await supabaseAdmin
            .from('organizations')
            .update({
              plan: planName.toLowerCase(),
              stripe_subscription_id: session.subscription,
            })
            .eq('id', orgId);

          if (error) throw error;
          console.log(`✅ Organization ${orgId} plan updated to ${planName}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Lookup customer metadata to get organization ID
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        const orgId = customer.metadata?.org_id;

        if (orgId) {
          let planName = 'starter';
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            // Find price ID mapping or extract plan from active items
            // For now, let's keep current plan, or query the price ID
            console.log(`Subscription updated for org ${orgId}: ${subscription.status}`);
          } else {
            // If subscription is unpaid, past_due, canceled, downgrade to starter
            planName = 'starter';
            const { error } = await supabaseAdmin
              .from('organizations')
              .update({
                plan: planName,
                stripe_subscription_id: null,
              })
              .eq('id', orgId);

            if (error) throw error;
            console.log(`⚠️ Subscription lapsed. Downgraded organization ${orgId} to Starter.`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        const orgId = customer.metadata?.org_id;

        if (orgId) {
          const { error } = await supabaseAdmin
            .from('organizations')
            .update({
              plan: 'starter',
              stripe_subscription_id: null,
            })
            .eq('id', orgId);

          if (error) throw error;
          console.log(`❌ Subscription deleted. Downgraded organization ${orgId} to Starter.`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler database error:', error);
    return NextResponse.json({ error: error.message || 'Webhook database error' }, { status: 500 });
  }
}
