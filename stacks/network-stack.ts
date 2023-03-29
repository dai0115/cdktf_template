import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";

import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";
import { VpcEndpoint } from "@cdktf/provider-aws/lib/vpc-endpoint";

import { ConfigType } from "../config/types";

export class NetworkStack extends TerraformStack {
  readonly ecsSubnetIds: Array<string>;
  readonly dbSubnetIds: Array<string>;
  readonly albSubnetIds: Array<string>;
  readonly endpointSubnetId: string;
  readonly albSG: SecurityGroup;
  readonly ecsSG: SecurityGroup;
  readonly dbSG: SecurityGroup;

  constructor(scope: Construct, id: string, props: ConfigType) {
    super(scope, id);

    const { region, prefix } = props;
    const { vpcConfig } = props.network;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    // VPCリソースの作成
    const vpc = new Vpc(this, `${prefix}-Vpc`, {
      ...vpcConfig,
      tags: {
        Name: `${prefix}-Vpc`,
      },
    });

    // サブネットの作成
    const ecsSubnet1 = this.createSubnet(
      `${prefix}-Ecs1`,
      vpc.id,
      "10.0.0.0/24",
      "ap-northeast-1a"
    );
    const ecsSubnet2 = this.createSubnet(
      `${prefix}-Ecs2`,
      vpc.id,
      "10.0.1.0/24",
      "ap-northeast-1c"
    );
    this.ecsSubnetIds = [ecsSubnet1, ecsSubnet2];
    const dbSubnet1 = this.createSubnet(
      `${prefix}-Db1`,
      vpc.id,
      "10.0.2.0/24",
      "ap-northeast-1a"
    );
    const dbSubnet2 = this.createSubnet(
      `${prefix}-Db2`,
      vpc.id,
      "10.0.3.0/24",
      "ap-northeast-1c"
    );
    this.dbSubnetIds = [dbSubnet1, dbSubnet2];
    const albSubnet1 = this.createSubnet(
      `${prefix}-Alb1`,
      vpc.id,
      "10.0.4.0/24",
      "ap-northeast-1a"
    );
    const albSubnet2 = this.createSubnet(
      `${prefix}-Alb2`,
      vpc.id,
      "10.0.5.0/24",
      "ap-northeast-1c"
    );
    this.albSubnetIds = [albSubnet1, albSubnet2];
    this.endpointSubnetId = this.createSubnet(
      `${prefix}-Endpoint`,
      vpc.id,
      "10.0.6.0/24",
      "ap-northeast-1a"
    );
    const bastionSubnetId = this.createSubnet(
      `${prefix}-Bastion`,
      vpc.id,
      "10.0.7.0/24",
      "ap-northeast-1a"
    );

    // ルートテーブルの作成
    const ecsRouteTable = this.createRouteTable(`${prefix}-EcsRoute`, vpc);
    const dbRouteTable = this.createRouteTable(`${prefix}-DbRoute`, vpc);
    const albRouteTable = this.createRouteTable(`${prefix}-AlbRoute`, vpc);
    const bastionRouteTable = this.createRouteTable(
      `${prefix}-BastionRoute`,
      vpc
    );
    const endpointRouteTable = this.createRouteTable(
      `${prefix}-EndpointRoute`,
      vpc
    );

    // サブネットとルートテーブルの関連付け
    this.attachRouteTabletoSubnet("ecs1", ecsSubnet1, ecsRouteTable.id);
    this.attachRouteTabletoSubnet("ecs2", ecsSubnet2, ecsRouteTable.id);
    this.attachRouteTabletoSubnet("db1", dbSubnet1, dbRouteTable.id);
    this.attachRouteTabletoSubnet("db2", dbSubnet2, dbRouteTable.id);
    this.attachRouteTabletoSubnet("alb1", albSubnet1, albRouteTable.id);
    this.attachRouteTabletoSubnet("alb2", albSubnet2, albRouteTable.id);
    this.attachRouteTabletoSubnet(
      "bastion",
      bastionSubnetId,
      bastionRouteTable.id
    );
    this.attachRouteTabletoSubnet(
      "endpoint",
      this.endpointSubnetId,
      endpointRouteTable.id
    );

    // パブリックサブネットへのリソースの関連付け
    const iGW = this.createIGW(prefix, vpc.id);
    new RouteTableAssociation(this, "ecs-IGW", {
      gatewayId: iGW.id,
      routeTableId: albRouteTable.id,
    });

    // セキュリティグループの作成
    this.albSG = this.createSecurityGroup("alb", vpc.id);
    new SecurityGroupRule(this, "albSG-ingress-rule", {
      cidrBlocks: ["0.0.0.0/0"],
      type: "ingress",
      fromPort: 80, //TODO replace here to 443
      toPort: 80, //TODO replace here to 443
      protocol: "tcp",
      securityGroupId: this.albSG.id,
      description: "IGW to Load balancer",
    });
    this.attachAllTrafficRules("alb", this.albSG.id);

    this.ecsSG = this.createSecurityGroup("ecs", vpc.id);
    new SecurityGroupRule(this, "ecsSG-ingress-rule", {
      sourceSecurityGroupId: this.albSG.id,
      type: "ingress",
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      securityGroupId: this.ecsSG.id,
      description: "Load balancer to target",
    });
    this.attachAllTrafficRules("ecs", this.ecsSG.id);

    this.dbSG = this.createSecurityGroup("db", vpc.id);
    new SecurityGroupRule(this, "dbSG-ingress-rule2", {
      sourceSecurityGroupId: this.ecsSG.id,
      type: "ingress",
      fromPort: 3306,
      toPort: 3306,
      protocol: "tcp",
      securityGroupId: this.dbSG.id,
    });
    this.attachAllTrafficRules("db", this.dbSG.id);

    const endpointSG = this.createSecurityGroup("endpoint", vpc.id);
    new SecurityGroupRule(this, "endpointSG-ingress-rule", {
      cidrBlocks: ["10.0.0.0/16"],
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: endpointSG.id,
    });
    this.attachAllTrafficRules("endpoint", endpointSG.id);

    const bastionSG = this.createSecurityGroup("bastion", vpc.id);
    this.attachAllTrafficRules("bastion", bastionSG.id);

    // VPCエンドポイントの作成
    this.createGatewayEndpoint("ecs", vpc.id, ecsRouteTable.id, "s3");
    this.createGatewayEndpoint("bastion", vpc.id, bastionRouteTable.id, "s3");

    const serviceNames: string[] = [
      "ssm",
      "ssmmessages",
      "ec2messages",
      "ecr.api",
      "ecr.dkr",
      "logs",
      "secretsmanager",
      "ecs-agent",
      "ecs-telemetry",
      "ecs",
    ];
    for (const service of serviceNames) {
      this.createInterfaceEndpoint(
        vpc.id,
        endpointSG.id,
        this.endpointSubnetId,
        service
      );
    }
  }

