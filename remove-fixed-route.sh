#!/bin/bash

# Script to remove fixedRoute references from the codebase
echo "🔧 Removing fixedRoute references..."

# Remove fixedRoute entity file
if [ -f "src/common/entities/fixed-route.entity.ts" ]; then
    rm "src/common/entities/fixed-route.entity.ts"
    echo "✅ Removed fixed-route.entity.ts"
fi

# Remove fixedRoute from trips module
sed -i '' '/import.*FixedRoute/d' src/modules/trips/trips.module.ts
sed -i '' '/FixedRoute,/d' src/modules/trips/trips.module.ts
echo "✅ Updated trips.module.ts"

# Remove fixedRoute from charter-deals module
sed -i '' '/import.*FixedRoute/d' src/modules/charter-deals/charter-deals.module.ts
sed -i '' '/FixedRoute,/d' src/modules/charter-deals/charter-deals.module.ts
echo "✅ Updated charter-deals.module.ts"

# Remove fixedRoute from app module
sed -i '' '/import.*FixedRoute/d' src/app.module.ts
sed -i '' '/FixedRoute,/d' src/app.module.ts
echo "✅ Updated app.module.ts"

# Update charter-deal entity
sed -i '' '/import.*FixedRoute/d' src/common/entities/charter-deal.entity.ts
sed -i '' '/fixedRouteId/d' src/common/entities/charter-deal.entity.ts
sed -i '' '/@ManyToOne.*FixedRoute/d' src/common/entities/charter-deal.entity.ts
sed -i '' '/fixedRoute: FixedRoute/d' src/common/entities/charter-deal.entity.ts
echo "✅ Updated charter-deal.entity.ts"

# Update charter-deals service
sed -i '' '/import.*FixedRoute/d' src/modules/charter-deals/charter-deals.service.ts
sed -i '' '/@InjectRepository.*FixedRoute/d' src/modules/charter-deals/charter-deals.service.ts
sed -i '' '/private.*routeRepository/d' src/modules/charter-deals/charter-deals.service.ts
echo "✅ Updated charter-deals.service.ts"

# Update trips service
sed -i '' '/import.*FixedRoute/d' src/modules/trips/trips.service.ts
sed -i '' '/@InjectRepository.*FixedRoute/d' src/modules/trips/trips.service.ts
sed -i '' '/private.*routeRepository/d' src/modules/trips/trips.service.ts
echo "✅ Updated trips.service.ts"

# Update booking query service
sed -i '' '/leftJoinAndSelect.*fixedRoute/d' src/modules/bookings/services/booking-query.service.ts
sed -i '' '/booking\.deal\.fixedRoute\.origin/d' src/modules/bookings/services/booking-query.service.ts
sed -i '' '/booking\.deal\.fixedRoute\.destination/d' src/modules/bookings/services/booking-query.service.ts
echo "✅ Updated booking-query.service.ts"

# Update bookings service
sed -i '' '/booking\.deal\.fixedRoute\.origin/d' src/modules/bookings/bookings.service.ts
sed -i '' '/booking\.deal\.fixedRoute\.destination/d' src/modules/bookings/bookings.service.ts
echo "✅ Updated bookings.service.ts"

echo "🎉 FixedRoute references removed successfully!"
echo "📝 Note: You may need to manually update some service methods that reference fixedRoute"
echo "🔧 Restart your server to apply changes"
