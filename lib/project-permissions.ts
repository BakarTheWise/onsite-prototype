const sectionRoles: Record<string, readonly string[]> = {
  overview: [
    "OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "QUANTITY_SURVEYOR", "ACCOUNTANT",
    "PROCUREMENT_OFFICER", "SITE_SUPERVISOR", "STOREKEEPER", "SECURITY"
  ],
  dependencies: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "QUANTITY_SURVEYOR"],
  tasks: [
    "OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "QUANTITY_SURVEYOR", "ACCOUNTANT",
    "PROCUREMENT_OFFICER", "SITE_SUPERVISOR", "STOREKEEPER"
  ],
  site: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR", "STOREKEEPER", "SECURITY"],
  materials: [
    "OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "QUANTITY_SURVEYOR",
    "PROCUREMENT_OFFICER", "SITE_SUPERVISOR", "STOREKEEPER"
  ],
  money: ["OWNER", "PROJECT_LEAD", "QUANTITY_SURVEYOR", "ACCOUNTANT"],
  team: ["OWNER", "PROJECT_LEAD"],
  documents: [
    "OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "QUANTITY_SURVEYOR",
    "ACCOUNTANT", "PROCUREMENT_OFFICER", "SITE_SUPERVISOR", "STOREKEEPER"
  ],
  vendors: ["OWNER", "PROJECT_LEAD", "QUANTITY_SURVEYOR", "ACCOUNTANT", "PROCUREMENT_OFFICER", "VENDOR"],
  zones: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR"],
  "gate-log": ["OWNER", "PROJECT_LEAD", "SITE_SUPERVISOR", "SECURITY"]
};

const recordRoles: Record<string, readonly string[]> = {
  task: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR"],
  taskStatus: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR", "STOREKEEPER"],
  stage: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER"],
  dependency: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER"],
  material: ["OWNER", "PROJECT_LEAD", "PROCUREMENT_OFFICER", "STOREKEEPER"],
  inventory: ["OWNER", "PROJECT_LEAD", "PROCUREMENT_OFFICER", "STOREKEEPER"],
  budget: ["OWNER", "PROJECT_LEAD", "QUANTITY_SURVEYOR", "ACCOUNTANT"],
  fundRelease: ["OWNER", "ACCOUNTANT"],
  cash: ["OWNER", "PROJECT_LEAD", "ACCOUNTANT", "SITE_SUPERVISOR"],
  vendor: ["OWNER", "PROJECT_LEAD", "PROCUREMENT_OFFICER", "ACCOUNTANT"],
  dailyLog: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR"],
  issue: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR", "SECURITY"],
  attendance: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER", "SITE_SUPERVISOR", "SECURITY"],
  gateEntry: ["OWNER", "PROJECT_LEAD", "SITE_SUPERVISOR", "SECURITY"],
  zone: ["OWNER", "PROJECT_LEAD", "SITE_ENGINEER"]
};

export function canViewProjectSection(role: string, section: string) {
  return sectionRoles[section]?.includes(role) ?? false;
}

export function canWriteProjectRecord(role: string, recordType: string) {
  return recordRoles[recordType]?.includes(role) ?? false;
}

export function visibleProjectSections(role: string) {
  return Object.keys(sectionRoles).filter((section) => canViewProjectSection(role, section));
}
