const mysql = require('mysql2');
require('dotenv').config();

console.log('Testing database connection...');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_DATABASE);
console.log('Username:', process.env.DB_USERNAME);

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Error code:', err.code);
    process.exit(1);
  }
  console.log('✅ Database connected successfully!');
  
  // Test a simple query
  connection.query('SELECT 1 as test', (err, results) => {
    if (err) {
      console.error('❌ Query test failed:', err.message);
      connection.end();
      process.exit(1);
    } else {
      console.log('✅ Query test successful:', results);
      
      // Now check the actual data
      checkDatabaseContent();
    }
  });
});

async function checkDatabaseContent() {
  console.log('\n🔍 Checking database content...\n');

  try {
    // Check charter_deals table
    await queryPromise('📦 Checking charter_deals table...', 'SELECT COUNT(*) as count FROM charter_deals');

    // Check companies table
    await queryPromise('🏢 Checking companies table...', 'SELECT COUNT(*) as count FROM charters_companies');

    // Check aircraft table
    await queryPromise('✈️ Checking aircraft table...', 'SELECT COUNT(*) as count FROM aircrafts');

    // Check fixed_routes table
    await queryPromise('🛣️ Checking fixed_routes table...', 'SELECT COUNT(*) as count FROM fixed_routes');

    // Check sample data from each table
    console.log('\n📋 Sample data from each table:\n');

    // Sample charter deals
    const deals = await queryPromise('Charter Deals (sample)', 'SELECT * FROM charter_deals LIMIT 3');
    if (deals.length > 0) {
      deals.forEach((deal, index) => {
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

    // Sample companies
    const companies = await queryPromise('Companies (sample)', 'SELECT id, companyName, status FROM charters_companies LIMIT 5');
    if (companies.length > 0) {
      console.log('\n🏢 Companies:');
      companies.forEach(company => {
        console.log(`- ID: ${company.id}, Name: ${company.companyName}, Status: ${company.status}`);
      });
    }

    // Sample aircraft
    const aircraft = await queryPromise('Aircraft (sample)', 'SELECT id, name, isAvailable, maintenanceStatus FROM aircrafts LIMIT 5');
    if (aircraft.length > 0) {
      console.log('\n✈️ Aircraft:');
      aircraft.forEach(plane => {
        console.log(`- ID: ${plane.id}, Name: ${plane.name}, Available: ${plane.isAvailable}, Maintenance: ${plane.maintenanceStatus}`);
      });
    }

    // Sample routes
    const routes = await queryPromise('Routes (sample)', 'SELECT id, origin, destination FROM fixed_routes LIMIT 5');
    if (routes.length > 0) {
      console.log('\n🛣️ Routes:');
      routes.forEach(route => {
        console.log(`- ID: ${route.id}, Route: ${route.origin} → ${route.destination}`);
      });
    }

    // Test the exact API query
    console.log('\n🔍 Testing the exact API query that returns 0 results...');
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
    const apiResult = await queryPromise('API Query Result', apiQuery);
    console.log(`\n📊 Deals matching API criteria: ${apiResult[0].count}`);

    if (apiResult[0].count === 0) {
      console.log('\n❌ No deals match the API criteria. Let\'s diagnose...\n');
      
      // Check companies with active status
      const activeCompanies = await queryPromise('Active Companies', "SELECT COUNT(*) as count FROM charters_companies WHERE status = 'active'");
      console.log(`Companies with status 'active': ${activeCompanies[0].count}`);
      
      // Check all company statuses
      const companyStatuses = await queryPromise('Company Statuses', "SELECT status, COUNT(*) as count FROM charters_companies GROUP BY status");
      console.log('Company status breakdown:', companyStatuses);
      
      // Check available aircraft
      const availableAircraft = await queryPromise('Available Aircraft', "SELECT COUNT(*) as count FROM aircrafts WHERE isAvailable = true AND maintenanceStatus = 'operational'");
      console.log(`Aircraft available and operational: ${availableAircraft[0].count}`);
      
      // Check all aircraft statuses
      const aircraftStatuses = await queryPromise('Aircraft Statuses', "SELECT isAvailable, maintenanceStatus, COUNT(*) as count FROM aircrafts GROUP BY isAvailable, maintenanceStatus");
      console.log('Aircraft status breakdown:', aircraftStatuses);
      
      // Check deals with valid references
      const validDeals = await queryPromise('Valid Deals', `
        SELECT COUNT(*) as count 
        FROM charter_deals deal 
        WHERE deal.companyId IN (SELECT id FROM charters_companies) 
        AND deal.aircraftId IN (SELECT id FROM aircrafts)
        AND deal.fixedRouteId IN (SELECT id FROM fixed_routes)
      `);
      console.log(`Deals with valid foreign key references: ${validDeals[0].count}`);

      // Test without filters to see if join works
      const joinTest = await queryPromise('Join Test (no filters)', `
        SELECT COUNT(*) as count 
        FROM charter_deals deal 
        LEFT JOIN charters_companies company ON company.id = deal.companyId  
        LEFT JOIN fixed_routes route ON route.id = deal.fixedRouteId  
        LEFT JOIN aircrafts aircraft ON aircraft.id = deal.aircraftId
      `);
      console.log(`Total deals when joining tables (no filters): ${joinTest[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error checking database content:', error.message);
  } finally {
    connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

function queryPromise(label, query) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 ${label}...`);
    connection.query(query, (err, results) => {
      if (err) {
        console.error(`❌ ${label} failed:`, err.message);
        reject(err);
      } else {
        if (Array.isArray(results) && results.length > 0 && 'count' in results[0]) {
          console.log(`✅ ${label}: ${results[0].count} records`);
        } else {
          console.log(`✅ ${label}: ${results.length} records`);
        }
        resolve(results);
      }
  });
}); 
} 