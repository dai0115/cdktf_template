import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { DbSubnetGroup } from "@cdktf/provider-aws/lib/db-subnet-group";

import { Subnets } from "../.gen/modules/Subnets";
import { Bastion } from "../constructors/bastion";

import { ConfigType } from "../config/types";

type DatabaseProps = {
  config: ConfigType;
  securityGroup: SecurityGroup;
  bastionSubnet: Subnets;
  DBSubnetIds: string[];
};

export class DatabaseStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { securityGroup, bastionSubnet, DBSubnetIds } = props;
    const { region, prefix } = props.config;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    // Auroraログイン用の踏み台サーバ
    new Bastion(this, `${prefix}-Bastion`, {
      config: props.config,
      securityGroup: securityGroup,
      bastionSubnet: bastionSubnet,
    });

    // aurora用のsubnetgroupの作成
    new DbSubnetGroup(this, `${prefix}-subnetgroup`, {
      name: `${prefix}-subnetgroup`,
      subnetIds: DBSubnetIds,
      tags: {
        Name: `${prefix}-subnetgroup`,
      },
    });

    // kms作成

    // credential保存用のsecretsマネージャ

    // パラメータグループ

    // aurora作成
  }
}
