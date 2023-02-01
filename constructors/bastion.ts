import { Construct } from "constructs";
import { Token, Fn } from "cdktf";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { IamInstanceProfileConfig } from "@cdktf/provider-aws/lib/iam-instance-profile";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Subnets } from "../.gen/modules/Subnets";

import { Policy, Role, PolicyRoleAttach, InstancProfile } from "../module/iam";
import {
  IamPolicyConfig,
  IamRoleConfig,
  PolicyRoleAttachConfig,
} from "../module/types";

import { ConfigType } from "../config/types";

type bastionProps = {
  config: ConfigType;
  securityGroup: SecurityGroup;
  bastionSubnet: Subnets;
};

export class Bastion extends Construct {
  private readonly ami = "ami-0ad64728720227ff8"; // TODO: 他の取得方法の検討
  constructor(scope: Construct, id: string, props: bastionProps) {
    super(scope, id);

    const { securityGroup, bastionSubnet } = props;
    const { prefix } = props.config;

    const policyProps: IamPolicyConfig = {
      name: "bastion",
      actions: [
        "ec2messages:*",
        "ssm:UpdateInstanceInformation",
        "ssmmessages:*",
      ],
      resources: ["*"], // TODO:踏み台サーバを作成したら権限を小さくする
      effect: "Allow",
    };
    const policy = new Policy(this, `${policyProps.name}-Policy`, policyProps);

    const roleProps: IamRoleConfig = {
      name: "bastion",
      service: "ec2.amazonaws.com",
      effect: "Allow",
    };
    const role = new Role(this, `${policyProps.name}-Role`, roleProps);

    const attachbacicPolicy: PolicyRoleAttachConfig = {
      resourceName: `${prefix}-attachPolicy-role`,
      roleName: role.name,
      policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    };

    const attachPolicyRoleProps: PolicyRoleAttachConfig = {
      resourceName: `${prefix}-attachPolicy-role2`,
      roleName: role.name,
      policyArn: policy.arn,
    };

    new PolicyRoleAttach(
      this,
      `${prefix}-attachPolicy-role`,
      attachbacicPolicy
    );
    new PolicyRoleAttach(
      this,
      `${prefix}-attachPolicy-role2`,
      attachPolicyRoleProps
    );

    const instanceProfileConfig: IamInstanceProfileConfig = {
      name: `${prefix}-InstanceProfile`,
      role: role.name,
    };
    const instanceProfile = new InstancProfile(
      this,
      `${prefix}-InstanceProfile`,
      instanceProfileConfig
    );

    // 踏み台サーバの作成
    const path = require("path");
    new Instance(this, "ec2instance", {
      ami: this.ami,
      iamInstanceProfile: instanceProfile.name,
      instanceType: "t2.micro",
      vpcSecurityGroupIds: [securityGroup.id],
      subnetId: Fn.element(Token.asList(bastionSubnet.subnetIdsOutput), 0),
      userData: Fn.file(path.join(__dirname, "bastion_install.sh")),
    });
  }
}
