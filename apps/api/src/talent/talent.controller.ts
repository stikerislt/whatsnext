import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TalentService } from './talent.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TalentController {
  constructor(private talent: TalentService) {}

  @Get('employees')
  @RequirePermission(PERMISSIONS.TALENT_READ)
  list(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('skill') skill?: string,
    @Query('overload') overload?: string,
    @Query('available') available?: string,
  ) {
    return this.talent.findAll(user.companyId, {
      search,
      skill,
      overload: overload === 'true',
      available: available === 'true',
    });
  }

  @Get('employees/cv/capabilities')
  @RequirePermission(PERMISSIONS.TALENT_READ)
  cvCapabilities() {
    return this.talent.getCvCapabilities();
  }

  @Get('employees/:id')
  @RequirePermission(PERMISSIONS.TALENT_READ)
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.talent.findOne(user.companyId, id);
  }

  @Post('employees/:id/cv')
  @RequirePermission(PERMISSIONS.CV_UPLOAD_SELF)
  @UseInterceptors(FileInterceptor('file'))
  uploadCv(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.talent.uploadCv(user.companyId, id, file, user.sub);
  }

  @Post('employees/cv/batch')
  @RequirePermission(PERMISSIONS.CV_UPLOAD_OTHERS)
  @UseInterceptors(FilesInterceptor('files', 20))
  batchUpload(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('employeeIds') employeeIdsRaw: string,
  ) {
    const employeeIds = JSON.parse(employeeIdsRaw || '[]') as string[];
    return this.talent.batchUploadCv(user.companyId, files ?? [], employeeIds, user.sub);
  }

  @Get('skills/gaps')
  @RequirePermission(PERMISSIONS.TALENT_READ)
  gaps(@CurrentUser() user: JwtPayload) {
    return this.talent.getSkillGaps(user.companyId);
  }
}
