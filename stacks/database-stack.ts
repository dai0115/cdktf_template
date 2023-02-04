import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { RandomProvider } from "@cdktf/provider-random/lib/provider";

import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { KmsKey } from "@cdktf/provider-aws/lib/kms-key";
import { KmsAlias } from "@cdktf/provider-aws/lib/kms-alias";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/secretsmanager-secret-version";
import {
  RdsClusterParameterGroup,
  RdsClusterParameterGroupParameter,
} from "@cdktf/provider-aws/lib/rds-cluster-parameter-group";
import { DbSubnetGroup } from "@cdktf/provider-aws/lib/db-subnet-group";
import { RdsCluster } from "@cdktf/provider-aws/lib/rds-cluster";
import { RdsClusterInstance } from "@cdktf/provider-aws/lib/rds-cluster-instance";

import { Subnets } from "../.gen/modules/Subnets";
import { Password } from "../.gen/providers/random/password";
import { Bastion } from "../constructors/bastion";

import { ConfigType } from "../config/types";

type DatabaseProps = {
  config: ConfigType;
  bastionSG: SecurityGroup;
  dbSG: SecurityGroup;
  bastionSubnet: Subnets;
  subnetIds: string[];
};

export class DatabaseStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { bastionSG, dbSG, bastionSubnet, subnetIds } = props;
    const { region, prefix } = props.config;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });
    new RandomProvider(this, "random", {});

    // Auroraログイン用の踏み台サーバ
    new Bastion(this, `${prefix}-Bastion`, {
      config: props.config,
      securityGroup: bastionSG,
      bastionSubnet: bastionSubnet,
    });

    // aurora用のsubnetgroupの作成
    const subnetGroup = new DbSubnetGroup(this, `${prefix}-subnetgroup`, {
      name: `${prefix}-subnetgroup`,
      subnetIds: subnetIds,
      tags: {
        Name: `${prefix}-subnetgroup`,
      },
    });

    // kms作成
    const kms = new KmsKey(this, `${prefix}-kmskey`, {
      enableKeyRotation: true,
      tags: {
        Name: `${prefix}-kmskey`,
      },
    });

    new KmsAlias(this, `${prefix}-kmsAlias`, {
      name: "alias/kmsalias",
      targetKeyId: kms.id,
    });

    // credential保存用のsecretsマネージャ
    const randomPass = new Password(this, "randomPass", {
      length: 16,
      special: true,
      overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
    });

    const secret = new SecretsmanagerSecret(this, "secret", {
      name: "taurusroot1", // こいつはシークレット自体の名前
    });

    new SecretsmanagerSecretVersion(this, "secret-version", {
      secretId: secret.id,
      secretString: JSON.stringify({
        password: randomPass.result,
      }),
    });

    // パラメータグループ
    const parameterSettings: RdsClusterParameterGroupParameter[] = [
      {
        name: "character_set_server",
        value: "utf8mb4",
      },
      {
        name: "character_set_database",
        value: "utf8mb4",
      },
      {
        name: "character_set_client",
        value: "utf8mb4",
      },
      {
        name: "character_set_connection",
        value: "utf8mb4",
      },
      {
        name: "character_set_results",
        value: "utf8mb4",
      },
      {
        name: "time_zone",
        value: "UTC",
      },
      {
        name: "general_log",
        value: "1",
      },
      {
        name: "slow_query_log",
        value: "1",
      },
      {
        name: "long_query_time",
        value: "1",
      },
      {
        name: "server_audit_events",
        value: "CONNECT,QUERY,TABLE",
      },
      {
        name: "server_audit_logging",
        value: "1",
      },
    ];
    const parameter = new RdsClusterParameterGroup(this, "parameterGroup", {
      name: "rds-cluster-for-parameter-group",
      family: "aurora-mysql8.0",
      parameter: parameterSettings,
    });

    // rdsクラスター
    const cluster = new RdsCluster(this, "rds-cluster", {
      clusterIdentifier: "aurora-cluster",
      engine: "aurora-mysql",
      engineVersion: "8.0.mysql_aurora.3.02.2",
      availabilityZones: ["ap-northeast-1a"],
      masterUsername: "taurusroot2", // configで定義したものを受け取る
      masterPassword: randomPass.result,
      dbClusterParameterGroupName: parameter.name,
      kmsKeyId: kms.arn,
      vpcSecurityGroupIds: [dbSG.id],
      //deletionProtection: true TODO:ある程度まとまったらコメントアウトを解除
      skipFinalSnapshot: true,
      storageEncrypted: true,
      dbSubnetGroupName: subnetGroup.name,
      enabledCloudwatchLogsExports: ["audit", "error", "general", "slowquery"],
      preferredBackupWindow: "16:00-16:30",
    });

    // rdsクラスターインスタンス
    new RdsClusterInstance(this, "rds-cluster-instance", {
      count: 1,
      identifier: "rds-cluster-instance",
      clusterIdentifier: cluster.id,
      instanceClass: "db.t4g.large",
      engine: cluster.engine,
      engineVersion: cluster.engineVersion,
    });
  }
}
