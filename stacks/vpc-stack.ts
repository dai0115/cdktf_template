import { Construct } from "constructs";
import { TerraformStack, Token } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

//import { VpcEndpoint } from "../.gen/modules/VpcEndpoint";
import { Vpc } from "../.gen/modules/Vpc";
import { Subnets } from "../.gen/modules/Subnets";

import { VpcEndpoint } from "@cdktf/provider-aws/lib/vpc-endpoint";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";

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
      enableDnsHostnames: true,
      enableDnsSupport: true,
      azs: ["ap-northeast-1a", "ap-northeast-1c"],
      privateSubnets: ["10.0.0.0/24", "10.0.1.0/24"],
      privateSubnetNames: ["PrivateAlb1", "PrivateAlb2"],
      intraSubnets: ["10.0.2.0/24", "10.0.3.0/24"],
      intraSubnetNames: ["PrivateEcs1", "PrivateEcs2"],
      databaseSubnets: ["10.0.4.0/24", "10.0.5.0/24"],
      databaseSubnetNames: ["PrivateDb1", "PrivateDb2"],
    });

    // VPCendpoint用のサブネットの追加
    const endpointSubnet = new Subnets(this, "EndpointSubnets", {
      vpcId: vpc.vpcIdOutput,
      availabilityZones: ["ap-northeast-1a"],
      cidrBlock: "10.0.6.0/24",
      subnetCount: "1",
      tags: {
        Name: "endpointSubnet",
      },
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
    new VpcEndpoint(this, "vpc-endpoint-ssm", {
      vpcId: vpc.vpcIdOutput,
      serviceName: "com.amazonaws.ap-northeast-1.ssm",
      vpcEndpointType: "Interface",
      subnetIds: Token.asList(endpointSubnet.subnetIdsOutput),
      securityGroupIds: [endpointSG.id],
      tags: {
        Name: "vpc-endpoint-ssm",
      },
    });

    new VpcEndpoint(this, "vpc-endpoint-ssmmessages", {
      vpcId: vpc.vpcIdOutput,
      serviceName: "com.amazonaws.ap-northeast-1.ssmmessages",
      vpcEndpointType: "Interface",
      subnetIds: Token.asList(endpointSubnet.subnetIdsOutput),
      securityGroupIds: [endpointSG.id],
      tags: {
        Name: "vpc-endpoint-ssmmessages",
      },
    });

    new VpcEndpoint(this, "vpc-endpoint-ec2messages", {
      vpcId: vpc.vpcIdOutput,
      serviceName: "com.amazonaws.ap-northeast-1.ec2messages",
      vpcEndpointType: "Interface",
      subnetIds: Token.asList(endpointSubnet.subnetIdsOutput),
      securityGroupIds: [endpointSG.id],
      tags: {
        Name: "vpc-endpoint-ec2messages",
      },
    });

    // s3用のゲートウェイを作成
    new VpcEndpoint(this, "vpc-endpoint-s3", {
      vpcId: vpc.vpcIdOutput,
      serviceName: "com.amazonaws.ap-northeast-1.s3",
      vpcEndpointType: "Gateway",
      routeTableIds: Token.asList(endpointSubnet.routeTableIdsOutput),
      tags: {
        Name: "vpc-endpoint-s3",
      },
    });
  }

  /*
  private extractSubnetId(subnets: string[], index: number): string[] {
    if (subnets === undefined) {
      throw new Error("subnet is not found");
    }
    console.log(subnets);
    console.log(subnets.slice(index - 1));
    return subnets.slice(index - 1);
  }
  */
}
