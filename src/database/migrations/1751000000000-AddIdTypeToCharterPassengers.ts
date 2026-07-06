import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Passengers can identify with either a passport or a national ID, but the
 * id_passport_number column had no way to record which kind of document the
 * number belongs to.
 */
export class AddIdTypeToCharterPassengers1751000000000 implements MigrationInterface {
  name = 'AddIdTypeToCharterPassengers1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`charter_passengers\` ADD COLUMN \`id_type\` enum('passport','national_id') DEFAULT 'passport' AFTER \`id_passport_number\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`charter_passengers\` DROP COLUMN \`id_type\``);
  }
}
