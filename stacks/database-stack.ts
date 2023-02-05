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
    const {
      dbMasterUsername,
      dbFamily,
      clusterEngine,
      clusterEngineVersion,
      availabilityZones,
      instanceCount,
      instanceClass,
    } = props.config.db;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });
    new RandomProvider(this, "random", {});

    // Auroraログイン用の踏み台サーバ作成
    new Bastion(this, `${prefix}-Bastion`, {
      config: props.config,
      securityGroup: bastionSG,
      bastionSubnet: bastionSubnet,
    });

    const kms = this.createKms(prefix);

    // SecretsManager作成
    const randomPass = new Password(this, `${prefix}-randomPass`, {
      length: 16,
      special: true,
      overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
    });
    this.createSecret(prefix, dbMasterUsername, randomPass.result);

    const subnetGroup = this.createSubnetGroup(prefix, subnetIds);

    const parameter = this.createParameterGroup(prefix, dbFamily);

    // rdsクラスターの作成
    const cluster = new RdsCluster(this, "rds-cluster", {
      clusterIdentifier: "bigbangauroracluster",
      engine: clusterEngine,
      engineVersion: clusterEngineVersion,
      availabilityZones: availabilityZones,
      masterUsername: dbMasterUsername,
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

    // rdsクラスターインスタンスの作成
    new RdsClusterInstance(this, `${prefix}-auroraClusterInstance`, {
      count: instanceCount,
      identifier: "bigbangauroraclusterinstance",
      clusterIdentifier: cluster.id,
      instanceClass: instanceClass,
      engine: cluster.engine,
      engineVersion: cluster.engineVersion,
    });
  }

  /**
   * @param name - kmsの名前
   * auroraの暗号化に利用するkmsを作成する
   */
  private createKms(name: string): KmsKey {
    const kms = new KmsKey(this, `${name}-kmskey`, {
      enableKeyRotation: true,
      tags: {
        Name: `${name}-kmskey`,
      },
    });
    new KmsAlias(this, `${name}-kmsAlias`, {
      name: `alias/${name}`,
      targetKeyId: kms.id,
    });
    return kms;
  }
  /**
   * @param name - Secretsの名前
   * @param username - SecretsManagerに保存するdbのユーザ名
   * @param pass - SecretsManagerに保存するdbのパスワード
   * SecretsManagerに格納するシークレットを作成
   */
  private createSecret(name: string, username: string, pass: string) {
    const secret = new SecretsmanagerSecret(this, `${name}-secret`, {
      name: `${name}-secret`,
    });
    new SecretsmanagerSecretVersion(this, `${name}-secretVersion`, {
      secretId: secret.id,
      secretString: JSON.stringify({
        username: username,
        password: pass,
      }),
    });
  }
  /**
   * @param name - Secretsの名前
   * @param subnetIds - auroraを配置するサブネットのidsを受け取る
   * auroraを配置するサブネットグループを作成
   */
  private createSubnetGroup(name: string, subnetIds: string[]): DbSubnetGroup {
    return new DbSubnetGroup(this, `${name}-subnetGroup`, {
      name: "bigbangsubnetgroup",
      subnetIds: subnetIds,
      tags: {
        Name: `${name}-subnetGroup`,
      },
    });
  }
  /**
   * @param name - Secretsの名前
   * SecretsManagerに格納するシークレットを作成
   */
  private createParameterGroup(
    name: string,
    dbFamily: string
  ): RdsClusterParameterGroup {
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
    return new RdsClusterParameterGroup(this, `${name}-parameterGroup`, {
      name: "bigbangparametergroup",
      family: dbFamily,
      parameter: parameterSettings,
    });
  }
}
