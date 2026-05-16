import { NextRequest, NextResponse } from 'next/server';
import { isDevDatabase, getSupabaseAdmin, db } from '@/infrastructure/database';
import { subscriptions } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id é obrigatório' },
        { status: 400 }
      );
    }

    // Verify user has access to this restaurant
    // Note: In production, you'd verify via requireAuth() here
    // For now we rely on the restaurant_id being passed and validated elsewhere

    if (isDevDatabase()) {
      const result = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.restaurant_id, restaurantId))
        .limit(1);

      const subscription = result[0];

      if (!subscription) {
        return NextResponse.json({
          subscription: null,
          acesso: {
            ativo: false,
            status: 'expired',
            diasRestantes: 0,
            bloqueado: true,
          },
        });
      }

      // Calculate days remaining
      const trialEndsAt = new Date(subscription.trial_ends_at);
      const now = new Date();
      const diffMs = trialEndsAt.getTime() - now.getTime();
      const diasRestantes = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );

      const períodoAtivo =
        (subscription.status === 'trial' && diasRestantes > 0) ||
        (subscription.status === 'active' &&
          subscription.subscription_ends_at &&
          new Date(subscription.subscription_ends_at) > now);

      return NextResponse.json({
        subscription,
        acesso: {
          ativo: períodoAtivo,
          status: subscription.status,
          diasRestantes: subscription.status === 'trial' ? diasRestantes : 0,
          bloqueado: !períodoAtivo,
        },
      });
    } else {
      const supabase = getSupabaseAdmin();

      // Verify user has access to this restaurant
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('users_profiles')
        .select('role')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (!profile) {
        return NextResponse.json(
          { error: 'Acesso negado a este restaurante' },
          { status: 403 }
        );
      }

      // Get subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
        return NextResponse.json(
          { error: 'Erro ao buscar assinatura' },
          { status: 500 }
        );
      }

      if (!subscription) {
        return NextResponse.json({
          subscription: null,
          acesso: {
            ativo: false,
            status: 'expired',
            diasRestantes: 0,
            bloqueado: true,
          },
        });
      }

      // Calculate days remaining
      const trialEndsAt = new Date(subscription.trial_ends_at);
      const now = new Date();
      const diffMs = trialEndsAt.getTime() - now.getTime();
      const diasRestantes = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );

      const períodoAtivo =
        (subscription.status === 'trial' && diasRestantes > 0) ||
        (subscription.status === 'active' &&
          subscription.subscription_ends_at &&
          new Date(subscription.subscription_ends_at) > now);

      return NextResponse.json({
        subscription,
        acesso: {
          ativo: períodoAtivo,
          status: subscription.status,
          diasRestantes: subscription.status === 'trial' ? diasRestantes : 0,
          bloqueado: !períodoAtivo,
        },
      });
    }
  } catch (error) {
    console.error('Error in GET /api/admin/subscriptions:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, action } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id é obrigatório' },
        { status: 400 }
      );
    }

    if (isDevDatabase()) {
      if (action === 'start_trial') {
        // Check if subscription already exists
        const existing = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.restaurant_id, restaurant_id))
          .limit(1);

        if (existing.length > 0) {
          return NextResponse.json(
            { error: 'Restaurante já possui assinatura' },
            { status: 409 }
          );
        }

        const trialDays = 14;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        const now = new Date().toISOString();
        const newSubscription = {
          id: crypto.randomUUID(),
          restaurant_id,
          status: 'trial',
          plan_type: 'trial',
          price_cents: 0,
          currency: 'BRL',
          trial_started_at: now,
          trial_ends_at: trialEndsAt.toISOString(),
          trial_days: trialDays,
          created_at: now,
          updated_at: now,
          version: 1,
        };

        await db.insert(subscriptions).values(newSubscription);

        return NextResponse.json({ subscription: newSubscription }, { status: 201 });
      }

      if (action === 'activate') {
        const existingResult = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.restaurant_id, restaurant_id))
          .limit(1);

        if (existingResult.length === 0) {
          return NextResponse.json(
            { error: 'Assinatura não encontrada' },
            { status: 404 }
          );
        }

        const planType = body.plan_type || 'monthly';
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setDate(
          subscriptionEndsAt.getDate() + (planType === 'yearly' ? 365 : 30)
        );

        const now = new Date().toISOString();
        await db
          .update(subscriptions)
          .set({
            status: 'active',
            plan_type: planType,
            price_cents: planType === 'yearly' ? 19990 : 1999,
            subscription_started_at: now,
            subscription_ends_at: subscriptionEndsAt.toISOString(),
            updated_at: now,
          })
          .where(eq(subscriptions.restaurant_id, restaurant_id));

        const updatedResult = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.restaurant_id, restaurant_id))
          .limit(1);

        return NextResponse.json({ subscription: updatedResult[0] });
      }

      return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
    } else {
      const supabase = getSupabaseAdmin();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }

      // Verify user is owner of restaurant
      const { data: profile } = await supabase
        .from('users_profiles')
        .select('role')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant_id)
        .single();

      if (!profile || profile.role !== 'dono') {
        return NextResponse.json(
          { error: 'Apenas o proprietário pode gerenciar assinaturas' },
          { status: 403 }
        );
      }

      if (action === 'start_trial') {
        // Check if subscription already exists
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('restaurant_id', restaurant_id)
          .single();

        if (existing) {
          return NextResponse.json(
            { error: 'Restaurante já possui assinatura' },
            { status: 409 }
          );
        }

        const trialDays = 14;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        const { data: subscription, error: createError } = await supabase
          .from('subscriptions')
          .insert({
            restaurant_id,
            status: 'trial',
            trial_days: trialDays,
            trial_started_at: new Date().toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating subscription:', createError);
          return NextResponse.json(
            { error: 'Erro ao criar assinatura' },
            { status: 500 }
          );
        }

        return NextResponse.json({ subscription }, { status: 201 });
      }

      if (action === 'activate') {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('restaurant_id', restaurant_id)
          .single();

        if (!existing) {
          return NextResponse.json(
            { error: 'Assinatura não encontrada' },
            { status: 404 }
          );
        }

        const planType = body.plan_type || 'monthly';
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setDate(
          subscriptionEndsAt.getDate() + (planType === 'yearly' ? 365 : 30)
        );

        const { data: subscription, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_type: planType,
            price_cents: planType === 'yearly' ? 19990 : 1999,
            subscription_started_at: new Date().toISOString(),
            subscription_ends_at: subscriptionEndsAt.toISOString(),
          })
          .eq('restaurant_id', restaurant_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error activating subscription:', updateError);
          return NextResponse.json(
            { error: 'Erro ao ativar assinatura' },
            { status: 500 }
          );
        }

        return NextResponse.json({ subscription });
      }

      return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/subscriptions:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
