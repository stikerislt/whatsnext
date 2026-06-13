"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Urgency = exports.DecisionStatus = exports.IntegrationProvider = exports.RoleName = exports.GoalStatus = exports.TaskStatus = exports.ProjectType = void 0;
var ProjectType;
(function (ProjectType) {
    ProjectType["STRATEGIC"] = "strategic";
    ProjectType["TACTICAL"] = "tactical";
    ProjectType["OPS"] = "ops";
    ProjectType["UNLINKED"] = "unlinked";
})(ProjectType || (exports.ProjectType = ProjectType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["PENDING"] = "pending";
    TaskStatus["OFF_TRACK"] = "off_track";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var GoalStatus;
(function (GoalStatus) {
    GoalStatus["ON_TRACK"] = "on_track";
    GoalStatus["AT_RISK"] = "at_risk";
    GoalStatus["OFF_TRACK"] = "off_track";
})(GoalStatus || (exports.GoalStatus = GoalStatus = {}));
var RoleName;
(function (RoleName) {
    RoleName["SUPER_ADMIN"] = "super_admin";
    RoleName["CEO"] = "ceo";
    RoleName["EXECUTIVE"] = "executive";
    RoleName["HR"] = "hr";
    RoleName["TEAM_LEAD"] = "team_lead";
    RoleName["EMPLOYEE"] = "employee";
})(RoleName || (exports.RoleName = RoleName = {}));
var IntegrationProvider;
(function (IntegrationProvider) {
    IntegrationProvider["JIRA"] = "jira";
    IntegrationProvider["CLICKUP"] = "clickup";
    IntegrationProvider["SLACK"] = "slack";
    IntegrationProvider["SALESFORCE"] = "salesforce";
    IntegrationProvider["NOTION"] = "notion";
    IntegrationProvider["HUBSPOT"] = "hubspot";
    IntegrationProvider["HIBOB"] = "hibob";
    IntegrationProvider["TEAMS"] = "teams";
})(IntegrationProvider || (exports.IntegrationProvider = IntegrationProvider = {}));
var DecisionStatus;
(function (DecisionStatus) {
    DecisionStatus["PENDING"] = "pending";
    DecisionStatus["APPROVED"] = "approved";
    DecisionStatus["REJECTED"] = "rejected";
    DecisionStatus["DEFERRED"] = "deferred";
})(DecisionStatus || (exports.DecisionStatus = DecisionStatus = {}));
var Urgency;
(function (Urgency) {
    Urgency["LOW"] = "Low";
    Urgency["MEDIUM"] = "Medium";
    Urgency["HIGH"] = "High";
    Urgency["URGENT"] = "Urgent";
})(Urgency || (exports.Urgency = Urgency = {}));
//# sourceMappingURL=types.js.map