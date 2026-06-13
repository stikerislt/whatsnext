import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcCapacityFree } from '@whatsnext/shared';
import { AuditService } from '../audit/audit.service';
import { CvParserService } from './cv-parser.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TalentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cvParser: CvParserService,
    private marketplace: MarketplaceService,
  ) {}

  async findAll(
    companyId: string,
    filters: { search?: string; skill?: string; overload?: boolean; available?: boolean },
  ) {
    let employees = await this.prisma.employee.findMany({
      where: { companyId },
      include: {
        department: true,
        skills: { include: { skill: true } },
        cvDocument: true,
        workAllocations: { orderBy: { periodStart: 'desc' }, take: 1 },
        projectMembers: { include: { project: true } },
      },
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.title?.toLowerCase().includes(q) ||
          e.skills.some((s) => s.skill.name.toLowerCase().includes(q)),
      );
    }
    if (filters.skill) {
      const sk = filters.skill.toLowerCase();
      employees = employees.filter((e) =>
        e.skills.some((s) => s.skill.name.toLowerCase().includes(sk)),
      );
    }
    if (filters.overload) employees = employees.filter((e) => e.loadPct > 100);
    if (filters.available) employees = employees.filter((e) => e.loadPct < 85);

    return employees.map((e) => ({
      ...e,
      capacityFreePct: calcCapacityFree(e.loadPct),
      skillsList: e.skills.map((s) => s.skill.name),
      workSplit: e.workAllocations[0] ?? null,
    }));
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        department: true,
        skills: { include: { skill: true } },
        cvDocument: true,
        workAllocations: { orderBy: { periodStart: 'desc' }, take: 1 },
        tasks: true,
        projectMembers: { include: { project: true } },
      },
    });
    if (!employee) throw new NotFoundException();
    return employee;
  }

  async uploadCv(companyId: string, employeeId: string, file: Express.Multer.File, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    const s3Key = path.join(companyId, 'cvs', `${employeeId}-${file.originalname}`);
    const dest = path.join(uploadDir, s3Key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.buffer);

    const parsed = await this.cvParser.parse(file.buffer, file.originalname, file.mimetype, employee.name);
    const extractedSkills = parsed.skills.length ? parsed.skills : ['General'];

    const cv = await this.prisma.cVDocument.upsert({
      where: { employeeId },
      create: {
        employeeId,
        companyId,
        fileName: file.originalname,
        s3Key,
        parseStatus: 'completed',
        parsedAt: new Date(),
        extractedSkills: {
          skills: extractedSkills,
          background: parsed.background,
          snippet: parsed.rawSnippet,
          name: parsed.name,
          title: parsed.title,
          email: parsed.email,
          sourceFormat: parsed.sourceFormat,
        },
      },
      update: {
        fileName: file.originalname,
        s3Key,
        parseStatus: 'completed',
        parsedAt: new Date(),
        extractedSkills: {
          skills: extractedSkills,
          background: parsed.background,
          snippet: parsed.rawSnippet,
          name: parsed.name,
          title: parsed.title,
          email: parsed.email,
          sourceFormat: parsed.sourceFormat,
        },
      },
    });

    await this.applySkillsToEmployee(companyId, employeeId, extractedSkills, parsed.background);
    await this.marketplace.rematchOpenRequests(companyId);

    await this.audit.log(companyId, userId, 'cv.uploaded', 'cv_document', cv.id, null, {
      employeeId,
      skills: extractedSkills,
    });

    return {
      ...cv,
      extractedSkills,
      background: parsed.background,
      name: parsed.name,
      title: parsed.title,
      email: parsed.email,
      sourceFormat: parsed.sourceFormat,
      employee: { id: employee.id, name: employee.name },
    };
  }

  async batchUploadCv(
    companyId: string,
    files: Express.Multer.File[],
    employeeIds: string[],
    userId: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException('No CV files uploaded');
    }
    if (!employeeIds?.length) {
      throw new BadRequestException('No employees selected for batch upload');
    }

    const results = [];
    const count = Math.min(files.length, employeeIds.length);

    for (let i = 0; i < count; i++) {
      const employeeId = employeeIds[i];
      try {
        const result = await this.uploadCv(companyId, employeeId, files[i], userId);
        results.push({
          ok: true,
          fileName: files[i].originalname,
          employeeId,
          employeeName: result.employee?.name,
          extractedSkills: result.extractedSkills,
          background: result.background,
          sourceFormat: result.sourceFormat,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({
          ok: false,
          fileName: files[i].originalname,
          employeeId,
          error: message,
        });
      }
    }

    if (files.length > employeeIds.length) {
      for (let i = employeeIds.length; i < files.length; i++) {
        results.push({
          ok: false,
          fileName: files[i].originalname,
          error: 'No employee mapped for this file',
        });
      }
    }

    await this.marketplace.rematchOpenRequests(companyId);
    return results;
  }

  private async applySkillsToEmployee(
    companyId: string,
    employeeId: string,
    skillNames: string[],
    background?: string,
  ) {
    const dept = background
      ? await this.prisma.department.findFirst({ where: { companyId, name: { contains: background, mode: 'insensitive' } } })
      : null;

    if (dept) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { departmentId: dept.id },
      });
    }

    for (const skillName of skillNames) {
      const normalized = skillName.toLowerCase();
      const skill = await this.prisma.skill.upsert({
        where: { companyId_normalizedName: { companyId, normalizedName: normalized } },
        create: {
          companyId,
          name: skillName,
          normalizedName: normalized,
          category: background ?? 'General',
        },
        update: {},
      });
      await this.prisma.employeeSkill.upsert({
        where: { employeeId_skillId: { employeeId, skillId: skill.id } },
        create: { employeeId, skillId: skill.id, companyId, source: 'cv', proficiency: 4 },
        update: { source: 'cv' },
      });
    }

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { availSignalled: true },
    });
  }

  getCvCapabilities() {
    return this.cvParser.getCapabilities();
  }

  async getSkillGaps(companyId: string) {
    const skills = await this.prisma.skill.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
    });
    const needMap: Record<string, number> = {
      Engineering: 10,
      Product: 5,
      'Data & Analytics': 6,
      Design: 4,
      Marketing: 5,
    };
    return Object.entries(needMap).map(([category, need]) => {
      const have = skills.filter((s) => s.category === category).reduce((a, s) => a + s._count.employees, 0);
      return { category, have, need, gap: Math.max(0, need - have) };
    });
  }
}
