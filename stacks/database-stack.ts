import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Subnets } from "../.gen/modules/Subnets";
import { Bastion } from "../constructors/bastion";

import { ConfigType } from "../config/types";

type DatabaseProps = {
  config: ConfigType;
  securityGroup: SecurityGroup;
  bastionSubnet: Subnets;
};

export class DatabaseStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { securityGroup, bastionSubnet } = props;
    const { region, prefix } = props.config;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    new Bastion(this, `${prefix}-Bastion`, {
      config: props.config,
      securityGroup: securityGroup,
      bastionSubnet: bastionSubnet,
    });
  }
}
