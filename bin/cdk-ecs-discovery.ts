#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
//import { CdkEcsDiscoveryStack } from '../lib/cdk-ecs-discovery-stack';
import { CdkEcsDiscoveryStack } from '../lib/cdk-ecs-discovery-multi-app-stack';

const app = new cdk.App();
new CdkEcsDiscoveryStack(app, 'CdkEcsDiscoveryStack',{
    env: {
        region: "us-east-2"
    }
});
