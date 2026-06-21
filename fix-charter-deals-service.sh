#!/bin/bash

# Script to fix charter-deals service after removing fixedRoute
echo "🔧 Fixing charter-deals service..."

# Remove fixedRouteId from all object literals
sed -i '' '/fixedRouteId: deal.deal_fixedRouteId,/d' src/modules/charter-deals/charter-deals.service.ts

# Remove fixedRouteId from select statements
sed -i '' '/deal.fixedRouteId/d' src/modules/charter-deals/charter-deals.service.ts

# Update origin/destination to use originName/destinationName
sed -i '' 's/origin: deal.deal_originName,/originName: deal.deal_originName,/g' src/modules/charter-deals/charter-deals.service.ts
sed -i '' 's/destination: deal.deal_destinationName,/destinationName: deal.deal_destinationName,/g' src/modules/charter-deals/charter-deals.service.ts

# Remove pricePerHour and discountPerHour references
sed -i '' '/pricePerHour: null/d' src/modules/charter-deals/charter-deals.service.ts
sed -i '' '/discountPerHour: 0/d' src/modules/charter-deals/charter-deals.service.ts
sed -i '' '/discountPerHour: number/d' src/modules/charter-deals/charter-deals.service.ts

# Remove dealType references
sed -i '' '/dealType: "privateCharter"/d' src/modules/charter-deals/charter-deals.service.ts

echo "✅ Charter-deals service fixed!"
