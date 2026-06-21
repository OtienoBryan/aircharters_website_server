import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderService } from '../src/modules/payments/services/payment-provider.service';
import { StripeProvider } from '../src/modules/payments/providers/stripe.provider';
import { MpesaProvider } from '../src/modules/payments/providers/mpesa.provider';
import { PaymentProviderType } from '../src/modules/payments/interfaces/payment-provider.interface';

describe('PaymentProviderService', () => {
  let service: PaymentProviderService;
  let stripeProvider: StripeProvider;
  let mpesaProvider: MpesaProvider;
  let configService: ConfigService;

  const mockStripeProvider = {
    name: 'Stripe',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedPaymentMethods: ['card'],
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    getPaymentStatus: jest.fn(),
    createRefund: jest.fn(),
  };

  const mockMpesaProvider = {
    name: 'M-Pesa',
    supportedCurrencies: ['KES'],
    supportedPaymentMethods: ['mobile_money'],
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    getPaymentStatus: jest.fn(),
    createRefund: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProviderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: StripeProvider,
          useValue: mockStripeProvider,
        },
        {
          provide: MpesaProvider,
          useValue: mockMpesaProvider,
        },
      ],
    }).compile();

    service = module.get<PaymentProviderService>(PaymentProviderService);
    stripeProvider = module.get<StripeProvider>(StripeProvider);
    mpesaProvider = module.get<MpesaProvider>(MpesaProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProvider', () => {
    it('should return Stripe provider', () => {
      const provider = service.getProvider(PaymentProviderType.STRIPE);
      expect(provider).toBe(stripeProvider);
    });

    it('should return M-Pesa provider', () => {
      const provider = service.getProvider(PaymentProviderType.MPESA);
      expect(provider).toBe(mpesaProvider);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        service.getProvider('UNSUPPORTED' as PaymentProviderType);
      }).toThrow('Payment provider UNSUPPORTED not found');
    });
  });

  describe('getDefaultProvider', () => {
    it('should return Stripe as default provider', () => {
      const provider = service.getDefaultProvider();
      expect(provider).toBe(stripeProvider);
    });
  });

  describe('createPaymentIntent', () => {
    const mockRequest = {
      amount: 1000,
      currency: 'USD',
      bookingId: 'test-booking-123',
      userId: 'test-user-123',
      description: 'Test payment',
      metadata: {},
    };

    it('should create payment intent with Stripe', async () => {
      const mockResponse = {
        id: 'pi_test_123',
        clientSecret: 'pi_test_secret_123',
        status: 'requires_payment_method',
        amount: 1000,
        currency: 'USD',
        requiresAction: false,
        nextAction: null,
      };

      mockStripeProvider.createPaymentIntent.mockResolvedValue(mockResponse);

      const result = await service.createPaymentIntent(mockRequest, PaymentProviderType.STRIPE);

      expect(mockStripeProvider.createPaymentIntent).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should create payment intent with M-Pesa', async () => {
      const mockResponse = {
        id: 'mpesa_checkout_123',
        status: 'pending',
        amount: 100000,
        currency: 'KES',
        paymentMethod: 'mobile_money',
        requiresAction: true,
        nextAction: {
          type: 'mpesa_stk_push',
          message: 'Please check your phone',
        },
      };

      mockMpesaProvider.createPaymentIntent.mockResolvedValue(mockResponse);

      const result = await service.createPaymentIntent(
        { ...mockRequest, currency: 'KES', amount: 100000 },
        PaymentProviderType.MPESA
      );

      expect(mockMpesaProvider.createPaymentIntent).toHaveBeenCalledWith({
        ...mockRequest,
        currency: 'KES',
        amount: 100000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for unsupported currency', async () => {
      const requestWithUnsupportedCurrency = {
        ...mockRequest,
        currency: 'INVALID',
      };

      await expect(
        service.createPaymentIntent(requestWithUnsupportedCurrency, PaymentProviderType.STRIPE)
      ).rejects.toThrow('Currency INVALID not supported by Stripe');
    });

    it('should use default provider when not specified', async () => {
      const mockResponse = {
        id: 'pi_test_123',
        clientSecret: 'pi_test_secret_123',
        status: 'requires_payment_method',
        amount: 1000,
        currency: 'USD',
        requiresAction: false,
        nextAction: null,
      };

      mockStripeProvider.createPaymentIntent.mockResolvedValue(mockResponse);

      const result = await service.createPaymentIntent(mockRequest);

      expect(mockStripeProvider.createPaymentIntent).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle provider errors', async () => {
      const error = new Error('Provider error');
      mockStripeProvider.createPaymentIntent.mockRejectedValue(error);

      await expect(
        service.createPaymentIntent(mockRequest, PaymentProviderType.STRIPE)
      ).rejects.toThrow('Provider error');
    });
  });

  describe('confirmPayment', () => {
    const mockRequest = {
      paymentIntentId: 'pi_test_123',
      paymentMethodId: 'pm_test_123',
    };

    it('should confirm payment with Stripe', async () => {
      const mockResponse = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 1000,
        currency: 'USD',
        transactionId: 'ch_test_123',
        paymentMethod: 'card',
        metadata: {},
      };

      mockStripeProvider.confirmPayment.mockResolvedValue(mockResponse);

      const result = await service.confirmPayment(mockRequest, PaymentProviderType.STRIPE);

      expect(mockStripeProvider.confirmPayment).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should use default provider when not specified', async () => {
      const mockResponse = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 1000,
        currency: 'USD',
        transactionId: 'ch_test_123',
        paymentMethod: 'card',
        metadata: {},
      };

      mockStripeProvider.confirmPayment.mockResolvedValue(mockResponse);

      const result = await service.confirmPayment(mockRequest);

      expect(mockStripeProvider.confirmPayment).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status from Stripe', async () => {
      const mockResponse = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 1000,
        currency: 'USD',
        transactionId: 'ch_test_123',
        paymentMethod: 'card',
        metadata: {},
      };

      mockStripeProvider.getPaymentStatus.mockResolvedValue(mockResponse);

      const result = await service.getPaymentStatus('pi_test_123', PaymentProviderType.STRIPE);

      expect(mockStripeProvider.getPaymentStatus).toHaveBeenCalledWith('pi_test_123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createRefund', () => {
    it('should create refund with Stripe', async () => {
      const mockResponse = {
        id: 're_test_123',
        amount: 500,
        status: 'succeeded',
        reason: 'requested_by_customer',
      };

      mockStripeProvider.createRefund.mockResolvedValue(mockResponse);

      const result = await service.createRefund('pi_test_123', 500, 'Customer request', PaymentProviderType.STRIPE);

      expect(mockStripeProvider.createRefund).toHaveBeenCalledWith('pi_test_123', 500, 'Customer request');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for provider without refund support', () => {
      mockMpesaProvider.createRefund = undefined;

      expect(() => {
        service.createRefund('mpesa_checkout_123', 500, 'Customer request', PaymentProviderType.MPESA);
      }).toThrow('Refunds not supported by M-Pesa');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return array of supported providers', () => {
      const providers = service.getSupportedProviders();
      expect(providers).toContain(PaymentProviderType.STRIPE);
      expect(providers).toContain(PaymentProviderType.MPESA);
    });
  });

  describe('getProviderInfo', () => {
    it('should return Stripe provider info', () => {
      const info = service.getProviderInfo(PaymentProviderType.STRIPE);
      expect(info).toEqual({
        name: 'Stripe',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedPaymentMethods: ['card'],
      });
    });

    it('should return M-Pesa provider info', () => {
      const info = service.getProviderInfo(PaymentProviderType.MPESA);
      expect(info).toEqual({
        name: 'M-Pesa',
        supportedCurrencies: ['KES'],
        supportedPaymentMethods: ['mobile_money'],
      });
    });
  });
});
