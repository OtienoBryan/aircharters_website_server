import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperiencesController } from './experiences.controller';
import { ExperiencesService } from './experiences.service';
import { ExperienceImage } from '../../common/entities/experience-image.entity';
import { ExperienceTemplate } from '../../common/entities/experience-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExperienceTemplate,
      ExperienceImage,
    ]),
  ],
  controllers: [ExperiencesController],
  providers: [ExperiencesService],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
