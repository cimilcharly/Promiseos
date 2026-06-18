import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { priceId, planName } = await req.json();

    if (!priceId || !planName) {
      return NextResponse.json({ error: 'priceId and planName are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's profile to get org_id and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is admin
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can update billing plans' }, { status: 403 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';

    // If Stripe is not configured, simulate successful checkout redirection
    if (!stripeKey || stripeKey === 'mock-key') {
      console.log(`💳 Stripe Checkout session simulated (no key configured). Plan: ${planName}`);
      const successUrl = `${new URL(req.url).origin}/settings?mock_stripe_checkout=success&plan=${planName}`;
      return NextResponse.json({ url: successUrl });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });

    // Get organization details to check for stripe_customer_id
    const { data: org } = await supabase
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', profile.org_id)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      // Create a customer in Stripe
      const customer = await stripe.customers.create({
        email: profile.email,
        name: org?.name || 'Workspace',
        metadata: {
          org_id: profile.org_id,
        },
      });
      customerId = customer.id;

      // Update org with Stripe Customer ID
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.org_id);
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${new URL(req.url).origin}/settings?stripe_checkout=success`,
      cancel_url: `${new URL(req.url).origin}/settings?stripe_checkout=cancel`,
      metadata: {
        org_id: profile.org_id,
        plan_name: planName,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error in Stripe checkout route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
