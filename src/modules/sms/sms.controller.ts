import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SmsService } from './sms.service';

@ApiTags('SMS Verification')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS verification code' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async sendVerificationCode(@Body() body: { phoneNumber: string }) {
    const { phoneNumber } = body;
    
    if (!phoneNumber) {
      return {
        success: false,
        message: 'Phone number is required',
      };
    }

    return await this.smsService.sendVerificationCode(phoneNumber);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify SMS code' })
  @ApiResponse({
    status: 200,
    description: 'Code verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifyCode(@Body() body: { phoneNumber: string; code: string }) {
    const { phoneNumber, code } = body;
    
    if (!phoneNumber || !code) {
      return {
        success: false,
        message: 'Phone number and code are required',
      };
    }

    return await this.smsService.verifyCode(phoneNumber, code);
  }
}

