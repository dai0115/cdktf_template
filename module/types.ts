export type PolicyConfig = {
  name: string;
  actions: string[];
  resources: string[];
  effect: "Allow" | "Deny";
};

export type RoleConfig = {
  name: string;
  service: string;
  effect: "Allow" | "Deny";
};

export type PolicyRoleAttachConfig = {
  resourceName: string;
  roleName: string;
  policyArn: string;
};
