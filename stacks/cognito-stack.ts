import { CognitoUserPool } from "@cdktf/provider-aws/lib/cognito-user-pool";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { ConfigType } from "../config/types";

type CognitoProps = {
  config: ConfigType;
};

export class CognitoStack extends TerraformStack {
  readonly cognitoId: String;

  constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id);
    const { region, prefix } = props.config;
    const { cognito } = props.config;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    const cog = new CognitoUserPool(this, `${prefix}-Cognito`, {
      ...cognito,
    });
    this.cognitoId = cog.id;
  }
}
