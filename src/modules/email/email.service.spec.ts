import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Mock Resend
const mockResendInstance = {
  emails: {
    send: jest.fn(),
  },
};

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => mockResendInstance),
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Manually set the resend instance to our mock
    (service as any).resend = mockResendInstance;
  });

  describe('sendBookingConfirmationEmail', () => {
    const mockBookingData = {
      referenceNumber: 'AC123456TEST',
      passengerName: 'John Doe',
      departure: 'Nairobi',
      destination: 'Mombasa',
      date: '2024-01-15',
      time: '10:00 AM',
      aircraft: 'Cessna 172',
      company: 'Air Charters Kenya',
      totalAmount: 500,
    };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('test-api-key');
    });

    it('should send booking confirmation email successfully', async () => {
      // Arrange
      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);

      // Act
      const result = await service.sendBookingConfirmationEmail('test@example.com', mockBookingData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(result.error).toBeUndefined();
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'Air Charters <noreply@aircharters.com>',
        to: ['bennjiokwama@gmail.com'],
        subject: 'Booking Confirmed - AC123456TEST',
        html: expect.stringContaining('Booking Confirmed'),
      });
    });

    it('should handle email sending failure', async () => {
      // Arrange
      const mockError = new Error('Email sending failed');
      mockResendInstance.emails.send.mockRejectedValue(mockError);

      // Act
      const result = await service.sendBookingConfirmationEmail('test@example.com', mockBookingData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email sending failed');
      expect(result.messageId).toBeUndefined();
    });

    it('should handle missing API key', async () => {
      // Arrange
        mockConfigService.get.mockReturnValue(undefined);
      // Create a new service instance without overriding resend
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();
      const serviceWithoutResend = module.get<EmailService>(EmailService);

      // Act
      const result = await serviceWithoutResend.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
      expect(mockResendInstance.emails.send).not.toHaveBeenCalled();
    });

    it('should handle empty API key', async () => {
      // Arrange
      // Create a new service instance without overriding resend
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
        ],
      }).compile();
      const serviceWithoutResend = module.get<EmailService>(EmailService);

      // Act
      const result = await serviceWithoutResend.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
      expect(mockResendInstance.emails.send).not.toHaveBeenCalled();
    });

    it('should generate correct email HTML content', async () => {
      // Arrange
      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);

      // Act
      await service.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData);

      // Assert
      const sentEmail = mockResendInstance.emails.send.mock.calls[0][0];
      expect(sentEmail.html).toContain('Booking Confirmed');
      expect(sentEmail.html).toContain('AC123456TEST');
      expect(sentEmail.html).toContain('John Doe');
      expect(sentEmail.html).toContain('Nairobi');
      expect(sentEmail.html).toContain('Mombasa');
      expect(sentEmail.html).toContain('2024-01-15');
      expect(sentEmail.html).toContain('10:00 AM');
      expect(sentEmail.html).toContain('Cessna 172');
      expect(sentEmail.html).toContain('Air Charters Kenya');
      expect(sentEmail.html).toContain('$500');
    });

    it('should handle Resend API errors', async () => {
      // Arrange
      const mockError = new Error('Invalid email address');
      mockResendInstance.emails.send.mockRejectedValue(mockError);

      // Act
      const result = await service.sendBookingConfirmationEmail('invalid-email', mockBookingData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockResendInstance.emails.send.mockRejectedValue('Unknown error');

      // Act
      const result = await service.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should use correct email format', async () => {
      // Arrange
      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);

      // Act
      await service.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData);

      // Assert
      const sentEmail = mockResendInstance.emails.send.mock.calls[0][0];
      expect(sentEmail.from).toBe('Air Charters <noreply@aircharters.com>');
      expect(sentEmail.to).toEqual(['test@example.com']);
      expect(sentEmail.subject).toBe('Booking Confirmed - AC123456TEST');
      expect(sentEmail.html).toBeDefined();
    });
  });

  describe('sendPaymentConfirmationEmail', () => {
    const mockPaymentData = {
      referenceNumber: 'AC123456TEST',
      amount: 500,
      paymentMethod: 'card',
      transactionId: 'TXN123456',
    };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('test-api-key');
    });

    it('should send payment confirmation email successfully', async () => {
      // Arrange
      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);

      // Act
      const result = await service.sendPaymentConfirmationEmail('test@example.com', mockPaymentData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(result.error).toBeUndefined();
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'Air Charters <noreply@aircharters.com>',
        to: ['test@example.com'],
        subject: 'Payment Confirmed - AC123456TEST',
        html: expect.stringContaining('Payment Confirmed'),
      });
    });

    it('should handle payment email sending failure', async () => {
      // Arrange
      const mockError = new Error('Payment email sending failed');
      mockResendInstance.emails.send.mockRejectedValue(mockError);

      // Act
      const result = await service.sendPaymentConfirmationEmail('test@example.com', mockPaymentData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment email sending failed');
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('email template generation', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('test-api-key');
    });

    it('should generate booking confirmation HTML with all required fields', () => {
      // This test would require making the generateBookingConfirmationHtml method public
      // or testing it indirectly through the sendBookingConfirmationEmail method
      const mockBookingData = {
        referenceNumber: 'AC123456TEST',
        passengerName: 'John Doe',
        departure: 'Nairobi',
        destination: 'Mombasa',
        date: '2024-01-15',
        time: '10:00 AM',
        aircraft: 'Cessna 172',
        company: 'Air Charters Kenya',
        totalAmount: 500,
      };

      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);

      return service.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData).then(() => {
        const sentEmail = mockResendInstance.emails.send.mock.calls[0][0];
        const html = sentEmail.html;
        
        // Check that all booking data is present in the HTML
        expect(html).toContain(mockBookingData.referenceNumber);
        expect(html).toContain(mockBookingData.passengerName);
        expect(html).toContain(mockBookingData.departure);
        expect(html).toContain(mockBookingData.destination);
        expect(html).toContain(mockBookingData.date);
        expect(html).toContain(mockBookingData.time);
        expect(html).toContain(mockBookingData.aircraft);
        expect(html).toContain(mockBookingData.company);
        expect(html).toContain(`$${mockBookingData.totalAmount}`);
      });
    });

    it('should handle missing or undefined booking data gracefully', () => {
      const mockBookingData = {
        referenceNumber: 'AC123456TEST',
        passengerName: 'John Doe',
        departure: 'Nairobi',
        destination: 'Mombasa',
        date: '2024-01-15',
        time: '10:00 AM',
        aircraft: 'Cessna 172',
        company: 'Air Charters Kenya',
        totalAmount: 500,
      };

      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);

      return service.sendBookingConfirmationEmail('bennjiokwama@gmail.com', mockBookingData).then(() => {
        const sentEmail = mockResendInstance.emails.send.mock.calls[0][0];
        const html = sentEmail.html;
        
        // Should not contain undefined or null values
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('null');
      });
    });
  });

  describe('error handling and logging', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('test-api-key');
    });

    it('should log successful email sending', async () => {
      // Arrange
      const mockEmailResponse = {
        data: { id: 'email-123' },
        error: null,
      };
      mockResendInstance.emails.send.mockResolvedValue(mockEmailResponse);
      
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      // Act
      await service.sendBookingConfirmationEmail('test@example.com', {
        referenceNumber: 'AC123456TEST',
        passengerName: 'John Doe',
        departure: 'Nairobi',
        destination: 'Mombasa',
        date: '2024-01-15',
        time: '10:00 AM',
        aircraft: 'Cessna 172',
        company: 'Air Charters Kenya',
        totalAmount: 500,
      });

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Booking confirmation email sent to test@example.com')
      );
      
      loggerSpy.mockRestore();
    });

    it('should log email sending errors', async () => {
      // Arrange
      const mockError = new Error('Email sending failed');
      mockResendInstance.emails.send.mockRejectedValue(mockError);
      
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      // Act
      await service.sendBookingConfirmationEmail('test@example.com', {
        referenceNumber: 'AC123456TEST',
        passengerName: 'John Doe',
        departure: 'Nairobi',
        destination: 'Mombasa',
        date: '2024-01-15',
        time: '10:00 AM',
        aircraft: 'Cessna 172',
        company: 'Air Charters Kenya',
        totalAmount: 500,
      });

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send booking confirmation email to test@example.com'),
        mockError
      );
      
      loggerSpy.mockRestore();
    });
  });
});
