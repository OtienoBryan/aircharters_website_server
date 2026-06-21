const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testExperiencesAPI() {
  try {
    console.log('🧪 Testing Experiences API...\n');

    // Test 1: Get all experiences
    console.log('1. Testing GET /experiences');
    const allExperiences = await axios.get(`${BASE_URL}/experiences`);
    console.log('✅ Success:', allExperiences.data.success);
    console.log('📊 Categories found:', allExperiences.data.data.categories.length);
    console.log('📋 Categories:', allExperiences.data.data.categories.map(c => c.title));
    console.log('');

    // Test 2: Get experience details (if any exist)
    if (allExperiences.data.data.categories.length > 0 && 
        allExperiences.data.data.categories[0].deals.length > 0) {
      const firstExperienceId = allExperiences.data.data.categories[0].deals[0].id;
      console.log(`2. Testing GET /experiences/${firstExperienceId}`);
      const experienceDetails = await axios.get(`${BASE_URL}/experiences/${firstExperienceId}`);
      console.log('✅ Success:', experienceDetails.data.success);
      console.log('📋 Experience:', experienceDetails.data.data.title);
      console.log('📍 Location:', experienceDetails.data.data.city + ', ' + experienceDetails.data.data.country);
      console.log('📸 Images:', experienceDetails.data.data.images.length);
      console.log('📅 Schedules:', experienceDetails.data.data.schedules.length);
      console.log('');
    }

    // Test 3: Get experiences by category
    if (allExperiences.data.data.categories.length > 0) {
      const category = allExperiences.data.data.categories[0].title;
      console.log(`3. Testing GET /experiences/category/${encodeURIComponent(category)}`);
      const categoryExperiences = await axios.get(`${BASE_URL}/experiences/category/${encodeURIComponent(category)}`);
      console.log('✅ Success:', categoryExperiences.data.success);
      console.log('📊 Experiences in category:', categoryExperiences.data.data.length);
      console.log('');
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

testExperiencesAPI();
