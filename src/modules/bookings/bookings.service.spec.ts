import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from '../../common/entities/booking.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { Passenger } from '../../common/entities/passenger.entity';
import { BookingTimeline } from '../../common/entities/booking-timeline.entity';
import { User } from '../../common/entities/user.entity';
import { EmailService } from '../email/email.service';
import { BookingPaymentService } from './services/booking-payment.service';
import { BookingTimelineService } from './services/booking-timeline.service';
import { BookingQueryService } from './services/booking-query.service';
import { PaymentProviderService } from '../payments/services/payment-provider.service';
import { BookingStatus, PaymentStatus } from '../../common/entities/booking.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let emailService: EmailService;
  let bookingRepository: Repository<Booking>;
  let charterDealRepository: Repository<CharterDeal>;
  let passengerRepository: Repository<Passenger>;
  let timelineRepository: Repository<BookingTimeline>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  const mockBookingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockCharterDealRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockPassengerRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTimelineRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(),
  };

  const mockEmailService = {
    sendBookingConfirmationEmail: jest.fn(),
  };

  const mockBookingPaymentService = {
    processPayment: jest.fn(),
  };

  const mockBookingTimelineService = {
    createTimelineEvent: jest.fn(),
  };

  const mockBookingQueryService = {
    findOne: jest.fn(),
  };

  const mockPaymentProviderService = {
    createPaymentIntent: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      create: jest.fn(),
    },
    isTransactionActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(CharterDeal),
          useValue: mockCharterDealRepository,
        },
        {
          provide: getRepositoryToken(Passenger),
          useValue: mockPassengerRepository,
        },
        {
          provide: getRepositoryToken(BookingTimeline),
          useValue: mockTimelineRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: BookingPaymentService,
          useValue: mockBookingPaymentService,
        },
        {
          provide: BookingTimelineService,
          useValue: mockBookingTimelineService,
        },
        {
          provide: BookingQueryService,
          useValue: mockBookingQueryService,
        },
        {
          provide: PaymentProviderService,
          useValue: mockPaymentProviderService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    emailService = module.get<EmailService>(EmailService);
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    charterDealRepository = module.get<Repository<CharterDeal>>(getRepositoryToken(CharterDeal));
    passengerRepository = module.get<Repository<Passenger>>(getRepositoryToken(Passenger));
    timelineRepository = module.get<Repository<BookingTimeline>>(getRepositoryToken(BookingTimeline));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);

    // Setup default mocks
    mockDataSource.getRepository.mockReturnValue(mockUserRepository);
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmBooking', () => {
    const mockBooking = {
      id: '1',
      userId: 'user-123',
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      referenceNumber: 'AC123456TEST',
      totalPrice: 500,
      user: {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      },
      deal: {
        originName: 'Nairobi',
        destinationName: 'Mombasa',
        date: new Date('2024-01-15'),
        time: '10:00 AM',
        aircraft: {
          name: 'Cessna 172',
        },
        company: {
          companyName: 'Air Charters Kenya',
        },
      },
    };

    const mockUpdatedBooking = {
      ...mockBooking,
      bookingStatus: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
    };

    beforeEach(() => {
      mockBookingQueryService.findOne.mockResolvedValue(mockBooking);
      mockBookingPaymentService.processPayment.mockResolvedValue(mockUpdatedBooking);
    });

    it('should send booking confirmation email on successful confirmation', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentTransactionId = 'TXN123456';
      mockEmailService.sendBookingConfirmationEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      // Act
      const result = await service.confirmBooking('1', userId, paymentTransactionId);

      // Assert
      expect(mockEmailService.sendBookingConfirmationEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          referenceNumber: 'AC123456TEST',
          passengerName: 'John Doe',
          departure: 'Nairobi',
          destination: 'Mombasa',
          date: '1/15/2024',
          time: '10:00 AM',
          aircraft: 'Cessna 172',
          company: 'Air Charters Kenya',
          totalAmount: 500,
        }
      );

      expect(result).toEqual({
        id: '1',
        referenceNumber: 'AC123456TEST',
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        confirmationEmail: expect.any(String),
      });
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentTransactionId = 'TXN123456';
      const emailError = new Error('Email sending failed');
      mockEmailService.sendBookingConfirmationEmail.mockRejectedValue(emailError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await service.confirmBooking('1', userId, paymentTransactionId);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send booking confirmation email:',
        emailError
      );
      
      // Booking should still be confirmed even if email fails
      expect(result).toEqual({
        id: '1',
        referenceNumber: 'AC123456TEST',
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        confirmationEmail: expect.any(String),
      });

      consoleSpy.mockRestore();
    });

    it('should not fail booking confirmation when email service is unavailable', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentTransactionId = 'TXN123456';
      mockEmailService.sendBookingConfirmationEmail.mockResolvedValue({
        success: false,
        error: 'Email service not configured',
      });

      // Act
      const result = await service.confirmBooking('1', userId, paymentTransactionId);

      // Assert
      expect(result).toEqual({
        id: '1',
        referenceNumber: 'AC123456TEST',
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        confirmationEmail: expect.any(String),
      });
    });

    it('should throw error for unauthorized user', async () => {
      // Arrange
      const userId = 'unauthorized-user';
      const paymentTransactionId = 'TXN123456';

      // Act & Assert
      await expect(service.confirmBooking('1', userId, paymentTransactionId))
        .rejects.toThrow('You can only confirm your own bookings');
    });

    it('should throw error for non-pending booking', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentTransactionId = 'TXN123456';
      const nonPendingBooking = {
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
      };
      mockBookingQueryService.findOne.mockResolvedValue(nonPendingBooking);

      // Act & Assert
      await expect(service.confirmBooking('1', userId, paymentTransactionId))
        .rejects.toThrow('Booking is not in pending status');
    });

    it('should throw error for non-pending payment', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentTransactionId = 'TXN123456';
      const nonPendingPaymentBooking = {
        ...mockBooking,
        paymentStatus: PaymentStatus.PAID,
      };
      mockBookingQueryService.findOne.mockResolvedValue(nonPendingPaymentBooking);

      // Act & Assert
      await expect(service.confirmBooking('1', userId, paymentTransactionId))
        .rejects.toThrow('Payment is not in pending status');
    });

    it('should generate confirmation email content', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentTransactionId = 'TXN123456';
      mockEmailService.sendBookingConfirmationEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      // Act
      const result = await service.confirmBooking('1', userId, paymentTransactionId);

      // Assert
      expect(result.confirmationEmail).toContain('Dear John Doe');
      expect(result.confirmationEmail).toContain('Your booking has been confirmed!');
      expect(result.confirmationEmail).toContain('AC123456TEST');
      expect(result.confirmationEmail).toContain('Nairobi');
      expect(result.confirmationEmail).toContain('Mombasa');
      expect(result.confirmationEmail).toContain('Cessna 172');
      expect(result.confirmationEmail).toContain('Air Charters Kenya');
      expect(result.confirmationEmail).toContain('$500');
    });
  });

  describe('email integration error handling', () => {
    it('should handle email service timeout', async () => {
      // Arrange
      const mockBooking = {
        id: '1',
        userId: 'user-123',
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: 'AC123456TEST',
        totalPrice: 500,
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        deal: {
          originName: 'Nairobi',
          destinationName: 'Mombasa',
          date: new Date('2024-01-15'),
          time: '10:00 AM',
          aircraft: { name: 'Cessna 172' },
          company: { companyName: 'Air Charters Kenya' },
        },
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      };

      mockBookingQueryService.findOne.mockResolvedValue(mockBooking);
      mockBookingPaymentService.processPayment.mockResolvedValue(mockUpdatedBooking);
      
      // Simulate timeout
      mockEmailService.sendBookingConfirmationEmail.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await service.confirmBooking('1', 'user-123', 'TXN123456');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send booking confirmation email:',
        expect.any(Error)
      );
      
      // Booking should still be confirmed
      expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);

      consoleSpy.mockRestore();
    });

    it('should handle invalid email address', async () => {
      // Arrange
      const mockBooking = {
        id: '1',
        userId: 'user-123',
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: 'AC123456TEST',
        totalPrice: 500,
        user: {
          email: 'invalid-email',
          first_name: 'John',
          last_name: 'Doe',
        },
        deal: {
          originName: 'Nairobi',
          destinationName: 'Mombasa',
          date: new Date('2024-01-15'),
          time: '10:00 AM',
          aircraft: { name: 'Cessna 172' },
          company: { companyName: 'Air Charters Kenya' },
        },
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      };

      mockBookingQueryService.findOne.mockResolvedValue(mockBooking);
      mockBookingPaymentService.processPayment.mockResolvedValue(mockUpdatedBooking);
      
      mockEmailService.sendBookingConfirmationEmail.mockRejectedValue(
        new Error('Invalid email address')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await service.confirmBooking('1', 'user-123', 'TXN123456');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send booking confirmation email:',
        expect.any(Error)
      );
      
      // Booking should still be confirmed
      expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);

      consoleSpy.mockRestore();
    });
  });

  describe('email data validation', () => {
    it('should handle missing user email', async () => {
      // Arrange
      const mockBooking = {
        id: '1',
        userId: 'user-123',
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: 'AC123456TEST',
        totalPrice: 500,
        user: {
          email: null,
          first_name: 'John',
          last_name: 'Doe',
        },
        deal: {
          originName: 'Nairobi',
          destinationName: 'Mombasa',
          date: new Date('2024-01-15'),
          time: '10:00 AM',
          aircraft: { name: 'Cessna 172' },
          company: { companyName: 'Air Charters Kenya' },
        },
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      };

      mockBookingQueryService.findOne.mockResolvedValue(mockBooking);
      mockBookingPaymentService.processPayment.mockResolvedValue(mockUpdatedBooking);
      
      mockEmailService.sendBookingConfirmationEmail.mockRejectedValue(
        new Error('Email address is required')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await service.confirmBooking('1', 'user-123', 'TXN123456');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send booking confirmation email:',
        expect.any(Error)
      );
      
      // Booking should still be confirmed
      expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);

      consoleSpy.mockRestore();
    });

    it('should handle missing deal information', async () => {
      // Arrange
      const mockBooking = {
        id: '1',
        userId: 'user-123',
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: 'AC123456TEST',
        totalPrice: 500,
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        deal: {
          originName: null,
          destinationName: null,
          date: null,
          time: null,
          aircraft: { name: null },
          company: { companyName: null },
        },
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      };

      mockBookingQueryService.findOne.mockResolvedValue(mockBooking);
      mockBookingPaymentService.processPayment.mockResolvedValue(mockUpdatedBooking);
      
      mockEmailService.sendBookingConfirmationEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      // Act
      const result = await service.confirmBooking('1', 'user-123', 'TXN123456');

      // Assert
      expect(mockEmailService.sendBookingConfirmationEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          referenceNumber: 'AC123456TEST',
          passengerName: 'John Doe',
          departure: null,
          destination: null,
          date: 'Invalid Date',
          time: null,
          aircraft: null,
          company: null,
          totalAmount: 500,
        }
      );

      expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);
    });
  });
});
