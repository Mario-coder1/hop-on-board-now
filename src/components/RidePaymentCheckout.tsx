import { useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface RidePaymentCheckoutProps {
  rideId: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address?: string; lat?: number; lng?: number };
  message?: string;
  returnUrl: string;
}

export function RidePaymentCheckout({
  rideId, pickup, dropoff, message, returnUrl,
}: RidePaymentCheckoutProps) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-ride-payment", {
      body: {
        ride_id: rideId,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address || null,
        dropoff_lat: dropoff.lat ?? null,
        dropoff_lng: dropoff.lng ?? null,
        message: message || null,
        environment: getStripeEnvironment(),
        return_url: returnUrl,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Nepodarilo sa vytvoriť platobnú reláciu");
    }
    return data.clientSecret;
  }, [rideId, pickup, dropoff, message, returnUrl]);

  return (
    <div id="ride-checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
