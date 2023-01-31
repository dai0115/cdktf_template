import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";

import { ConfigType } from "../config/types";

export class IamStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: ConfigType) {
    super(scope, id);

    const { region, prefix } = props;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    const bastionPolicy = new IamPolicy(this, `${prefix}-bastionPolicy`, {
      name: `${prefix}-bastionPolicy`,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "ec2messages:*",
              "ssm:UpdateInstanceInformation",
              "ssmmessages:*",
            ],
            Resource: ["*"],
            Effect: "Allow",
          },
        ],
      }),
      tags: {
        Name: `${prefix}-bastionPolicy`,
      },
    });

    const bastionRole = new IamRole(this, `${prefix}-bastionRole`, {
      name: `${prefix}-bastionRole`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Principal: {
              Service: "ec2.amazonaws.com",
            },
            Effect: "Allow",
          },
        ],
      }),
    });

    new IamRolePolicyAttachment(this, `${prefix}-attach-policy-role`, {
      role: bastionRole.name,
      policyArn: bastionPolicy.arn,
    });
  }
}
