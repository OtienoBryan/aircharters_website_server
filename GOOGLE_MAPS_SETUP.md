# 🌍 Google Maps API Setup Guide

## 🔧 **Step 1: Google Cloud Console Setup**

### **Enable Required APIs**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Enable these APIs:
   - **Places API** - For location search
   - **Geocoding API** - For reverse geocoding
   - **Distance Matrix API** - For distance calculations
   - **Maps JavaScript API** - For frontend maps

### **Create API Key**
1. Go to **Credentials** → **Create Credentials** → **API Key**
2. Copy the generated API key
3. **Restrict the API key** to only the enabled APIs for security

## 🔧 **Step 2: Environment Configuration**

Add this to your `.env` file:

```env
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

## 🔧 **Step 3: Test the Integration**

Once configured, test these endpoints:

```bash
# Test location search
curl "http://localhost:5000/api/google-earth-engine/search/locations?query=Wilson%20Airport"

# Test reverse geocoding
curl "http://localhost:5000/api/google-earth-engine/geocode/reverse?latitude=-1.3217&longitude=36.8147"

# Test distance calculation
curl "http://localhost:5000/api/google-earth-engine/distance/calculate?origin=40.7128,-74.0060&destination=34.0522,-118.2437"
```

## 🔧 **Step 4: API Key Security**

### **Restrict API Key:**
1. Go to **Credentials** → Click on your API key
2. Under **"Application restrictions"**:
   - Set to **"HTTP referrers"** for web apps
   - Set to **"IP addresses"** for server apps
3. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Choose only the APIs you enabled

### **Environment Variables:**
```env
# Production
GOOGLE_MAPS_API_KEY=AIzaSyC...your_actual_key

# Development
GOOGLE_MAPS_API_KEY=AIzaSyC...your_actual_key
```

## 🎯 **Expected Results**

After setup, you should get responses like:

```json
// Location Search
{
  "placeId": "ChIJ...",
  "name": "Wilson Airport",
  "formattedAddress": "Wilson Airport, Nairobi, Kenya",
  "location": {
    "lat": -1.3217,
    "lng": 36.8147
  }
}

// Reverse Geocoding
{
  "placeId": "ChIJ...",
  "name": "Wilson Airport",
  "formattedAddress": "Wilson Airport, Nairobi, Kenya",
  "location": {
    "lat": -1.3217,
    "lng": 36.8147
  }
}
```

## 🚀 **Current Status**

✅ **Flight Distance Calculation** - Working (no API key needed)
✅ **Flight Duration Estimation** - Working (no API key needed)
⏳ **Location Search** - Ready (needs API key)
⏳ **Reverse Geocoding** - Ready (needs API key)
⏳ **Distance Matrix** - Ready (needs API key)

## 📊 **API Endpoints Available**

```
✅ GET /api/google-earth-engine/distance/flight - Working
⏳ GET /api/google-earth-engine/search/locations - Needs API key
⏳ GET /api/google-earth-engine/geocode/reverse - Needs API key
⏳ GET /api/google-earth-engine/distance/calculate - Needs API key
```

Once you add the API key to your `.env` file, all endpoints will be fully functional! 