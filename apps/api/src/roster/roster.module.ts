import { Global, Module } from '@nestjs/common';
import { EmployeeScopeService } from './employee-scope.service';

@Global()
@Module({
  providers: [EmployeeScopeService],
  exports: [EmployeeScopeService],
})
export class RosterModule {}
