import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The account page's "Alerts" and "Cargo" widgets, and the dedicated
 * notifications page, were calling endpoints that had no backing tables at
 * all (404s) - this adds the two missing tables.
 */
export class CreateNotificationsAndCargoShipments1752000000000 implements MigrationInterface {
  name = 'CreateNotificationsAndCargoShipments1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` varchar(255) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`message\` text NOT NULL,
        \`type\` enum('booking','payment','loyalty','system') NOT NULL DEFAULT 'system',
        \`isRead\` tinyint NOT NULL DEFAULT '0',
        \`relatedBookingId\` int DEFAULT NULL,
        \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_notifications_userId\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`cargo_shipments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` varchar(255) NOT NULL,
        \`awbNumber\` varchar(50) NOT NULL,
        \`originCode\` varchar(10) NOT NULL,
        \`destinationCode\` varchar(10) NOT NULL,
        \`weightKg\` decimal(10,2) NOT NULL,
        \`status\` enum('booked','in_transit','delivered','cancelled') NOT NULL DEFAULT 'booked',
        \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_cargo_shipments_awbNumber\` (\`awbNumber\`),
        KEY \`idx_cargo_shipments_userId\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `cargo_shipments`');
    await queryRunner.query('DROP TABLE `notifications`');
  }
}
