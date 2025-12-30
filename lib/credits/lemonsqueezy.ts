import { serverEnv } from "@/lib/env";

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

interface CreateCheckoutParams {
  variantId: string;
  userId: string;
  packageId: string;
  credits: number;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

interface CheckoutResponse {
  data: {
    id: string;
    attributes: {
      url: string;
    };
  };
}

export async function createCheckout(params: CreateCheckoutParams) {
  const response = await fetch(`${LEMONSQUEEZY_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${serverEnv.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.userEmail,
            custom: {
              user_id: params.userId,
              package_id: params.packageId,
              credits: params.credits.toString(),
            },
          },
          product_options: {
            redirect_url: params.successUrl,
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: serverEnv.LEMONSQUEEZY_STORE_ID,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: params.variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lemon Squeezy API error:", errorText);
    throw new Error(
      `Lemon Squeezy API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: CheckoutResponse = await response.json();
  return {
    checkoutId: data.data.id,
    url: data.data.attributes.url,
  };
}
