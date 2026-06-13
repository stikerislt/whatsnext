"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
const types_1 = require("./types");
exports.PERMISSIONS = {
    TENANT_ADMIN: 'tenant:admin',
    STRATEGY_READ: 'strategy:read',
    STRATEGY_WRITE: 'strategy:write',
    PROJECTS_READ: 'projects:read',
    PROJECTS_WRITE: 'projects:write',
    TALENT_READ: 'talent:read',
    TALENT_WRITE: 'talent:write',
    CV_UPLOAD_SELF: 'cv:upload:self',
    CV_UPLOAD_OTHERS: 'cv:upload:others',
    MARKETPLACE: 'marketplace:use',
    BONUS_CONFIG: 'bonus:config',
    BONUS_VIEW_ALL: 'bonus:view:all',
    DECISIONS_APPROVE: 'decisions:approve',
    INTEGRATIONS_MANAGE: 'integrations:manage',
    SSO_CONFIG: 'sso:config',
    AI_FULL: 'ai:full',
    AUDIT_READ: 'audit:read',
    GDPR_EXPORT: 'gdpr:export',
};
const ALL = Object.values(exports.PERMISSIONS);
exports.ROLE_PERMISSIONS = {
    [types_1.RoleName.SUPER_ADMIN]: ALL,
    [types_1.RoleName.CEO]: [
        exports.PERMISSIONS.STRATEGY_READ,
        exports.PERMISSIONS.STRATEGY_WRITE,
        exports.PERMISSIONS.PROJECTS_READ,
        exports.PERMISSIONS.PROJECTS_WRITE,
        exports.PERMISSIONS.TALENT_READ,
        exports.PERMISSIONS.CV_UPLOAD_SELF,
        exports.PERMISSIONS.MARKETPLACE,
        exports.PERMISSIONS.BONUS_VIEW_ALL,
        exports.PERMISSIONS.DECISIONS_APPROVE,
        exports.PERMISSIONS.INTEGRATIONS_MANAGE,
        exports.PERMISSIONS.AI_FULL,
        exports.PERMISSIONS.AUDIT_READ,
    ],
    [types_1.RoleName.EXECUTIVE]: [
        exports.PERMISSIONS.STRATEGY_READ,
        exports.PERMISSIONS.STRATEGY_WRITE,
        exports.PERMISSIONS.PROJECTS_READ,
        exports.PERMISSIONS.PROJECTS_WRITE,
        exports.PERMISSIONS.TALENT_READ,
        exports.PERMISSIONS.CV_UPLOAD_SELF,
        exports.PERMISSIONS.MARKETPLACE,
        exports.PERMISSIONS.BONUS_VIEW_ALL,
        exports.PERMISSIONS.DECISIONS_APPROVE,
        exports.PERMISSIONS.AI_FULL,
    ],
    [types_1.RoleName.HR]: [
        exports.PERMISSIONS.STRATEGY_READ,
        exports.PERMISSIONS.TALENT_READ,
        exports.PERMISSIONS.TALENT_WRITE,
        exports.PERMISSIONS.CV_UPLOAD_SELF,
        exports.PERMISSIONS.CV_UPLOAD_OTHERS,
        exports.PERMISSIONS.MARKETPLACE,
        exports.PERMISSIONS.BONUS_CONFIG,
        exports.PERMISSIONS.BONUS_VIEW_ALL,
        exports.PERMISSIONS.AI_FULL,
        exports.PERMISSIONS.GDPR_EXPORT,
    ],
    [types_1.RoleName.TEAM_LEAD]: [
        exports.PERMISSIONS.STRATEGY_READ,
        exports.PERMISSIONS.PROJECTS_READ,
        exports.PERMISSIONS.PROJECTS_WRITE,
        exports.PERMISSIONS.TALENT_READ,
        exports.PERMISSIONS.CV_UPLOAD_SELF,
        exports.PERMISSIONS.MARKETPLACE,
        exports.PERMISSIONS.AI_FULL,
    ],
    [types_1.RoleName.EMPLOYEE]: [
        exports.PERMISSIONS.STRATEGY_READ,
        exports.PERMISSIONS.PROJECTS_READ,
        exports.PERMISSIONS.TALENT_READ,
        exports.PERMISSIONS.CV_UPLOAD_SELF,
        exports.PERMISSIONS.MARKETPLACE,
        exports.PERMISSIONS.AI_FULL,
    ],
};
function hasPermission(roles, permission) {
    return roles.some((role) => exports.ROLE_PERMISSIONS[role]?.includes(permission));
}
//# sourceMappingURL=rbac.js.map