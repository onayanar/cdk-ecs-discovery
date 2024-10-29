import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import {aws_servicediscovery as servicediscovery} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkEcsDiscoveryStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const vpc = ec2.Vpc.fromVpcAttributes(this, "default", {
      vpcId: "vpc-7815df11",
      privateSubnetIds: ["subnet-0915a20e1d5757b1c", "subnet-083641294afe301d4"],
      availabilityZones: ["us-east-2a", "us-east-2b"]
    })

    const privatenamespace = new servicediscovery.PrivateDnsNamespace(this, 'privatedns', {
      name: 'foo.internal',
      vpc,
    });

    const cmservice = privatenamespace.createService("httpservice", {
      name: "httpserver",
      dnsRecordType: servicediscovery.DnsRecordType.A,
      discoveryType: servicediscovery.DiscoveryType.DNS_AND_API,
      dnsTtl: Duration.seconds(300),
      customHealthCheck: {
        failureThreshold: 1
      }
    })

    const ecscluster = new ecs.Cluster(this, "democluster", {
      clusterName: "demo-cluster",
      enableFargateCapacityProviders: true,
      vpc: vpc
    })

    const taskdefintion = new ecs.FargateTaskDefinition(this, "taskdef", {
      family: "webapp",
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
      }
    })

    const httpcontainer = taskdefintion.addContainer("containerDef", {
      containerName: "http-server",
      image: ecs.ContainerImage.fromRegistry("httpd:2.4"),
      portMappings: [
        {
        containerPort: 80,
        hostPort: 80,
        protocol: ecs.Protocol.TCP,
        }
      ],
      essential: true,
      entryPoint: [
        "sh",
        "-c"
      ],
      command: [
         "/bin/sh -c \"echo '<html> <head> <title>Amazon ECS Sample App</title><body> <h1>Amazon ECS Sample App</h1> <h2>Congratulations!</h2> <p>Your application is now running on a container in Amazon ECS.</p></body></html>' >  /usr/local/apache2/htdocs/index.html && httpd-foreground\""
      ]
    })

    const ecsSG = new ec2.SecurityGroup(this, "ecs-sg", {
      vpc: vpc,
      allowAllOutbound: true
    })

    ecsSG.addIngressRule(ec2.Peer.ipv4("172.31.0.0/16"), ec2.Port.allTcp(), "allow all tcp traffic");

    const ecsService = new ecs.FargateService(this, 'Service', {
      cluster: ecscluster,
      taskDefinition: taskdefintion,
      desiredCount: 2,
      securityGroups: [ecsSG],
      serviceName: "httpservice",
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      })
    });

    ecsService.associateCloudMapService({
      service: cmservice,
      container: httpcontainer,
      containerPort: 80
    })


  }
}
