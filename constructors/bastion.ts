import { Construct } from "constructs";
import { Token, Fn } from "cdktf";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { IamInstanceProfileConfig } from "@cdktf/provider-aws/lib/iam-instance-profile";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Subnets } from "../.gen/modules/Subnets";

import { Role, PolicyRoleAttach, InstancProfile } from "../module/iam";
import { RoleConfig, PolicyRoleAttachConfig } from "../module/types";

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

    /*
    const policyProps: IamPolicyConfig = {
      name: "bastion",
      actions: [
        "ec2messages:*",
        "ssm:UpdateInstanceInformation",
        "ssmmessages:*",
      ],
      resources: ["*"],
      effect: "Allow",
    };
    const policy = new Policy(this, `${policyProps.name}-Policy`, policyProps);
    */

    const roleProps: RoleConfig = {
      name: "bastion",
      service: "ec2.amazonaws.com",
      effect: "Allow",
    };
    const role = new Role(this, `$${roleProps.name}-Role`, roleProps);

    const attachbacicPolicy: PolicyRoleAttachConfig = {
      resourceName: `${prefix}-attachPolicy-role`,
      roleName: role.name,
      policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    };

    new PolicyRoleAttach(
      this,
      `${prefix}-attachPolicy-role`,
      attachbacicPolicy
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
      instanceType: "t3.micro",
      vpcSecurityGroupIds: [securityGroup.id],
      subnetId: Fn.element(Token.asList(bastionSubnet.subnetIdsOutput), 0),
      userData: Fn.file(path.join(__dirname, "bastion_install.sh")),
      tags: {
        Name: `${prefix}-bastion`,
      },
    });

    // Aurora作成
  }
}