  /**
   * @param name - 作成するサブネットの名前
   * @param vpcId - サブネットを作成するvpcのId
   * @param cideBlock - 作成するサブネットのcideBlock
   * @param availabilityZone - サブネットを作成するavailabilityZone
   * @returns 作成されたSubnetを返却
   */
  private createSubnet(
    name: string,
    vpcId: string,
    cideBlock: string,
    availabilityZone: string
  ): string {
    const subnet = new Subnet(this, name, {
      vpcId: vpcId,
      cidrBlock: cideBlock,
      availabilityZone: availabilityZone,
      tags: {
        Name: name,
      },
    });
    return subnet.id;
  }

  /**
   * @param name - 作成するルートテーブルの名前
   * @param vpcId - ルートテーブルを作成するvpcのId
   * @returns 作成されたRouteTableを返却
   */
  private createRouteTable(name: string, vpc: Vpc): RouteTable {
    return new RouteTable(this, name, {
      vpcId: vpc.id,
      route: [],
      tags: {
        Name: name,
      },
    });
  }

  /**
   * @param name - 命名時に利用するprefix
   * @param subnetId - ルートテーブルと関連付けを行うサブネットのId
   * @param subnetId - サブネットと関連付けを行うルートテーブルのId
   * 受け取ったサブネットとルートテーブルを紐付ける
   */
  private attachRouteTabletoSubnet(
    name: string,
    subnetId: string,
    routeTableId: string
  ) {
    new RouteTableAssociation(this, `${name}-Association`, {
      subnetId: subnetId,
      routeTableId: routeTableId,
    });
  }

  /**
   * @param name - リソースの命名に利用するprefix
   * @param vpcId - IGWを作成するvpcのId
   * @returns 作成されたInternet Gatewayを返却
   */
  private createIGW(name: string, vpcId: string): InternetGateway {
    return new InternetGateway(this, `${name}-IGW`, {
      vpcId: vpcId,
      tags: {
        Name: `${name}-IGW`,
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
  /**
   * @param name - セキュリティグループルールの名前
   * @param securityGroupId - ルールを紐付けるセキュリティグループのId
   *
   * 全ての通信を許可する場合のセキュリティグループルールを作成
   */
  private attachAllTrafficRules(name: string, securityGroupId: string) {
    new SecurityGroupRule(this, `${name}SG-egress-rule`, {
      cidrBlocks: ["0.0.0.0/0"],
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: securityGroupId,
    });
  }
  /**
   * @param vpcId - Vpcエンドポイントを作成するVpcのId
   * @param routeTableIds - VpcエンドポイントGatewayタイプに紐付けるルートテーブルのId
   * @param serviceName - 作成するサービスの名前を指定。"s3"や"ssm"などの形式で"com.amazon〜"は不要
   * @returns 作成したVPCエンドポイントを返却
   *
   * ゲートウェイ型のエンドポイントを作成
   */
  private createGatewayEndpoint(
    name: string,
    vpcId: string,
    routeTableId: string,
    serviceName: string
  ): VpcEndpoint {
    return new VpcEndpoint(this, `${name}-vpc-endpoint-${serviceName}`, {
      vpcId: vpcId,
      serviceName: `com.amazonaws.ap-northeast-1.${serviceName}`,
      vpcEndpointType: "Gateway",
      routeTableIds: [routeTableId],
      tags: {
        Name: `vpc-endpoint-${serviceName}-Gateway`,
      },
    });
  }
  /**
   * @param vpcId - vpcエンドポイントを作成するVpcのId
   * @param securityGroupIds - Vpcエンドポイントに作成するセキュリティグループのId
   * @param subnetIds - Vpcエンドポイントを作成するサブネットのId
   * @param serviceName - 作成するサービスの名前を指定。"s3"や"ssm"などの形式で"com.amazon〜"は不要
   * @returns 作成したVPCエンドポイントを返却
   *
   * インターフェース型のエンドポイントを作成
   */
  private createInterfaceEndpoint(
    vpcId: string,
    securityGroupId: string,
    subnetId: string,
    serviceName: string
  ): VpcEndpoint {
    return new VpcEndpoint(this, `vpc-endpoint-${serviceName}`, {
      vpcId: vpcId,
      serviceName: `com.amazonaws.ap-northeast-1.${serviceName}`,
      vpcEndpointType: "Interface",
      subnetIds: [subnetId],
      securityGroupIds: [securityGroupId],
      privateDnsEnabled: true,
      tags: {
        Name: `vpc-endpoint-${serviceName}`,
      },
    });
  }
}
