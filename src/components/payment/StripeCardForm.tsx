'use client';

import { useState } from 'react';
import {
  CardElement,
  useStripe,
  useElements,
  type StripeCardElementChangeEvent,
} from '@stripe/react-stripe-js';

interface StripeCardFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  clientSecret?: string;
}

export function StripeCardForm({
  onSuccess,
  onError,
  clientSecret,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    setCardComplete(event.complete);
    setError(event.error?.message ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe is not loaded yet.');
      return;
    }

    if (!clientSecret) {
      setError('Payment client secret is missing.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found.');
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed.');
        onError?.(confirmError.message ?? 'Payment failed.');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        setError('Payment was not completed.');
        onError?.('Payment was not completed.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      onError?.(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        backgroundColor: '#fff',
      }}>
        <CardElement
          onChange={handleCardChange}
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#fa755a',
              },
            },
          }}
        />
      </div>

      {error && (
        <div style={{ color: '#fa755a', fontSize: '14px' }} role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !cardComplete || processing}
        style={{
          padding: '12px 24px',
          backgroundColor: processing ? '#aab7c4' : '#5469d4',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: processing ? 'not-allowed' : 'pointer',
        }}
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}