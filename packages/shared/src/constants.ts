export const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_USER_EMAIL = 'demo@example.com';
export const DEMO_COMPANY_NAME = 'OrgName, UAB';
export const DEMO_PASSWORD = 'demo12345';

export function isDemoCompany(companyId: string): boolean {
  return companyId === DEMO_COMPANY_ID;
}
