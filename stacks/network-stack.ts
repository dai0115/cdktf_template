import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";

import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";

import { ConfigType } from "../config/types";

export class VpcStack extends TerraformStack {
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
    this.createSubnet(
      `${prefix}-Ecs1`,
      vpc.id,
      "10.0.0.0/24",
      "ap-northeast-1a"
    );
    this.createSubnet(
      `${prefix}-Ecs2`,
      vpc.id,
      "10.0.1.0/24",
      "ap-northeast-1c"
    );
    this.createSubnet(
      `${prefix}-Db1`,
      vpc.id,
      "10.0.2.0/24",
      "ap-northeast-1a"
    );
    this.createSubnet(
      `${prefix}-Db2`,
      vpc.id,
      "10.0.3.0/24",
      "ap-northeast-1c"
    );
    this.createSubnet(
      `${prefix}-Alb1`,
      vpc.id,
      "10.0.4.0/24",
      "ap-northeast-1a"
    );
    this.createSubnet(
      `${prefix}-Alb2`,
      vpc.id,
      "10.0.5.0/24",
      "ap-northeast-1c"
    );
    this.createSubnet(
      `${prefix}-Endpoint1`,
      vpc.id,
      "10.0.6.0/24",
      "ap-northeast-1a"
    );
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
  ): Subnet {
    return new Subnet(this, name, {
      vpcId: vpcId,
      cidrBlock: cideBlock,
      availabilityZone: availabilityZone,
      tags: {
        Name: name,
      },
    });
  }
}
