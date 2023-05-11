#! /bin/bash

# ENV
ENV=dev
CLUSTER=application-$ENV-BastionCluster
TASKID=$(aws ecs list-tasks --cluster $CLUSTER | jq -r '.taskArns[]' | awk -F/ '{print $NF}')

# ECS Exec
aws ecs execute-command --cluster $CLUSTER \
    --task $TASKID \
    --container bastion \
    --interactive \
    --command "/bin/sh"