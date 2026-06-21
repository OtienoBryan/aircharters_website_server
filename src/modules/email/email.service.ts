import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailtrapApiKey: string;
  private mailtrapBaseUrl = 'https://send.api.mailtrap.io/api/send';
  private infobipApiKey: string;
  private infobipBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.mailtrapApiKey = this.configService.get<string>('MAILTRAP_API_KEY');
    this.infobipApiKey = this.configService.get<string>('INFOBIP_API_KEY');
    this.infobipBaseUrl = this.configService.get<string>('INFOBIP_BASE_URL') || 'https://rpdjky.api.infobip.com';
    
    if (!this.mailtrapApiKey && !this.infobipApiKey) {
      this.logger.warn('Neither MAILTRAP_API_KEY nor INFOBIP_API_KEY configured. Email service will be disabled.');
      return;
    }
  }

  async sendBookingConfirmationEmail(
    to: string,
    bookingData: {
      referenceNumber: string;
      passengerName: string;
      departure: string;
      destination: string;
      date: string;
      time: string;
      aircraft: string;
      company: string;
      totalAmount: number;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.mailtrapApiKey && !this.infobipApiKey) {
      this.logger.error('No email service configured. Check MAILTRAP_API_KEY or INFOBIP_API_KEY configuration.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailHtml = this.generateBookingConfirmationHtml(bookingData);
      return await this.sendEmailWithFallback(
        to,
        `Booking Confirmed - ${bookingData.referenceNumber}`,
        emailHtml
      );
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation email to ${to}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendPaymentConfirmationEmail(
    to: string,
    paymentData: {
      referenceNumber: string;
      amount: number;
      paymentMethod: string;
      transactionId: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.mailtrapApiKey) {
      this.logger.error('Mailtrap not initialized. Check MAILTRAP_API_KEY configuration.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailHtml = this.generatePaymentConfirmationHtml(paymentData);
      
      const result = await axios.post(this.mailtrapBaseUrl, {
        from: {
          email: 'admin@aircharterss.com',
          name: 'Air Charters'
        },
        to: [
          {
            email: to
          }
        ],
        subject: `Payment Confirmed - ${paymentData.referenceNumber}`,
        html: emailHtml,
      }, {
        headers: {
          'Authorization': `Bearer ${this.mailtrapApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.log(`Payment confirmation email sent to ${to}. Message ID: ${result.data?.message_id}`);
      
      return { 
        success: true, 
        messageId: result.data?.message_id 
      };
    } catch (error) {
      this.logger.error(`Failed to send payment confirmation email to ${to}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private generateBookingConfirmationHtml(bookingData: {
    referenceNumber: string;
    passengerName: string;
    departure: string;
    destination: string;
    date: string;
    time: string;
    aircraft: string;
    company: string;
    totalAmount: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #333; }
          .total { background: #667eea; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="success-icon">✈️</div>
          <h1>Booking Confirmed!</h1>
          <p>Your flight has been successfully booked</p>
        </div>
        
        <div class="content">
          <p>Dear ${bookingData.passengerName},</p>
          
          <p>Great news! Your flight booking has been confirmed. Here are your booking details:</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Booking Reference:</span>
              <span class="detail-value">${bookingData.referenceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Route:</span>
              <span class="detail-value">${bookingData.departure} → ${bookingData.destination}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${bookingData.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${bookingData.time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Aircraft:</span>
              <span class="detail-value">${bookingData.aircraft}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Company:</span>
              <span class="detail-value">${bookingData.company}</span>
            </div>
          </div>
          
          <div class="total">
            Total Amount: $${bookingData.totalAmount.toFixed(2)} USD
          </div>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">📋 Important Information</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Please arrive at the airport 30 minutes before departure time</li>
              <li>Bring a valid ID and your booking reference</li>
              <li>Contact us if you need to make any changes</li>
            </ul>
          </div>
          
          <p>Thank you for choosing Air Charters for your travel needs!</p>
          
          <p>Safe travels,<br>
          The Air Charters Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© 2024 Air Charters. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentConfirmationHtml(paymentData: {
    referenceNumber: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #333; }
          .total { background: #4caf50; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="success-icon">💳</div>
          <h1>Payment Confirmed!</h1>
          <p>Your payment has been processed successfully</p>
        </div>
        
        <div class="content">
          <p>Your payment has been successfully processed. Here are the payment details:</p>
          
          <div class="payment-details">
            <div class="detail-row">
              <span class="detail-label">Booking Reference:</span>
              <span class="detail-value">${paymentData.referenceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transaction ID:</span>
              <span class="detail-value">${paymentData.transactionId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">${paymentData.paymentMethod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">$${paymentData.amount.toFixed(2)} USD</span>
            </div>
          </div>
          
          <div class="total">
            Payment Successful ✅
          </div>
          
          <p>Your booking is now confirmed and you will receive a separate email with your flight details.</p>
          
          <p>Thank you for your payment!</p>
          
          <p>Best regards,<br>
          The Air Charters Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© 2024 Air Charters. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  async sendInquiryNotificationEmail(
    to: string,
    inquiryData: {
      referenceNumber: string;
      customerName: string;
      customerEmail: string;
      aircraftName: string;
      aircraftType: string;
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      requestedSeats: number;
      specialRequirements?: string;
      userNotes?: string;
      createdAt: string;
      passengers: Array<{
        firstName: string;
        lastName: string;
        age: number;
        nationality: string;
        idPassportNumber: string;
      }>;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.mailtrapApiKey && !this.infobipApiKey) {
      this.logger.error('No email service configured. Check MAILTRAP_API_KEY or INFOBIP_API_KEY configuration.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailHtml = this.generateInquiryNotificationHtml(inquiryData);
      return await this.sendEmailWithFallback(
        to,
        `New Charter Inquiry - ${inquiryData.referenceNumber}`,
        emailHtml
      );
    } catch (error) {
      this.logger.error(`Failed to send inquiry notification email to ${to}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // private generateInquiryNotificationHtml(inquiryData: {
  //   referenceNumber: string;
  //   customerName: string;
  //   customerEmail: string;
  //   aircraftName: string;
  //   aircraftType: string;
  //   origin: string;
  //   destination: string;
  //   departureDate: string;
  //   returnDate?: string;
  //   requestedSeats: number;
  //   specialRequirements?: string;
  //   userNotes?: string;
  //   createdAt: string;
  //   passengers: Array<{
  //     firstName: string;
  //     lastName: string;
  //     age: number;
  //     nationality: string;
  //     idPassportNumber: string;
  //   }>;
  // }): string {
  //   return `
  //     <!DOCTYPE html>
  //     <html>
  //     <head>
  //       <meta charset="utf-8">
  //       <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //       <title>New Charter Inquiry</title>
  //       <style>
  //         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  //         .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  //         .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
  //         .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
  //         .inquiry-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  //         .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
  //         .detail-label { font-weight: bold; color: #666; min-width: 150px; }
  //         .detail-value { color: #333; text-align: right; }
  //         .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  //         .alert-icon { font-size: 48px; margin-bottom: 10px; }
  //         .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  //       </style>
  //     </head>
  //     <body>
  //       <div class="header">
  //         <!-- Air Charters Logo - Replace with actual logo URL -->
  //         <img src="https://ik.imagekit.io/bja2qwwdjjy/Aircharter/ChatGPT%20Image%20Oct%204,%202025,%2011_42_24%20AM_uc8c6PdHH-.png?updatedAt=1759567405970" alt="Air Charters Logo" class="logo">
  //         <div class="alert-icon">✈️</div>
  //         <h1>New Charter Inquiry</h1>
  //         <p>A customer has submitted a charter request</p>
  //       </div>
        
  //       <div class="content">
  //         <p>You have received a new charter inquiry. Please review the details below:</p>
          
  //         <div class="inquiry-details">
  //           <div class="detail-row">
  //             <span class="detail-label">Inquiry Reference:</span>
  //             <span class="detail-value">${inquiryData.referenceNumber}</span>
  //           </div>
  //           <div class="detail-row">
  //             <span class="detail-label">Customer Name:</span>
  //             <span class="detail-value">${inquiryData.customerName}</span>
  //           </div>
  //           <div class="detail-row">
  //             <span class="detail-label">Customer Email:</span>
  //             <span class="detail-value">${inquiryData.customerEmail}</span>
  //           </div>
  //           ${inquiryData.passengers && inquiryData.passengers.length > 0 ? `
  //           <div class="detail-row">
  //             <span class="detail-label">Passengers:</span>
  //             <span class="detail-value">${inquiryData.passengers.length} passenger(s)</span>
  //           </div>
  //           ` : ''}
  //           <div class="detail-row">
  //             <span class="detail-label">Aircraft:</span>
  //             <span class="detail-value">${inquiryData.aircraftName} (${inquiryData.aircraftType})</span>
  //           </div>
  //           <div class="detail-row">
  //             <span class="detail-label">Route:</span>
  //             <span class="detail-value">${inquiryData.origin} → ${inquiryData.destination}</span>
  //           </div>
  //           <div class="detail-row">
  //             <span class="detail-label">Departure Date:</span>
  //             <span class="detail-value">${inquiryData.departureDate}</span>
  //           </div>
  //           ${inquiryData.returnDate ? `
  //           <div class="detail-row">
  //             <span class="detail-label">Return Date:</span>
  //             <span class="detail-value">${inquiryData.returnDate}</span>
  //           </div>
  //           ` : ''}
  //           <div class="detail-row">
  //             <span class="detail-label">Requested Seats:</span>
  //             <span class="detail-value">${inquiryData.requestedSeats}</span>
  //           </div>
  //           <div class="detail-row">
  //             <span class="detail-label">Submitted:</span>
  //             <span class="detail-value">${inquiryData.createdAt}</span>
  //           </div>
  //           ${inquiryData.specialRequirements ? `
  //           <div class="detail-row">
  //             <span class="detail-label">Special Requirements:</span>
  //             <span class="detail-value">${inquiryData.specialRequirements}</span>
  //           </div>
  //           ` : ''}
  //           ${inquiryData.userNotes ? `
  //           <div class="detail-row">
  //             <span class="detail-label">Customer Notes:</span>
  //             <span class="detail-value">${inquiryData.userNotes}</span>
  //           </div>
  //           ` : ''}
  //         </div>
          
  //         ${inquiryData.passengers && inquiryData.passengers.length > 0 ? `
  //         <div class="inquiry-details">
  //           <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #1e3c72; padding-bottom: 10px;">👥 Passenger Details</h3>
  //           ${inquiryData.passengers.map((passenger, index) => `
  //           <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #1e3c72;">
  //             <div class="detail-row">
  //               <span class="detail-label">Passenger ${index + 1}:</span>
  //               <span class="detail-value">${passenger.firstName} ${passenger.lastName}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Age:</span>
  //               <span class="detail-value">${passenger.age} years</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Nationality:</span>
  //               <span class="detail-value">${passenger.nationality}</span>
  //             </div>
  //             <div class="detail-row">
  //               <span class="detail-label">Passport/ID:</span>
  //               <span class="detail-value">${passenger.idPassportNumber}</span>
  //             </div>
  //           </div>
  //           `).join('')}
  //         </div>
  //         ` : ''}
          
  //         <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
  //           <h3 style="margin-top: 0; color: #856404;">📋 Action Required</h3>
  //           <p style="margin: 10px 0; color: #856404;">
  //             Please review this inquiry and provide pricing information to the customer as soon as possible.
  //           </p>
  //         </div>
          
  //         <div class="signature">
  //           <p><strong>Best regards,</strong><br>
  //           <strong>The Air Charters Team</strong></p>
  //           <p style="font-size: 12px; color: #666;">
  //             Email: support@aircharterss.com<br>
  //             Phone: +254 700 000 000<br>
  //             Website: www.aircharterss.com
  //           </p>
  //         </div>
  //       </div>
        
  //       <div class="footer">
  //         <p>This is an automated notification. Please do not reply to this message.</p>
  //         <p>© 2024 Air Charters. All rights reserved.</p>
  //       </div>
  //     </body>
  //     </html>
  //   `;
  // }

  private generateInquiryNotificationHtml(inquiryData: {
    referenceNumber: string;
    customerName: string;
    customerEmail: string;
    aircraftName: string;
    aircraftType: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    requestedSeats: number;
    specialRequirements?: string;
    userNotes?: string;
    createdAt: string;
    passengers: Array<{
      firstName: string;
      lastName: string;
      age: number;
      nationality: string;
      idPassportNumber: string;
    }>;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>New Charter Inquiry - ${inquiryData.referenceNumber}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]-->
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1a1a1a;
            background-color: #f5f7fa;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .email-wrapper {
            width: 100%;
            background-color: #f5f7fa;
            padding: 40px 20px;
          }
          .email-container {
            max-width: 680px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06);
          }
          .header {
            background: linear-gradient(135deg, #0f2557 0%, #1e3c72 50%, #2a5298 100%);
            color: #ffffff;
            padding: 48px 40px;
            text-align: center;
            position: relative;
          }
          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4a90e2, #63b8ff, #4a90e2);
          }
          .logo {
            max-width: 180px;
            height: auto;
            margin-bottom: 24px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .header-icon {
            font-size: 56px;
            margin-bottom: 16px;
            display: block;
            opacity: 0.95;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
          }
          .content {
            padding: 40px;
          }
          .intro-text {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          .section {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 28px;
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .detail-grid {
            display: table;
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
          }
          .detail-row {
            display: table-row;
          }
          .detail-label {
            display: table-cell;
            font-weight: 600;
            color: #4a5568;
            font-size: 14px;
            padding: 12px 16px 12px 0;
            vertical-align: top;
            min-width: 160px;
          }
          .detail-value {
            display: table-cell;
            color: #1a202c;
            font-size: 14px;
            padding: 12px 0;
            text-align: right;
            font-weight: 500;
            vertical-align: top;
          }
          .highlight-value {
            background: #f0f9ff;
            padding: 6px 12px;
            border-radius: 6px;
            display: inline-block;
            color: #0369a1;
            font-weight: 600;
          }
          .passenger-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #2a5298;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .passenger-card:last-child {
            margin-bottom: 0;
          }
          .passenger-header {
            font-weight: 700;
            color: #1a202c;
            font-size: 15px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .alert-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #fbbf24;
            border-left: 4px solid #f59e0b;
            padding: 24px;
            border-radius: 10px;
            margin: 24px 0;
          }
          .alert-title {
            font-size: 17px;
            font-weight: 700;
            color: #78350f;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .alert-text {
            font-size: 14px;
            color: #92400e;
            line-height: 1.6;
          }
          .signature {
            margin-top: 40px;
            padding-top: 32px;
            border-top: 2px solid #e2e8f0;
          }
          .signature-name {
            font-size: 16px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 4px;
          }
          .signature-company {
            font-size: 15px;
            font-weight: 600;
            color: #2a5298;
            margin-bottom: 16px;
          }
          .contact-info {
            font-size: 13px;
            color: #64748b;
            line-height: 1.8;
          }
          .contact-info a {
            color: #2a5298;
            text-decoration: none;
          }
          .footer {
            background: #f8fafc;
            padding: 32px 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            font-size: 13px;
            color: #64748b;
            margin: 8px 0;
          }
          .footer-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 16px auto;
            width: 60%;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #eff6ff;
            color: #1e40af;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
          }
          @media only screen and (max-width: 640px) {
            .email-wrapper { padding: 20px 10px; }
            .content { padding: 24px 20px; }
            .header { padding: 32px 20px; }
            .section { padding: 20px 16px; }
            .detail-label, .detail-value { 
              display: block; 
              text-align: left; 
              padding: 6px 0;
            }
            .detail-label { 
              font-size: 13px;
              margin-bottom: 4px;
            }
            .detail-value {
              font-size: 14px;
              margin-bottom: 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="header">
              <img src="https://ik.imagekit.io/bja2qwwdjjy/Aircharter/ChatGPT%20Image%20Oct%204,%202025,%2011_42_24%20AM_uc8c6PdHH-.png?updatedAt=1759567405970" alt="Air Charters Logo" class="logo">
              <span class="header-icon">✈️</span>
              <h1>New Charter Inquiry Received</h1>
              <p>Immediate attention required</p>
            </div>
            
            <div class="content">
              <p class="intro-text">
                You have received a new charter inquiry that requires your attention. Please review the comprehensive details below and respond to the customer within 24 hours.
              </p>
              
              <div class="section">
                <h2 class="section-title">
                  <span>📋</span> Inquiry Overview
                </h2>
                <div class="detail-grid">
                  <div class="detail-row">
                    <span class="detail-label">Reference Number</span>
                    <span class="detail-value"><span class="highlight-value">${inquiryData.referenceNumber}</span></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Submission Date</span>
                    <span class="detail-value">${inquiryData.createdAt}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Customer Name</span>
                    <span class="detail-value">${inquiryData.customerName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Contact Email</span>
                    <span class="detail-value"><a href="mailto:${inquiryData.customerEmail}" style="color: #2a5298; text-decoration: none;">${inquiryData.customerEmail}</a></span>
                  </div>
                </div>
              </div>
              
              <div class="section">
                <h2 class="section-title">
                  <span>🛩️</span> Flight Details
                </h2>
                <div class="detail-grid">
                  <div class="detail-row">
                    <span class="detail-label">Aircraft</span>
                    <span class="detail-value">${inquiryData.aircraftName}<span class="badge">${inquiryData.aircraftType}</span></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Route</span>
                    <span class="detail-value"><strong>${inquiryData.origin}</strong> → <strong>${inquiryData.destination}</strong></span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Departure Date</span>
                    <span class="detail-value">${inquiryData.departureDate}</span>
                  </div>
                  ${inquiryData.returnDate ? `
                  <div class="detail-row">
                    <span class="detail-label">Return Date</span>
                    <span class="detail-value">${inquiryData.returnDate}</span>
                  </div>
                  ` : ''}
                  <div class="detail-row">
                    <span class="detail-label">Requested Seats</span>
                    <span class="detail-value"><strong>${inquiryData.requestedSeats}</strong> ${inquiryData.requestedSeats === 1 ? 'seat' : 'seats'}</span>
                  </div>
                  ${inquiryData.specialRequirements ? `
                  <div class="detail-row">
                    <span class="detail-label">Special Requirements</span>
                    <span class="detail-value">${inquiryData.specialRequirements}</span>
                  </div>
                  ` : ''}
                  ${inquiryData.userNotes ? `
                  <div class="detail-row">
                    <span class="detail-label">Additional Notes</span>
                    <span class="detail-value">${inquiryData.userNotes}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              ${inquiryData.passengers && inquiryData.passengers.length > 0 ? `
              <div class="section">
                <h2 class="section-title">
                  <span>👥</span> Passenger Information
                  <span class="badge">${inquiryData.passengers.length} ${inquiryData.passengers.length === 1 ? 'Passenger' : 'Passengers'}</span>
                </h2>
                ${inquiryData.passengers.map((passenger, index) => `
                <div class="passenger-card">
                  <div class="passenger-header">
                    <span>Passenger ${index + 1}</span>
                    <span style="color: #2a5298;">•</span>
                    <span>${passenger.firstName} ${passenger.lastName}</span>
                  </div>
                  <div class="detail-grid">
                    <div class="detail-row">
                      <span class="detail-label">Age</span>
                      <span class="detail-value">${passenger.age} years old</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Nationality</span>
                      <span class="detail-value">${passenger.nationality}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Passport/ID Number</span>
                      <span class="detail-value">${passenger.idPassportNumber}</span>
                    </div>
                  </div>
                </div>
                `).join('')}
              </div>
              ` : ''}
              
              <div class="alert-box">
                <div class="alert-title">
                  <span>⚡</span> Action Required
                </div>
                <p class="alert-text">
                  Please review this inquiry and provide comprehensive pricing information to the customer within 24 hours. Ensure all special requirements and passenger details are carefully considered in your quotation.
                </p>
              </div>
              
              <div class="signature">
                <p class="signature-name">Best regards,</p>
                <p class="signature-company">The Air Charters Team</p>
                <div class="contact-info">
                  Email: <a href="mailto:support@aircharterss.com">support@aircharterss.com</a><br>
                  Phone: <a href="tel:+254700000000">+254 700 000 000</a><br>
                  Website: <a href="https://www.aircharterss.com" target="_blank">www.aircharterss.com</a>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from Air Charters booking system.</p>
              <div class="footer-divider"></div>
              <p>© ${new Date().getFullYear()} Air Charters. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async sendEmailWithFallback(
    to: string,
    subject: string,
    htmlContent: string,
    fromEmail: string = 'admin@aircharterss.com',
    fromName: string = 'Air Charters'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Try Mailtrap first
    if (this.mailtrapApiKey) {
      try {
        const result = await axios.post(this.mailtrapBaseUrl, {
          from: {
            email: fromEmail,
            name: fromName
          },
          to: [{ email: to }],
          subject: subject,
          html: htmlContent,
        }, {
          headers: {
            'Authorization': `Bearer ${this.mailtrapApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        this.logger.log(`Email sent successfully via Mailtrap to ${to}. Message ID: ${result.data?.message_id}`);
        return { 
          success: true, 
          messageId: result.data?.message_id 
        };
      } catch (error) {
        this.logger.warn(`Mailtrap email failed, trying Infobip fallback: ${error.message}`);
      }
    }

    // Fallback to Infobip
    if (this.infobipApiKey) {
      try {
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('from', fromEmail);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('html', htmlContent);

        const result = await axios.post(`${this.infobipBaseUrl}/email/3/send`, formData, {
          headers: {
            'Authorization': `App ${this.infobipApiKey}`,
            ...formData.getHeaders()
          }
        });

        this.logger.log(`Email sent successfully via Infobip to ${to}. Message ID: ${result.data?.messages?.[0]?.messageId}`);
        return { 
          success: true, 
          messageId: result.data?.messages?.[0]?.messageId 
        };
      } catch (error) {
        this.logger.error(`Infobip email also failed: ${error.message}`);
        return { 
          success: false, 
          error: `Both Mailtrap and Infobip failed: ${error.message}` 
        };
      }
    }

    return { 
      success: false, 
      error: 'No email service configured' 
    };
  }
}
