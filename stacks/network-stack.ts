import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";

import { Vpc } from "@cdktf/provider-aws/lib/vpc";

import { ConfigType } from "../config/types";

export class VpcStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: ConfigType) {
    super(scope, id);

    const { region, prefix } = props;
    const { vpc } = props.network;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    new Vpc(this, `${prefix}-Vpc`, {
      ...vpc,
      tags: {
        Name: `${prefix}-Vpc`,
      },
    });
  }
}
