import { Module } from '@nestjs/common';
import { MateriaisController } from './materiais.controller';
import { MateriaisService } from './materiais.service';

@Module({
  controllers: [MateriaisController],
  providers: [MateriaisService],
  exports: [MateriaisService],
})
export class MateriaisModule {}
