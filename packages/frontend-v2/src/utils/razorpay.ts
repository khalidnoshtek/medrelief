/**
 * Lazy-loads the Razorpay Checkout SDK.
 * https://checkout.razorpay.com/v1/checkout.js
 */
let sdkLoaded: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (sdkLoaded) return sdkLoaded;
  sdkLoaded = new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return sdkLoaded;
}

export interface RzpOpenOptions {
  key: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  onSuccess: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onDismiss?: () => void;
  onError?: (err: any) => void;
}

export async function openRazorpay(opts: RzpOpenOptions) {
  const ok = await loadRazorpay();
  if (!ok) throw new Error('Failed to load Razorpay SDK');
  const rzp = new (window as any).Razorpay({
    key: opts.key,
    order_id: opts.order_id,
    amount: opts.amount,
    currency: opts.currency,
    name: opts.name,
    description: opts.description || 'Lab services',
    prefill: opts.prefill,
    theme: { color: opts.theme?.color || '#1e40af' },
    modal: {
      ondismiss: () => opts.onDismiss?.(),
    },
    handler: (response: any) => opts.onSuccess(response),
  });
  rzp.on('payment.failed', (resp: any) => opts.onError?.(resp.error));
  rzp.open();
}
