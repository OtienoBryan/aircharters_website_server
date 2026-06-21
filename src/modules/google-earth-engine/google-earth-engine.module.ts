import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoogleEarthEngineController } from './google-earth-engine.controller';
import { GoogleEarthEngineService } from './google-earth-engine.service';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [GoogleEarthEngineController],
  providers: [GoogleEarthEngineService],
  exports: [GoogleEarthEngineService],
})
export class GoogleEarthEngineModule {} 