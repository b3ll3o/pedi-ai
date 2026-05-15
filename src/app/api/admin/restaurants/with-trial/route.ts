import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const TRIAL_DAYS = 14;
const MONTHLY_PRICE = 19.99; // R$ 19,99

/**
 * Get trial and subscription info for the current user's restaurants
 * GET /api/admin/restaurants/with-trial
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Get restaurant settings for this owner
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('restaurant_settings')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') { // Not found
      console.error('Error fetching restaurant settings:', settingsError);
    }

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    let subscriptionStatus: 'trial' | 'active' | 'expired' = 'trial';
    let firstRestaurantCreatedAt: string | null = null;

    if (settings) {
      firstRestaurantCreatedAt = settings.first_restaurant_created_at;
      const createdAt = new Date(settings.first_restaurant_created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceCreation);
      subscriptionStatus = settings.subscription_status as 'trial' | 'active' | 'expired';
      
      // Update trial_days_remaining if changed
      if (trialDaysRemaining !== settings.trial_days_remaining) {
        await supabaseAdmin
          .from('restaurant_settings')
          .update({ trial_days_remaining: trialDaysRemaining })
          .eq('owner_id', user.id);
      }

      // Auto-expire if trial ended and not active
      if (trialDaysRemaining === 0 && subscriptionStatus === 'trial') {
        subscriptionStatus = 'expired';
        await supabaseAdmin
          .from('restaurant_settings')
          .update({ subscription_status: 'expired' })
          .eq('owner_id', user.id);
      }
    }

    // Check if user has any restaurants
    const { data: profiles } = await supabaseAdmin
      .from('users_profiles')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .eq('role', 'dono');

    const hasRestaurants = profiles && profiles.length > 0;
    const isFirstRestaurant = !hasRestaurants;

    return NextResponse.json({
      trialDaysRemaining,
      subscriptionStatus,
      firstRestaurantCreatedAt,
      monthlyPrice: MONTHLY_PRICE,
      isFirstRestaurant,
      hasRestaurants,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/with-trial:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Initialize trial when first restaurant is created
 * POST /api/admin/restaurants/with-trial
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Check if settings already exist
    const { data: existingSettings } = await supabaseAdmin
      .from('restaurant_settings')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (existingSettings) {
      return NextResponse.json({
        message: 'Configurações já existem',
        settings: existingSettings,
      });
    }

    // Create new settings with trial
    const now = new Date().toISOString();
    const { data: newSettings, error: insertError } = await supabaseAdmin
      .from('restaurant_settings')
      .insert({
        owner_id: user.id,
        first_restaurant_created_at: now,
        trial_days_remaining: TRIAL_DAYS,
        subscription_status: 'trial',
        monthly_price_cents: Math.round(MONTHLY_PRICE * 100),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating restaurant settings:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar configurações de assinatura' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Período de teste iniciado',
      settings: newSettings,
      trialDays: TRIAL_DAYS,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants/with-trial:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
