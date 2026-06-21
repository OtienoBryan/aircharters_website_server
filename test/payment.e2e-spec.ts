import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule } from '@nestjs/config';

describe('Payment System (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let testBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get auth token
    const userResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'payment-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Payment',
        lastName: 'Tester',
        authProvider: 'email',
      });

    authToken = userResponse.body.accessToken;
    testUserId = userResponse.body.user.id;

    // Create a test booking
    const bookingResponse = await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dealId: 1,
        totalPrice: 1500.00,
        onboardDining: true,
        groundTransportation: false,
        specialRequirements: 'Test booking for payment',
        billingRegion: 'US',
        paymentMethod: 'card',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            age: 35,
            nationality: 'US',
            idPassportNumber: 'US123456789'
          }
        ]
      });

    testBookingId = bookingResponse.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Payment Provider Endpoints', () => {
    describe('GET /api/payments/providers', () => {
      it('should return available payment providers', () => {
        return request(app.getHttpServer())
          .get('/api/payments/providers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('providers');
            expect(res.body.data).toHaveProperty('defaultProvider');
            expect(Array.isArray(res.body.data.providers)).toBe(true);
            expect(res.body.data.providers.length).toBeGreaterThan(0);
          });
      });
    });

    describe('POST /api/payments/create-intent', () => {
      it('should create a Stripe payment intent', () => {
        return request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: 1500.00,
            currency: 'USD',
            paymentMethod: 'card'
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('paymentIntentId');
            expect(res.body.data).toHaveProperty('clientSecret');
            expect(res.body.data).toHaveProperty('status');
            expect(res.body.data).toHaveProperty('requiresAction');
          });
      });

      it('should reject invalid amount', () => {
        return request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: -100,
            currency: 'USD'
          })
          .expect(400);
      });

      it('should reject missing booking ID', () => {
        return request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 1500.00,
            currency: 'USD'
          })
          .expect(400);
      });
    });

    describe('POST /api/payments/mpesa/stk-push', () => {
      it('should initiate M-Pesa STK push', () => {
        return request(app.getHttpServer())
          .post('/api/payments/mpesa/stk-push')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: 150000, // KES amount
            phoneNumber: '254700000000',
            description: 'Test M-Pesa payment'
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('paymentIntentId');
            expect(res.body.data).toHaveProperty('status');
            expect(res.body.data.status).toBe('pending');
          });
      });

      it('should reject invalid phone number format', () => {
        return request(app.getHttpServer())
          .post('/api/payments/mpesa/stk-push')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: 150000,
            phoneNumber: 'invalid-phone',
            description: 'Test M-Pesa payment'
          })
          .expect(400);
      });
    });
  });

  describe('Unified Payment System', () => {
    describe('POST /api/unified-payments/process', () => {
      it('should process payment with automatic provider selection', () => {
        return request(app.getHttpServer())
          .post('/api/unified-payments/process')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userId: parseInt(testUserId),
            companyId: 1,
            bookingId: testBookingId,
            amount: 1500.00,
            currency: 'USD',
            paymentMethod: 'card',
            description: 'Test unified payment'
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('transactionId');
            expect(res.body.data).toHaveProperty('provider');
            expect(res.body.data).toHaveProperty('status');
            expect(res.body.data).toHaveProperty('amount');
            expect(res.body.data).toHaveProperty('currency');
          });
      });

      it('should reject payment with invalid currency', () => {
        return request(app.getHttpServer())
          .post('/api/unified-payments/process')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userId: parseInt(testUserId),
            companyId: 1,
            bookingId: testBookingId,
            amount: 1500.00,
            currency: 'INVALID',
            paymentMethod: 'card',
            description: 'Test unified payment'
          })
          .expect(400);
      });
    });

    describe('GET /api/unified-payments/transaction/:transactionId', () => {
      it('should retrieve transaction details', async () => {
        // First create a transaction
        const processResponse = await request(app.getHttpServer())
          .post('/api/unified-payments/process')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userId: parseInt(testUserId),
            companyId: 1,
            bookingId: testBookingId,
            amount: 100.00,
            currency: 'USD',
            paymentMethod: 'card',
            description: 'Test transaction retrieval'
          });

        const transactionId = processResponse.body.data.transactionId;

        return request(app.getHttpServer())
          .get(`/api/unified-payments/transaction/${transactionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('transactionId');
            expect(res.body.data.transactionId).toBe(transactionId);
          });
      });

      it('should return 404 for non-existent transaction', () => {
        return request(app.getHttpServer())
          .get('/api/unified-payments/transaction/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  describe('Legacy Payment System', () => {
    describe('POST /api/payments', () => {
      it('should create a legacy payment', () => {
        return request(app.getHttpServer())
          .post('/api/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            paymentMethod: 'card',
            totalAmount: 1500.00,
            platformFee: 75.00,
            currency: 'USD'
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('bookingId');
            expect(res.body.data).toHaveProperty('paymentStatus');
            expect(res.body.data.paymentStatus).toBe('pending');
          });
      });
    });

    describe('GET /api/payments', () => {
      it('should retrieve user payments', () => {
        return request(app.getHttpServer())
          .get('/api/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      });
    });

    describe('GET /api/payments/booking/:bookingId', () => {
      it('should retrieve payments for specific booking', () => {
        return request(app.getHttpServer())
          .get(`/api/payments/booking/${testBookingId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      });
    });

    describe('PUT /api/payments/:id/status', () => {
      it('should update payment status', async () => {
        // First create a payment
        const createResponse = await request(app.getHttpServer())
          .post('/api/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            paymentMethod: 'card',
            totalAmount: 500.00,
            platformFee: 25.00,
            currency: 'USD'
          });

        const paymentId = createResponse.body.data.id;

        return request(app.getHttpServer())
          .put(`/api/payments/${paymentId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'completed',
            transactionId: 'test-transaction-123'
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data.paymentStatus).toBe('completed');
            expect(res.body.data.transactionId).toBe('test-transaction-123');
          });
      });
    });
  });

  describe('Payment Statistics', () => {
    describe('GET /api/payments/stats', () => {
      it('should retrieve payment statistics', () => {
        return request(app.getHttpServer())
          .get('/api/payments/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('totalPayments');
            expect(res.body.data).toHaveProperty('completedPayments');
            expect(res.body.data).toHaveProperty('pendingPayments');
            expect(res.body.data).toHaveProperty('failedPayments');
            expect(res.body.data).toHaveProperty('totalRevenue');
            expect(res.body.data).toHaveProperty('successRate');
          });
      });

      it('should retrieve company-specific statistics', () => {
        return request(app.getHttpServer())
          .get('/api/payments/stats?companyId=1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('totalPayments');
          });
      });
    });
  });

  describe('Refund Processing', () => {
    describe('POST /api/payments/refund/:paymentIntentId', () => {
      it('should create a refund', async () => {
        // First create a payment intent
        const intentResponse = await request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: 200.00,
            currency: 'USD'
          });

        const paymentIntentId = intentResponse.body.data.paymentIntentId;

        return request(app.getHttpServer())
          .post(`/api/payments/refund/${paymentIntentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 100.00,
            reason: 'Customer request'
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('amount');
            expect(res.body.data.amount).toBe(100);
          });
      });
    });
  });

  describe('Error Handling', () => {
    describe('Authentication Errors', () => {
      it('should reject requests without authentication', () => {
        return request(app.getHttpServer())
          .get('/api/payments/providers')
          .expect(401);
      });

      it('should reject requests with invalid token', () => {
        return request(app.getHttpServer())
          .get('/api/payments/providers')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid payment amounts', () => {
        return request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: 0,
            currency: 'USD'
          })
          .expect(400);
      });

      it('should reject unsupported currencies', () => {
        return request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: testBookingId,
            amount: 1500.00,
            currency: 'INVALID'
          })
          .expect(400);
      });
    });

    describe('Business Logic Errors', () => {
      it('should reject payment for non-existent booking', () => {
        return request(app.getHttpServer())
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookingId: 'non-existent-booking',
            amount: 1500.00,
            currency: 'USD'
          })
          .expect(400);
      });
    });
  });

  describe('Webhook Endpoints', () => {
    describe('POST /api/mpesa-callbacks/callback', () => {
      it('should process M-Pesa callback', () => {
        const callbackData = {
          Body: {
            stkCallback: {
              MerchantRequestID: 'test-merchant-request-id',
              CheckoutRequestID: 'test-checkout-request-id',
              ResultCode: 0,
              ResultDesc: 'Success',
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: 150000 },
                  { Name: 'MpesaReceiptNumber', Value: 'test-receipt-123' },
                  { Name: 'TransactionDate', Value: '20250115143022' },
                  { Name: 'PhoneNumber', Value: '254700000000' }
                ]
              }
            }
          }
        };

        return request(app.getHttpServer())
          .post('/api/mpesa-callbacks/callback')
          .send(callbackData)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('status');
            expect(res.body.data.status).toBe('succeeded');
          });
      });

      it('should handle failed M-Pesa callback', () => {
        const callbackData = {
          Body: {
            stkCallback: {
              MerchantRequestID: 'test-merchant-request-id',
              CheckoutRequestID: 'test-checkout-request-id',
              ResultCode: 1,
              ResultDesc: 'Failed'
            }
          }
        };

        return request(app.getHttpServer())
          .post('/api/mpesa-callbacks/callback')
          .send(callbackData)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('status');
            expect(res.body.data.status).toBe('failed');
          });
      });
    });
  });
});
