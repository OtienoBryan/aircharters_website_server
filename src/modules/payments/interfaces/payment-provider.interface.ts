export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  bookingId: string;
  userId: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret?: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  requiresAction?: boolean;
  nextAction?: any;
  metadata?: Record<string, any>;
}

export interface PaymentConfirmationRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentConfirmationResponse {
  id: string;
  status: 'succeeded' | 'failed' | 'pending' | 'cancelled';
  amount: number;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface PaymentProvider {
  name: string;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
  
  // Core payment methods
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;
  confirmPayment(request: PaymentConfirmationRequest): Promise<PaymentConfirmationResponse>;
  getPaymentStatus(paymentIntentId: string): Promise<PaymentConfirmationResponse>;
  
  // Optional methods for advanced features
  createRefund?(paymentIntentId: string, amount?: number, reason?: string): Promise<any>;
  getPaymentMethods?(userId: string): Promise<PaymentMethod[]>;
  savePaymentMethod?(userId: string, paymentMethodData: any): Promise<PaymentMethod>;
  deletePaymentMethod?(paymentMethodId: string): Promise<boolean>;
}

export enum PaymentProviderType {
  STRIPE = 'stripe',
  MPESA = 'mpesa',
  PAYSTACK = 'paystack',
  PAYPAL = 'paypal',
  FLUTTERWAVE = 'flutterwave',
} 