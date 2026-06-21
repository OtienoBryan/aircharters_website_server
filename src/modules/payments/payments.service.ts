import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../common/entities/payment.entity';
import { Booking } from '../../common/entities/booking.entity';
import { CreatePaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async create(userId: string, companyId: number, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Generate unique payment ID
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate company amount (total amount - platform fee)
    const companyAmount = createPaymentDto.totalAmount - createPaymentDto.platformFee;

    if (companyAmount < 0) {
      throw new BadRequestException('Platform fee cannot exceed total amount');
    }

    const payment = this.paymentRepository.create({
      id: paymentId,
      userId,
      companyId,
      companyAmount,
      currency: createPaymentDto.currency || 'USD',
      ...createPaymentDto,
    });

    return await this.paymentRepository.save(payment);
  }

  async createFromBooking(userId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Find the booking to get the company ID
    const booking = await this.bookingRepository.findOne({
      where: { id: parseInt(createPaymentDto.bookingId) },
      select: ['id', 'companyId']
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Use the booking's company ID
    return this.create(userId, booking.companyId, createPaymentDto);
  }

  async findAll(): Promise<Payment[]> {
    return await this.paymentRepository.find({
      relations: ['user', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { userId },
      relations: ['user', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByBooking(bookingId: string): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { bookingId },
      relations: ['user', 'company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['user', 'company'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async updateStatus(id: string, status: PaymentStatus, transactionId?: string): Promise<Payment> {
    const payment = await this.findOne(id);

    payment.paymentStatus = status;
    if (transactionId) {
      payment.transactionId = transactionId;
    }

    return await this.paymentRepository.save(payment);
  }

  async updateGatewayResponse(id: string, gatewayResponse: any): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.paymentGatewayResponse = gatewayResponse;
    return await this.paymentRepository.save(payment);
  }

  async processRefund(id: string): Promise<Payment> {
    const payment = await this.findOne(id);

    if (!payment.canBeRefunded) {
      throw new BadRequestException('Payment cannot be refunded');
    }

    payment.paymentStatus = PaymentStatus.REFUNDED;
    return await this.paymentRepository.save(payment);
  }

  async getPaymentStats(companyId?: number): Promise<any> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');

    if (companyId) {
      queryBuilder.where('payment.companyId = :companyId', { companyId });
    }

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      totalRevenue,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('payment.paymentStatus = :status', { status: PaymentStatus.COMPLETED }).getCount(),
      queryBuilder.clone().andWhere('payment.paymentStatus = :status', { status: PaymentStatus.PENDING }).getCount(),
      queryBuilder.clone().andWhere('payment.paymentStatus = :status', { status: PaymentStatus.FAILED }).getCount(),
      queryBuilder.clone().andWhere('payment.paymentStatus = :status', { status: PaymentStatus.REFUNDED }).getCount(),
      queryBuilder
        .clone()
        .select('SUM(payment.totalAmount)', 'total')
        .andWhere('payment.paymentStatus = :status', { status: PaymentStatus.COMPLETED })
        .getRawOne(),
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      totalRevenue: parseFloat(totalRevenue?.total || '0'),
      successRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
    };
  }
} 