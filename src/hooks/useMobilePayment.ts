import { useState, useCallback } from 'react';
import { loadStripe, PaymentRequest, PaymentRequestPaymentMethodEvent } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * KÖZPONTI MOBILFIZETÉSI HOOK
 * 
 * Natív mobilfizetés kezelése (Apple Pay / Google Pay / kártya).
 * Használat:
 * 
 * const { startPayment, isProcessing } = useMobilePayment();
 * 
 * await startPayment({
 *   productType: 'speed_booster',
 *   amount: 199,
 *   currency: 'usd',
 *   displayName: 'Speed Booster',
 *   metadata: { booster: '1' }
 * });
 */

interface PaymentParams {
  productType: 'coins' | 'speed_booster' | 'premium_booster' | 'instant_rescue' | 'lootbox';
  amount: number; // cents
  currency: 'usd' | 'huf';
  displayName: string; // Termék neve (pl. "1 Ajándékdoboz")
  metadata?: Record<string, string>; // Extra adatok
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useMobilePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);

  const startPayment = useCallback(async (params: PaymentParams) => {
    const { productType, amount, currency, displayName, metadata = {}, onSuccess, onError } = params;

    setIsProcessing(true);

    try {
      // 1. PaymentIntent létrehozása a backenddel
      const { data: intentData, error: intentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: { productType, amount, currency, metadata }
        }
      );

      if (intentError || !intentData?.clientSecret) {
        throw new Error(intentError?.message || 'Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = intentData;

      // 2. Stripe inicializálás
      const stripe = await loadStripe('pk_test_51SKlmJKKw7HPC0ZDrqmnAspTdgyOR4leFEO0DnOhSnBxcoLr4erjomPcjYJ3Fa3K6zoX64IyN8deqyzELpfpIYlx001m5g7ctj');
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // 3. Payment Request API ellenőrzés (natív fizetés támogatás)
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: currency.toLowerCase(),
        total: {
          label: displayName,
          amount: amount,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Támogatottság ellenőrzése (Apple Pay / Google Pay)
      const canMakePayment = await pr.canMakePayment();

      if (canMakePayment) {
        // NATÍV FIZETÉS (Apple Pay / Google Pay)
        console.log('[useMobilePayment] Using native payment:', canMakePayment);

        pr.on('paymentmethod', async (ev: PaymentRequestPaymentMethodEvent) => {
          try {
            // PaymentIntent megerősítése
            const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
              clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: false }
            );

            if (confirmError) {
              ev.complete('fail');
              throw confirmError;
            }

            ev.complete('success');

            // Backend verifikáció és jutalom jóváírás
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-payment-intent',
              { body: { paymentIntentId: paymentIntent?.id } }
            );

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyError?.message || 'Payment verification failed');
            }

            toast.success('Sikeres vásárlás! 🎉');
            onSuccess?.();
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Payment failed';
            toast.error(`Fizetés sikertelen: ${errorMsg}`);
            onError?.(errorMsg);
          } finally {
            setIsProcessing(false);
          }
        });

        // Natív fizetési sheet megjelenítése
        pr.show();
        setPaymentRequest(pr);
      } else {
        // FALLBACK: Stripe Elements (kártyás fizetés)
        console.log('[useMobilePayment] Native payment not available, using Stripe Elements');
        
        // Stripe Elements form megjelenítése (modal vagy új oldal)
        // Itt meghívhatod a meglévő Stripe Elements komponensedet vagy használhatsz Stripe Checkout-ot
        
        // Egyszerűsített megoldás: Stripe confirmCardPayment meghívása közvetlenül
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

        if (confirmError) {
          throw confirmError;
        }

        // Backend verifikáció
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
          'verify-payment-intent',
          { body: { paymentIntentId: paymentIntent?.id } }
        );

        if (verifyError || !verifyData?.success) {
          throw new Error(verifyError?.message || 'Payment verification failed');
        }

        toast.success('Sikeres vásárlás! 🎉');
        onSuccess?.();
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[useMobilePayment] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Vásárlás sikertelen: ${errorMsg}`);
      onError?.(errorMsg);
      setIsProcessing(false);
    }
  }, []);

  return { startPayment, isProcessing, paymentRequest };
};
