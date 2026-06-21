import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private infobipApiKey: string;
  private infobipBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.infobipApiKey = this.configService.get<string>('INFOBIP_API_KEY');
    this.infobipBaseUrl = this.configService.get<string>('INFOBIP_BASE_URL') || 'https://rpdjky.api.infobip.com';
    
    if (!this.infobipApiKey) {
      this.logger.warn('INFOBIP_API_KEY not configured. SMS service will be disabled.');
      return;
    }
  }

  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    if (!this.infobipApiKey) {
      this.logger.error('Infobip not initialized. Check INFOBIP_API_KEY configuration.');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      this.logger.log(`Sending verification code to: ${phoneNumber}`);
      
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const result = await axios.post(`${this.infobipBaseUrl}/sms/2/text/single`, {
        from: 'AirCharters',
        to: phoneNumber,
        text: `Your Air Charters verification code is: ${verificationCode}. This code expires in 10 minutes.`
      }, {
        headers: {
          'Authorization': `App ${this.infobipApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.log(`Verification code sent successfully to ${phoneNumber}. Message ID: ${result.data?.messages?.[0]?.messageId}`);
      
      return {
        success: true,
        message: 'Verification code sent successfully',
      };
    } catch (error) {
      this.logger.error('Infobip SMS error:', error);
      return {
        success: false,
        message: `Failed to send verification code: ${error.message}`,
      };
    }
  }

  async verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
    // Note: Infobip doesn't have built-in verification like Twilio
    // This would need to be implemented with a database to store codes
    // For now, we'll return a placeholder response
    this.logger.warn('SMS verification not fully implemented with Infobip. Manual verification required.');
    
    return {
      success: false,
      message: 'SMS verification not implemented with Infobip. Please contact support.',
    };
  }

  async sendInquiryNotificationSms(
    phoneNumber: string,
    inquiryData: {
      referenceNumber: string;
      customerName: string;
      aircraftName: string;
      requestedSeats: number;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.infobipApiKey) {
      this.logger.error('Infobip not initialized. Check INFOBIP_API_KEY configuration.');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const smsText = `New charter inquiry ${inquiryData.referenceNumber}: ${inquiryData.customerName} requests ${inquiryData.requestedSeats} seats on ${inquiryData.aircraftName}. Please check your email for details.`;
      
      const result = await axios.post(`${this.infobipBaseUrl}/sms/2/text/single`, {
        from: 'AirCharters',
        to: phoneNumber,
        text: smsText
      }, {
        headers: {
          'Authorization': `App ${this.infobipApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.log(`Inquiry notification SMS sent to ${phoneNumber}. Message ID: ${result.data?.messages?.[0]?.messageId}`);
      
      return { 
        success: true, 
        messageId: result.data?.messages?.[0]?.messageId 
      };
    } catch (error) {
      this.logger.error(`Failed to send inquiry notification SMS to ${phoneNumber}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
