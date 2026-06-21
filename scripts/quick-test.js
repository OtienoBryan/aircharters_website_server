const http = require('http');

const BASE_URL = 'http://localhost:5000';

console.log('🚀 Quick Auth Test');
console.log('==================\n');

// Test 1: Check if server is running
function testServerHealth() {
  console.log('1️⃣ Testing server health...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server is running (Status: ${res.statusCode})`);
    console.log('');
    
    // Run next test
    testInvalidToken();
  });

  req.on('error', (e) => {
    console.log('❌ Server is not running');
    console.log('Please start your NestJS server: npm run start:dev');
    process.exit(1);
  });

  req.end();
}

// Test 2: Test with invalid Firebase token
function testInvalidToken() {
  console.log('2️⃣ Testing with invalid Firebase token...');
  
  const postData = JSON.stringify({
    firebaseToken: 'invalid-token-here',
    userData: {
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+234'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/firebase/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Response Body: ${data}`);
      
      if (res.statusCode === 401) {
        console.log('✅ Correctly rejected invalid token\n');
      } else {
        console.log('❌ Expected 401 but got', res.statusCode, '\n');
      }
      
      // Run next test
      testMissingToken();
    });
  });

  req.on('error', (e) => {
    console.log('❌ Request failed:', e.message, '\n');
    testMissingToken();
  });

  req.write(postData);
  req.end();
}

// Test 3: Test with missing Firebase token
function testMissingToken() {
  console.log('3️⃣ Testing with missing Firebase token...');
  
  const postData = JSON.stringify({
    userData: {
      firstName: 'Jane',
      lastName: 'Smith',
      countryCode: '+1'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/firebase/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Response Body: ${data}`);
      
      if (res.statusCode === 400) {
        console.log('✅ Correctly rejected missing token\n');
      } else {
        console.log('❌ Expected 400 but got', res.statusCode, '\n');
      }
      
      // Run next test
      testProfileWithoutToken();
    });
  });

  req.on('error', (e) => {
    console.log('❌ Request failed:', e.message, '\n');
    testProfileWithoutToken();
  });

  req.write(postData);
  req.end();
}

// Test 4: Test profile endpoint without token
function testProfileWithoutToken() {
  console.log('4️⃣ Testing profile endpoint without token...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/profile',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Response Body: ${data}`);
      
      if (res.statusCode === 401) {
        console.log('✅ Correctly rejected unauthorized access\n');
      } else {
        console.log('❌ Expected 401 but got', res.statusCode, '\n');
      }
      
      // Show next steps
      showNextSteps();
    });
  });

  req.on('error', (e) => {
    console.log('❌ Request failed:', e.message, '\n');
    showNextSteps();
  });

  req.end();
}

// Show next steps for manual testing
function showNextSteps() {
  console.log('🎯 Next Steps for Manual Testing:');
  console.log('==================================');
  console.log('');
  console.log('1. Start your Flutter app and navigate to the auth test screen');
  console.log('2. Register a new user with email/password');
  console.log('3. Copy the Firebase token from the app');
  console.log('4. Test the backend with the real token:');
  console.log('');
  console.log('   curl -X POST http://localhost:5000/api/auth/firebase/login \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{');
  console.log('       "firebaseToken": "YOUR_TOKEN_HERE",');
  console.log('       "userData": {');
  console.log('         "firstName": "John",');
  console.log('         "lastName": "Doe",');
  console.log('         "countryCode": "+1"');
  console.log('       }');
  console.log('     }\'');
  console.log('');
  console.log('5. Check the database for the new user:');
  console.log('   SELECT * FROM users ORDER BY created_at DESC LIMIT 1;');
  console.log('');
  console.log('✅ Basic endpoint tests completed!');
}

// Start the tests
testServerHealth(); 