import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

import { Vpc } from "../.gen/modules/Vpc";
import { VpcEndpoint } from "../.gen/modules/VpcEndpoint";

import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";
//import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";

export class VpcStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "AWS", {
      region: "ap-northeast-1",
    });

    // VPC
    const vpc = new Vpc(this, "MyVpc", {
      name: "my-vpc",
      cidr: "10.0.0.0/16",
      azs: ["ap-northeast-1a", "ap-northeast-1c"],
      privateSubnets: [
        "10.0.0.0/24",
        "10.0.1.0/24",
        "10.0.2.0/24",
        "10.0.3.0/24",
        "10.0.4.0/24",
        "10.0.5.0/24",
        "10.0.6.0/24",
      ],
      privateSubnetNames: [
        "PrivateEcs1",
        "PrivateEcs2",
        "PrivateDb1",
        "PrivateDb2",
        "PrivateAlb1",
        "PrivateAlb2",
        "PrivateBastion1",
      ],
    });

    // ALB用のセキュリティグループの作成
    const albSG = new SecurityGroup(this, "albSg", {
      name: "albSG",
      vpcId: vpc.vpcIdOutput,
    });
    // VPCLinkからのinboundのルールは別途必要になった時に作成
    new SecurityGroupRule(this, "albsg-egress-rule", {
      cidrBlocks: ["0.0.0.0/0"],
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: albSG.id,
    });

    // ECS用のセキュリティグループの作成
    const ecsSG = new SecurityGroup(this, "ecsSG", {
      name: "ecsSG",
      vpcId: vpc.vpcIdOutput,
    });
    new SecurityGroupRule(this, "ecsSG-ingress-rule", {
      sourceSecurityGroupId: albSG.id,
      description: "from ALB",
      type: "ingress",
      fromPort: 8080,
      toPort: 8080,
      protocol: "tcp",
      securityGroupId: ecsSG.id,
    });
    new SecurityGroupRule(this, "ecsSG-egress-rule", {
      cidrBlocks: ["0.0.0.0/0"],
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: ecsSG.id,
    });

    // 踏み台サーバ用のセキュリティグループの作成
    const bastionSG = new SecurityGroup(this, "bastionSG", {
      name: "bastionSG",
      vpcId: vpc.vpcIdOutput,
    });
    new SecurityGroupRule(this, "bastionSG-egress-rule", {
      cidrBlocks: ["0.0.0.0/0"],
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: bastionSG.id,
    });

    // VPCエンドポイント用のセキュリティグループの作成
    const endpointSG = new SecurityGroup(this, "endpointSG", {
      name: "endpointSG",
      vpcId: vpc.vpcIdOutput,
    });
    new SecurityGroupRule(this, "endpointSG-ingress-rule1", {
      cidrBlocks: ["10.0.0.0/16"],
      description: "from ALB",
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: endpointSG.id,
    });
    // こいつはいらないかも
    new SecurityGroupRule(this, "endpointSG-ingress-rule2", {
      sourceSecurityGroupId: bastionSG.id,
      description: "from Bastion",
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: endpointSG.id,
    });
    new SecurityGroupRule(this, "endpointSG-egress-rule", {
      cidrBlocks: ["10.0.0.0/16"],
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: endpointSG.id,
    });

    // VPCエンドポイントの作成
    new VpcEndpoint(this, "vpc-endpoint", {
      vpcId: vpc.vpcIdOutput,
      securityGroupIds: [endpointSG.id],
      endpoints: {
        ec2messages: {
          service: "ec2messages",
          subnet_ids: vpc.privateSubnetsOutput,
        },
        ssmmessages: {
          service: "ssmmessages",
        },
        ssm: {
          service: "ssm",
        },
      },
    });
  }

  /*
  private extractSubnetId(
    subnetsList: string[] | undefined,
    index: number
  ): string[] {
    if (subnetsList === undefined) {
      throw new Error("subnet is not found");
    }
    return subnetsList.slice(index);
  }
  */
}
