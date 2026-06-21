const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'http://localhost:3000';

console.log('🚀 Air Charters User Registration Test Script');
console.log('=============================================\n');

// Test 1: Test with invalid Firebase token
async function testInvalidToken() {
  console.log('1️⃣ Testing with invalid Firebase token...');
  
  const command = `curl -X POST ${BASE_URL}/auth/firebase/login \\
    -H "Content-Type: application/json" \\
    -d '{
      "firebaseToken": "invalid-token-here",
      "userData": {
        "firstName": "John",
        "lastName": "Doe",
        "countryCode": "+234"
      }
    }'`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    console.log('Response:', stdout);
    console.log('Expected: 401 Unauthorized\n');
  });
}

// Test 2: Test with missing Firebase token
async function testMissingToken() {
  console.log('2️⃣ Testing with missing Firebase token...');
  
  const command = `curl -X POST ${BASE_URL}/auth/firebase/login \\
    -H "Content-Type: application/json" \\
    -d '{
      "userData": {
        "firstName": "Jane",
        "lastName": "Smith",
        "countryCode": "+1"
      }
    }'`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    console.log('Response:', stdout);
    console.log('Expected: 400 Bad Request\n');
  });
}

// Test 3: Test profile endpoint without token
async function testProfileWithoutToken() {
  console.log('3️⃣ Testing profile endpoint without token...');
  
  const command = `curl -X GET ${BASE_URL}/auth/profile \\
    -H "Content-Type: application/json"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    console.log('Response:', stdout);
    console.log('Expected: 401 Unauthorized\n');
  });
}

// Test 4: Test with valid Firebase token (requires manual input)
async function testValidToken() {
  console.log('4️⃣ Testing with valid Firebase token...');
  console.log('Please enter a valid Firebase ID token from your Flutter app:');
  
  rl.question('Firebase Token: ', (token) => {
    const command = `curl -X POST ${BASE_URL}/auth/firebase/login \\
      -H "Content-Type: application/json" \\
      -d '{
        "firebaseToken": "${token}",
        "userData": {
          "firstName": "Test",
          "lastName": "User",
          "countryCode": "+1"
        }
      }'`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Error:', error.message);
        return;
      }
      console.log('Response:', stdout);
      console.log('Expected: 200 OK with access token and user data\n');
      
      // Try to parse the response and test profile endpoint
      try {
        const response = JSON.parse(stdout);
        if (response.accessToken) {
          testProfileWithToken(response.accessToken);
        }
      } catch (e) {
        console.log('Could not parse response for profile test');
      }
    });
  });
}

// Test 5: Test profile endpoint with valid token
async function testProfileWithToken(accessToken) {
  console.log('5️⃣ Testing profile endpoint with valid token...');
  
  const command = `curl -X GET ${BASE_URL}/auth/profile \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer ${accessToken}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    console.log('Response:', stdout);
    console.log('Expected: 200 OK with user profile data\n');
  });
}

// Test 6: Test profile update
async function testProfileUpdate(accessToken) {
  console.log('6️⃣ Testing profile update...');
  
  const command = `curl -X PUT ${BASE_URL}/auth/profile \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer ${accessToken}" \\
    -d '{
      "firstName": "Updated",
      "lastName": "Name",
      "countryCode": "+44"
    }'`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    console.log('Response:', stdout);
    console.log('Expected: 200 OK with updated user data\n');
  });
}

// Main test runner
async function runTests() {
  console.log('Starting tests...\n');
  
  // Run basic tests first
  await testInvalidToken();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testMissingToken();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testProfileWithoutToken();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Interactive test with valid token
  await testValidToken();
}

// Check if server is running
function checkServer() {
  const command = `curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/health || echo "000"`;
  
  exec(command, (error, stdout, stderr) => {
    const statusCode = stdout.trim();
    if (statusCode === '200') {
      console.log('✅ Server is running on', BASE_URL);
      runTests();
    } else {
      console.log('❌ Server is not running on', BASE_URL);
      console.log('Please start your NestJS server first:');
      console.log('npm run start:dev');
      process.exit(1);
    }
  });
}

// Start the test
checkServer(); 