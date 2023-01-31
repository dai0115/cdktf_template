import { Construct } from "constructs";
//import { TerraformStack, Token } from "cdktf";

import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";

import {
  IamPolicyConfig,
  IamRoleConfig,
  PolicyRoleAttachConfig,
} from "./types";

/**
 * IAMポリシーを生成するクラス。最低限のプロパティのみを公開
 * @params props - Statement内に設定する情報をもったオブジェクト
 */
export class Policy extends Construct {
  readonly name: string;
  readonly arn: string;

  constructor(scope: Construct, id: string, props: IamPolicyConfig) {
    super(scope, id);

    const { name, actions, resources, effect } = props;

    const policy = new IamPolicy(this, `${name}-Policy`, {
      name: `${name}-Policy`,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: actions,
            Resource: resources,
            Effect: effect,
          },
        ],
      }),
      tags: {
        Name: `${name}-Policy`,
      },
    });
    this.name = policy.name;
    this.arn = policy.arn;
  }
}

/**
 * IAMロールを生成するクラス。最低限のプロパティのみを公開
 * @params props - StatementおよびEffectに設定する情報をもったオブジェクト
 */
export class Role extends Construct {
  readonly name: string;
  readonly arn: string;

  constructor(scope: Construct, id: string, props: IamRoleConfig) {
    super(scope, id);

    const { name, service, effect } = props;

    const role = new IamRole(this, `${name}-Role`, {
      name: `${name}-Role`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Principal: {
              Service: service,
            },
            Effect: effect,
          },
        ],
      }),
    });
    this.name = role.name;
    this.arn = role.arn;
  }
}

/**
 * IAMポリシーとIAMロールを紐付けるアタッチメントを生成するクラス。
 * @params props.resourceName - idに設定するリソース名
 * @params props.roleName - 紐付けを行うロールの名前
 * @params props.policyArn - 紐付けを行うポリシーの名前
 */
export class PolicyRoleAttach extends Construct {
  constructor(scope: Construct, id: string, props: PolicyRoleAttachConfig) {
    super(scope, id);

    const { resourceName, roleName, policyArn } = props;

    new IamRolePolicyAttachment(this, resourceName, {
      role: roleName,
      policyArn: policyArn,
    });
  }
}
