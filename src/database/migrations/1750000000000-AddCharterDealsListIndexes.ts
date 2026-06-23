import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The /charter-deals list query (fleet page) filters on company.status,
 * aircraft.isAvailable + aircraft.maintenanceStatus, and orders by deal.date +
 * deal.time, plus joins on companyId/aircraftId/aircraft_images.aircraftId -
 * none of which had indexes, forcing full table scans on every request.
 */
export class AddCharterDealsListIndexes1750000000000 implements MigrationInterface {
  name = 'AddCharterDealsListIndexes1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`idx_charter_deals_date_time\` ON \`charter_deals\` (\`date\`, \`time\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_charter_deals_companyId\` ON \`charter_deals\` (\`companyId\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_charter_deals_aircraftId\` ON \`charter_deals\` (\`aircraftId\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_aircrafts_availability\` ON \`aircrafts\` (\`isAvailable\`, \`maintenanceStatus\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_charters_companies_status\` ON \`charters_companies\` (\`status\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_aircraft_images_aircraftId\` ON \`aircraft_images\` (\`aircraftId\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_aircraft_images_aircraftId\` ON \`aircraft_images\``);
    await queryRunner.query(`DROP INDEX \`idx_charters_companies_status\` ON \`charters_companies\``);
    await queryRunner.query(`DROP INDEX \`idx_aircrafts_availability\` ON \`aircrafts\``);
    await queryRunner.query(`DROP INDEX \`idx_charter_deals_aircraftId\` ON \`charter_deals\``);
    await queryRunner.query(`DROP INDEX \`idx_charter_deals_companyId\` ON \`charter_deals\``);
    await queryRunner.query(`DROP INDEX \`idx_charter_deals_date_time\` ON \`charter_deals\``);
  }
}
