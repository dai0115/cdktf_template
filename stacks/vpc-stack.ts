import { Construct } from "constructs";
import { TerraformStack, Token } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

import { Vpc } from "../.gen/modules/Vpc";
import { Subnets } from "../.gen/modules/Subnets";

import { VpcEndpoint } from "@cdktf/provider-aws/lib/vpc-endpoint";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";

import { ConfigType, TrafficType } from "../config/types";

export class VpcStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: ConfigType) {
    super(scope, id);

    const { region, prefix } = props;
    const {
      vpcCidr,
      availabilityZones,
      privateSubnets,
      privateSubnetNames,
      intraSubnets,
      intraSubnetNames,
      databaseSubnets,
      databaseSubnetNames,
    } = props.vpcConfig;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    // VPCの作成
    const vpc = new Vpc(this, `${prefix}-Vpc`, {
      name: `${prefix}-Vpc`,
      cidr: vpcCidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      azs: availabilityZones,
      privateSubnets: privateSubnets,
      privateSubnetNames: privateSubnetNames,
      intraSubnets: intraSubnets,
      intraSubnetNames: intraSubnetNames,
      databaseSubnets: databaseSubnets,
      databaseSubnetNames: databaseSubnetNames,
    });

    // VPCendpoint用のサブネットの追加
    const endpointSubnet = new Subnets(this, `${prefix}-Subnet`, {
      vpcId: vpc.vpcIdOutput,
      availabilityZones: ["ap-northeast-1a"],
      cidrBlock: "10.0.6.0/24",
      subnetCount: "1",
      tags: {
        Name: `${prefix}-EndpointSubnet`,
      },
    });

    // セキュリティグループの作成
    const albSG = this.createSecurityGroup("alb", vpc.vpcIdOutput);
    this.attachAllTrafficRules("alb", "egress", albSG.id); // TODO inboundルールはVPC linkからのみ

    const ecsSG = this.createSecurityGroup("ecs", vpc.vpcIdOutput);
    new SecurityGroupRule(this, "ecsSG-ingress-rule", {
      sourceSecurityGroupId: albSG.id,
      type: "ingress",
      fromPort: 8080,
      toPort: 8080,
      protocol: "tcp",
      securityGroupId: ecsSG.id,
    });
    this.attachAllTrafficRules("ecs", "egress", ecsSG.id);

    const bastionSG = this.createSecurityGroup("bastion", vpc.vpcIdOutput);
    new SecurityGroupRule(this, "bastionSG-egress-rule", {
      cidrBlocks: ["0.0.0.0/0"],
      type: "egress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: bastionSG.id,
    });

    const endpointSG = this.createSecurityGroup("endpoint", vpc.vpcIdOutput);
    new SecurityGroupRule(this, "endpointSG-ingress-rule", {
      sourceSecurityGroupId: bastionSG.id,
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: endpointSG.id,
    });
    new SecurityGroupRule(this, "endpointSG-egress-rule", {
      cidrBlocks: ["0.0.0.0/0"],
      type: "egress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
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
  /**
   * @param name - セキュリティグループの名前
   * @param vpcId - セキュリティグループを作成するvpcのId
   */
  private createSecurityGroup(name: string, vpcId: string): SecurityGroup {
    return new SecurityGroup(this, `${name}SG`, {
      name: `${name}SG`,
      vpcId: vpcId,
      tags: {
        Name: `${name}SG`,
      },
    });
  }

  private attachAllTrafficRules(
    name: string,
    trafficType: TrafficType,
    securityGroupId: string
  ) {
    new SecurityGroupRule(this, `${name}SG-${trafficType}-rule`, {
      cidrBlocks: ["0.0.0.0/0"],
      type: trafficType,
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: securityGroupId,
    });
  }
}
