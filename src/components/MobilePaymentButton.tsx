import React from 'react';
import { PaymentRequestButtonElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMobilePayment } from '@/hooks/useMobilePayment';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

/**
 * ÚJRAFELHASZNÁLHATÓ MOBILFIZETÉSI GOMB
 * 
 * Automatikusan Apple Pay / Google Pay gombot jelenít meg, ha elérhető.
 * Egyébként fallback gomb standard fizetéshez.
 * 
 * Használat:
 * <MobilePaymentButton
 *   productType="speed_booster"
 *   amount={199}
 *   currency="usd"
 *   displayName="Speed Booster"
 *   metadata={{ booster: '1' }}
 *   buttonText="Megszerzem"
 *   onSuccess={() => console.log('Success!')}
 * />
 */

const stripePromise = loadStripe('pk_test_51SKlmJKKw7HPC0ZDrqmnAspTdgyOR4leFEO0DnOhSnBxcoLr4erjomPcjYJ3Fa3K6zoX64IyN8deqyzELpfpIYlx001m5g7ctj');

interface MobilePaymentButtonProps {
  productType: 'speed_booster' | 'premium_booster' | 'instant_rescue';
  amount: number; // cents
  currency: 'usd' | 'huf';
  displayName: string;
  metadata?: Record<string, string>;
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const MobilePaymentButton: React.FC<MobilePaymentButtonProps> = ({
  productType,
  amount,
  currency,
  displayName,
  metadata,
  buttonText = 'Fizetés',
  className,
  onSuccess,
  onError,
}) => {
  const { startPayment, isProcessing, paymentRequest } = useMobilePayment();

  const handleClick = async () => {
    await startPayment({
      productType,
      amount,
      currency,
      displayName,
      metadata,
      onSuccess,
      onError,
    });
  };

  return (
    <Elements stripe={stripePromise}>
      <div className={className}>
        {/* NATÍV FIZETÉSI GOMB (Apple Pay / Google Pay) */}
        {paymentRequest && (
          <PaymentRequestButtonElement
            options={{ paymentRequest }}
            className="mb-2"
          />
        )}

        {/* FALLBACK GOMB (ha natív fizetés nem elérhető) */}
        {!paymentRequest && (
          <Button
            onClick={handleClick}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Feldolgozás...
              </>
            ) : (
              buttonText
            )}
          </Button>
        )}
      </div>
    </Elements>
  );
};
