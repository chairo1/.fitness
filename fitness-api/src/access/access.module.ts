import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Permission, Role } from './access.entities';
import { AccessService } from './access.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, User])],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
