import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WalletTransaction, WalletTransactionType, WalletTransactionStatus } from '@/common/entities/wallet-transaction.entity';
import { User } from '@/common/entities/user.entity';

@Injectable()
export class WalletService {
  // Loyalty Points Configuration
  private readonly MILES_PER_USD = 5; // 1 USD = 5 miles
  private readonly USD_PER_100_MILES = 1; // 100 miles = $1 off
  private readonly MILES_PER_DOLLAR_OFF = 100; // 100 miles = $1 off

  constructor(
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Calculate miles earned from USD spending
   * @param usdAmount Amount spent in USD
   * @returns Miles earned
   */
  calculateMilesFromSpending(usdAmount: number): number {
    return Math.floor(usdAmount * this.MILES_PER_USD);
  }

  /**
   * Calculate USD discount from miles redemption
   * @param miles Amount of miles to redeem
   * @returns USD discount amount
   */
  calculateUsdFromMiles(miles: number): number {
    return (miles / this.MILES_PER_DOLLAR_OFF) * this.USD_PER_100_MILES;
  }

  /**
   * Calculate miles needed for a specific USD discount
   * @param usdDiscount USD amount to discount
   * @returns Miles needed
   */
  calculateMilesForUsdDiscount(usdDiscount: number): number {
    return Math.ceil(usdDiscount * this.MILES_PER_DOLLAR_OFF / this.USD_PER_100_MILES);
  }

  async getUserTransactions(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const [transactions, total] = await this.walletTransactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.transactionType,
        amount: tx.amount,
        pointsAmount: tx.pointsAmount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
        bookingId: tx.bookingId,
      })),
      total,
      page,
      limit,
    };
  }

  async getLoyaltyTransactions(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const [transactions, total] = await this.walletTransactionRepository.findAndCount({
      where: { 
        userId,
        transactionType: In([
          WalletTransactionType.LOYALTY_EARNED,
          WalletTransactionType.LOYALTY_REDEEMED,
          WalletTransactionType.LOYALTY_EXPIRED,
          WalletTransactionType.LOYALTY_ADJUSTMENT,
        ]),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.transactionType,
        pointsAmount: tx.pointsAmount,
        description: tx.description,
        pointsBefore: tx.pointsBefore,
        pointsAfter: tx.pointsAfter,
        createdAt: tx.createdAt,
        expiresAt: tx.expiresAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getMonetaryTransactions(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const [transactions, total] = await this.walletTransactionRepository.findAndCount({
      where: { 
        userId,
        transactionType: In([
          WalletTransactionType.DEPOSIT,
          WalletTransactionType.WITHDRAWAL,
          WalletTransactionType.PAYMENT,
          WalletTransactionType.REFUND,
          WalletTransactionType.BONUS,
          WalletTransactionType.FEE,
        ]),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.transactionType,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        paymentMethod: tx.paymentMethod,
        status: tx.status,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Earn loyalty points from spending (1 USD = 5 miles)
   * @param userId User ID
   * @param usdAmount Amount spent in USD
   * @param description Transaction description
   * @param bookingId Associated booking ID
   * @param expiresAt Optional expiration date
   */
  async earnLoyaltyPointsFromSpending(
    userId: string,
    usdAmount: number,
    description: string,
    bookingId?: string,
    expiresAt?: Date,
  ): Promise<WalletTransaction> {
    const milesEarned = this.calculateMilesFromSpending(usdAmount);
    
    if (milesEarned <= 0) {
      throw new Error('No miles earned from this transaction');
    }

    return await this.earnLoyaltyPoints(
      userId,
      milesEarned,
      `${description} - Earned ${milesEarned} miles from $${usdAmount} spending`,
      bookingId,
      expiresAt,
    );
  }

  /**
   * Earn loyalty points (direct miles)
   * @param userId User ID
   * @param points Miles to earn
   * @param description Transaction description
   * @param bookingId Associated booking ID
   * @param expiresAt Optional expiration date
   */
  async earnLoyaltyPoints(
    userId: string,
    points: number,
    description: string,
    bookingId?: string,
    expiresAt?: Date,
  ): Promise<WalletTransaction> {
    // Use a transaction to ensure data consistency
    const queryRunner = this.walletTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the user record to prevent race conditions
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const transaction = queryRunner.manager.create(WalletTransaction, {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        bookingId,
        transactionType: WalletTransactionType.LOYALTY_EARNED,
        amount: 0,
        pointsAmount: points,
        description,
        balanceBefore: user.wallet_balance,
        balanceAfter: user.wallet_balance,
        pointsBefore: user.loyalty_points,
        pointsAfter: user.loyalty_points + points,
        status: WalletTransactionStatus.COMPLETED,
        expiresAt,
        completedAt: new Date(),
      });

      // Update user loyalty points
      user.loyalty_points = transaction.pointsAfter;
      await queryRunner.manager.save(user);

      const savedTransaction = await queryRunner.manager.save(transaction);
      
      await queryRunner.commitTransaction();
      return savedTransaction;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Redeem loyalty points for USD discount (100 miles = $1 off)
   * @param userId User ID
   * @param miles Miles to redeem
   * @param description Transaction description
   * @param bookingId Associated booking ID
   */
  async redeemLoyaltyPoints(
    userId: string,
    miles: number,
    description: string,
    bookingId?: string,
  ): Promise<WalletTransaction> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.loyalty_points < miles) {
      throw new Error('Insufficient loyalty points');
    }

    // Calculate USD discount from miles
    const usdDiscount = this.calculateUsdFromMiles(miles);
    
    if (usdDiscount <= 0) {
      throw new Error('Invalid miles amount for redemption');
    }

    const transaction = this.walletTransactionRepository.create({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      bookingId,
      transactionType: WalletTransactionType.LOYALTY_REDEEMED,
      amount: usdDiscount, // Positive amount as it's a discount
      pointsAmount: -miles, // Negative points as they're being redeemed
      description: `${description} - Redeemed ${miles} miles for $${usdDiscount} discount`,
      balanceBefore: user.wallet_balance,
      balanceAfter: user.wallet_balance + usdDiscount, // Add discount to wallet
      pointsBefore: user.loyalty_points,
      pointsAfter: user.loyalty_points - miles,
      status: WalletTransactionStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Update user loyalty points and wallet balance
    user.loyalty_points = transaction.pointsAfter;
    user.wallet_balance = transaction.balanceAfter;
    await this.userRepository.save(user);

    return await this.walletTransactionRepository.save(transaction);
  }

  /**
   * Get loyalty points summary with conversion rates
   * @param userId User ID
   */
  async getLoyaltySummary(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentMiles = user.loyalty_points;
    const potentialUsdDiscount = this.calculateUsdFromMiles(currentMiles);
    const milesNeededForNextDollar = this.MILES_PER_DOLLAR_OFF - (currentMiles % this.MILES_PER_DOLLAR_OFF);

    return {
      currentMiles,
      potentialUsdDiscount,
      milesNeededForNextDollar,
      conversionRates: {
        milesPerUsd: this.MILES_PER_USD,
        usdPer100Miles: this.USD_PER_100_MILES,
      },
      examples: {
        spending10Usd: this.calculateMilesFromSpending(10), // 50 miles
        spending100Usd: this.calculateMilesFromSpending(100), // 500 miles
        redeeming100Miles: this.calculateUsdFromMiles(100), // $1
        redeeming500Miles: this.calculateUsdFromMiles(500), // $5
      },
    };
  }

  async depositMoney(
    userId: string,
    amount: number,
    description: string,
    paymentMethod: string,
    paymentReference?: string,
  ): Promise<WalletTransaction> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transaction = this.walletTransactionRepository.create({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      transactionType: WalletTransactionType.DEPOSIT,
      amount,
      pointsAmount: 0,
      description,
      balanceBefore: user.wallet_balance,
      balanceAfter: user.wallet_balance + amount,
      pointsBefore: user.loyalty_points,
      pointsAfter: user.loyalty_points,
      paymentMethod,
      paymentReference,
      status: WalletTransactionStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Update user wallet balance
    user.wallet_balance = transaction.balanceAfter;
    await this.userRepository.save(user);

    return await this.walletTransactionRepository.save(transaction);
  }

  async withdrawMoney(
    userId: string,
    amount: number,
    description: string,
    paymentMethod: string,
    paymentReference?: string,
  ): Promise<WalletTransaction> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.wallet_balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const transaction = this.walletTransactionRepository.create({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      transactionType: WalletTransactionType.WITHDRAWAL,
      amount: -amount,
      pointsAmount: 0,
      description,
      balanceBefore: user.wallet_balance,
      balanceAfter: user.wallet_balance - amount,
      pointsBefore: user.loyalty_points,
      pointsAfter: user.loyalty_points,
      paymentMethod,
      paymentReference,
      status: WalletTransactionStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Update user wallet balance
    user.wallet_balance = transaction.balanceAfter;
    await this.userRepository.save(user);

    return await this.walletTransactionRepository.save(transaction);
  }

  /**
   * Create a wallet transaction with custom parameters
   * @param userId User ID
   * @param transactionType Type of transaction
   * @param amount Monetary amount
   * @param pointsAmount Points amount
   * @param description Transaction description
   * @param bookingId Associated booking ID
   * @param metadata Additional metadata
   */
  async createWalletTransaction(
    userId: string,
    transactionType: WalletTransactionType,
    amount: number,
    pointsAmount: number,
    description: string,
    bookingId?: string,
    metadata?: any,
  ): Promise<WalletTransaction> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transaction = this.walletTransactionRepository.create({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      bookingId,
      transactionType,
      amount,
      pointsAmount,
      description,
      balanceBefore: user.wallet_balance,
      balanceAfter: user.wallet_balance + amount,
      pointsBefore: user.loyalty_points,
      pointsAfter: user.loyalty_points + pointsAmount,
      status: WalletTransactionStatus.COMPLETED,
      metadata,
      completedAt: new Date(),
    });

    // Update user balance and points
    user.wallet_balance = transaction.balanceAfter;
    user.loyalty_points = transaction.pointsAfter;
    await this.userRepository.save(user);

    return await this.walletTransactionRepository.save(transaction);
  }
} 