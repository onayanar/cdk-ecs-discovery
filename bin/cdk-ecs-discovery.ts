#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkEcsDiscoveryStack } from '../lib/cdk-ecs-discovery-stack';

const app = new cdk.App();
new CdkEcsDiscoveryStack(app, 'CdkEcsDiscoveryStack');
