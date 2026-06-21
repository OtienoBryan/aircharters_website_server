const { DataSource } = require('typeorm');
require('dotenv').config();

// Database configuration (same as in your app)
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: true,
  entities: ['src/**/*.entity.ts'],
});

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected successfully');

    // Check charter_deals table
    console.log('\n📦 Checking charter_deals table...');
    const dealsCount = await dataSource.query('SELECT COUNT(*) as count FROM charter_deals');
    console.log(`Total charter deals: ${dealsCount[0].count}`);

    if (dealsCount[0].count > 0) {
      // Get first few deals
      const sampleDeals = await dataSource.query('SELECT * FROM charter_deals LIMIT 3');
      console.log('\n📋 Sample deals:');
      sampleDeals.forEach((deal, index) => {
        console.log(`Deal ${index + 1}:`, {
          id: deal.id,
          companyId: deal.companyId,
          fixedRouteId: deal.fixedRouteId,
          aircraftId: deal.aircraftId,
          date: deal.date,
          time: deal.time,
          dealType: deal.dealType
        });
      });
    }

    // Check companies table
    console.log('\n🏢 Checking companies table...');
    const companiesCount = await dataSource.query('SELECT COUNT(*) as count FROM charters_companies');
    console.log(`Total companies: ${companiesCount[0].count}`);

    if (companiesCount[0].count > 0) {
      const companies = await dataSource.query('SELECT id, companyName, status FROM charters_companies LIMIT 5');
      console.log('\n🏢 Sample companies:');
      companies.forEach(company => {
        console.log(`- ID: ${company.id}, Name: ${company.companyName}, Status: ${company.status}`);
      });
    }

    // Check aircraft table
    console.log('\n✈️ Checking aircraft table...');
    const aircraftCount = await dataSource.query('SELECT COUNT(*) as count FROM aircrafts');
    console.log(`Total aircraft: ${aircraftCount[0].count}`);

    if (aircraftCount[0].count > 0) {
      const aircraft = await dataSource.query('SELECT id, name, isAvailable, maintenanceStatus FROM aircrafts LIMIT 5');
      console.log('\n✈️ Sample aircraft:');
      aircraft.forEach(plane => {
        console.log(`- ID: ${plane.id}, Name: ${plane.name}, Available: ${plane.isAvailable}, Maintenance: ${plane.maintenanceStatus}`);
      });
    }

    // Check fixed_routes table
    console.log('\n🛣️ Checking fixed_routes table...');
    const routesCount = await dataSource.query('SELECT COUNT(*) as count FROM fixed_routes');
    console.log(`Total routes: ${routesCount[0].count}`);

    if (routesCount[0].count > 0) {
      const routes = await dataSource.query('SELECT id, origin, destination FROM fixed_routes LIMIT 5');
      console.log('\n🛣️ Sample routes:');
      routes.forEach(route => {
        console.log(`- ID: ${route.id}, Route: ${route.origin} → ${route.destination}`);
      });
    }

    // Check the join query that's failing
    console.log('\n🔍 Testing the actual query used by the API...');
    const apiQuery = `
      SELECT COUNT(*) as count 
      FROM charter_deals deal 
      LEFT JOIN charters_companies company ON company.id = deal.companyId  
      LEFT JOIN fixed_routes route ON route.id = deal.fixedRouteId  
      LEFT JOIN aircrafts aircraft ON aircraft.id = deal.aircraftId 
      WHERE company.status = 'active' 
      AND aircraft.isAvailable = true 
      AND aircraft.maintenanceStatus = 'operational'
    `;
    const apiResult = await dataSource.query(apiQuery);
    console.log(`Deals matching API criteria: ${apiResult[0].count}`);

    if (apiResult[0].count === 0) {
      console.log('\n❌ No deals match the API criteria. Let\'s check why...');
      
      // Check companies with active status
      const activeCompanies = await dataSource.query("SELECT COUNT(*) as count FROM charters_companies WHERE status = 'active'");
      console.log(`Companies with status 'active': ${activeCompanies[0].count}`);
      
      // Check available aircraft
      const availableAircraft = await dataSource.query("SELECT COUNT(*) as count FROM aircrafts WHERE isAvailable = true AND maintenanceStatus = 'operational'");
      console.log(`Aircraft available and operational: ${availableAircraft[0].count}`);
      
      // Check deals with valid company and aircraft references
      const validDeals = await dataSource.query(`
        SELECT COUNT(*) as count 
        FROM charter_deals deal 
        WHERE deal.companyId IN (SELECT id FROM charters_companies) 
        AND deal.aircraftId IN (SELECT id FROM aircrafts)
        AND deal.fixedRouteId IN (SELECT id FROM fixed_routes)
      `);
      console.log(`Deals with valid references: ${validDeals[0].count}`);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

checkDatabase(); 