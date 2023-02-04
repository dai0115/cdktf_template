import { Construct } from "constructs";
import { TerraformStack, Token } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

import { Vpc } from "../.gen/modules/Vpc";
import { Subnets } from "../.gen/modules/Subnets";

import { VpcEndpoint } from "@cdktf/provider-aws/lib/vpc-endpoint";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";

import { ConfigType, TrafficType, endpointService } from "../config/types";

export class VpcStack extends TerraformStack {
  readonly albSG: SecurityGroup;
  readonly ecsSG: SecurityGroup;
  readonly bastionSG: SecurityGroup;
  readonly dbSG: SecurityGroup;
  readonly bastionSubnet: Subnets;
  readonly dbSubnetIds: string[];

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
    this.dbSubnetIds = Token.asList(vpc.databaseSubnetsOutput);

    // 踏み台サーバ用のサブネットの追加
    this.bastionSubnet = new Subnets(this, `${prefix}-bastion-Subnet`, {
      vpcId: vpc.vpcIdOutput,
      availabilityZones: ["ap-northeast-1a"],
      cidrBlock: "10.0.6.0/24",
      subnetCount: "1",
      tags: {
        Name: `${prefix}-BastionSubnet`,
      },
    });

    // VPCエンドポイント用のサブネットの追加
    const endpointSubnet = new Subnets(this, `${prefix}-endpoint-Subnet`, {
      vpcId: vpc.vpcIdOutput,
      availabilityZones: ["ap-northeast-1a"],
      cidrBlock: "10.0.7.0/24",
      subnetCount: "1",
      tags: {
        Name: `${prefix}-EndpointSubnet`,
      },
    });

    // セキュリティグループの作成
    this.albSG = this.createSecurityGroup("alb", vpc.vpcIdOutput);
    this.attachAllTrafficRules("alb", "egress", this.albSG.id); // TODO inboundルールはVPC linkからのみ

    this.ecsSG = this.createSecurityGroup("ecs", vpc.vpcIdOutput);
    new SecurityGroupRule(this, "ecsSG-ingress-rule", {
      sourceSecurityGroupId: this.albSG.id,
      type: "ingress",
      fromPort: 8080,
      toPort: 8080,
      protocol: "tcp",
      securityGroupId: this.ecsSG.id,
    });
    this.attachAllTrafficRules("ecs", "egress", this.ecsSG.id);

    this.bastionSG = this.createSecurityGroup("bastion", vpc.vpcIdOutput);
    this.attachAllTrafficRules("bastion", "egress", this.bastionSG.id);

    this.dbSG = this.createSecurityGroup("db", vpc.vpcIdOutput);
    new SecurityGroupRule(this, "dbSG-ingress-rule1", {
      sourceSecurityGroupId: this.bastionSG.id,
      type: "ingress",
      fromPort: 3306,
      toPort: 3306,
      protocol: "tcp",
      securityGroupId: this.dbSG.id,
    });
    new SecurityGroupRule(this, "dbSG-ingress-rule2", {
      sourceSecurityGroupId: this.ecsSG.id,
      type: "ingress",
      fromPort: 3306,
      toPort: 3306,
      protocol: "tcp",
      securityGroupId: this.dbSG.id,
    });
    this.attachAllTrafficRules("db", "egress", this.dbSG.id);

    const endpointSG = this.createSecurityGroup("endpoint", vpc.vpcIdOutput);
    new SecurityGroupRule(this, "endpointSG-ingress-rule", {
      cidrBlocks: ["10.0.0.0/16"],
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: endpointSG.id,
    });
    this.attachAllTrafficRules("endpoint", "egress", endpointSG.id);

    // VPCエンドポイントの作成
    this.createVpcEndpoint(
      Token.asString(vpc.vpcIdOutput),
      [endpointSG.id],
      Token.asList(endpointSubnet.subnetIdsOutput),
      Token.asList(this.bastionSubnet.routeTableIdsOutput)
    );
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
  /**
   * @param name - セキュリティグループルールの名前
   * @param trafficType - 通信のタイプ(inboudルール or outboundルール)
   * @param securityGroupId - ルールを紐付けるセキュリティグループのId
   *
   * 全ての通信を許可する場合のセキュリティグループルールを作成
   */
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
  /**
   * @param vpcId - Vpcエンドポイントを作成するVpcのId
   * @param securityGroupIds - Vpcエンドポイントに作成するセキュリティグループのId
   * @param subnetIds - Vpcエンドポイントを作成するサブネットのId
   * @param routeTableIds - VpcエンドポイントGatewayタイプに紐付けるルートテーブルのId
   *
   * 全ての通信を許可する場合のセキュリティグループルールを作成
   */
  private createVpcEndpoint(
    vpcId: string,
    securityGroupIds: string[],
    subnetIds: string[],
    routeTableIds: string[]
  ) {
    // 作成するVPCエンドポイントのサービス名とエンドポイントタイプを定義
    const serviceMap: endpointService = [
      {
        serviceName: "ssm",
        endpointType: "Interface",
      },
      {
        serviceName: "ssmmessages",
        endpointType: "Interface",
      },
      {
        serviceName: "ec2messages",
        endpointType: "Interface",
      },
      {
        serviceName: "s3",
        endpointType: "Gateway",
      },
    ];

    for (const service of serviceMap) {
      if (service.endpointType === "Interface") {
        new VpcEndpoint(this, `vpc-endpoint-${service.serviceName}`, {
          vpcId: vpcId,
          serviceName: `com.amazonaws.ap-northeast-1.${service.serviceName}`,
          vpcEndpointType: service.endpointType,
          subnetIds: subnetIds,
          securityGroupIds: securityGroupIds,
          privateDnsEnabled: true,
          tags: {
            Name: `vpc-endpoint-${service.serviceName}`,
          },
        });
      } else {
        new VpcEndpoint(this, `vpc-endpoint-${service.serviceName}`, {
          vpcId: vpcId,
          serviceName: `com.amazonaws.ap-northeast-1.${service.serviceName}`,
          vpcEndpointType: service.endpointType,
          routeTableIds: routeTableIds,
          tags: {
            Name: `vpc-endpoint-${service.serviceName}-Gateway`,
          },
        });
      }
    }
  }
}
