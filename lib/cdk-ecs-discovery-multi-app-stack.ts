import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import {aws_servicediscovery as servicediscovery} from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontorigin from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class CdkEcsDiscoveryStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const vpc = ec2.Vpc.fromVpcAttributes(this, "default", {
      vpcId: "vpc-7815df11",
      privateSubnetIds: ["subnet-0915a20e1d5757b1c", "subnet-083641294afe301d4"],
      publicSubnetIds: ["subnet-54fd5a3d", "subnet-0752b87c"],
      availabilityZones: ["us-east-2a", "us-east-2b"]
    })

    const privatenamespace = new servicediscovery.PrivateDnsNamespace(this, 'privatedns', {
      name: 'foo.internal',
      vpc,
    });

    const bookcmservice = privatenamespace.createService("booksdb", {
      name: "booksdb",
      dnsRecordType: servicediscovery.DnsRecordType.A,
      discoveryType: servicediscovery.DiscoveryType.DNS_AND_API,
      dnsTtl: Duration.seconds(300),
      customHealthCheck: {
        failureThreshold: 1
      }
    })

    const usercmservice = privatenamespace.createService("usersdb", {
      name: "usersdb",
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

    // ------------------Book Service ---------------------------------------

    const bookTaskdefintion = new ecs.FargateTaskDefinition(this, "taskdef", {
      family: "books",
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
      },
      volumes: [
        {
          name: "db-data"
        }
      ],
      ephemeralStorageGiB: 25

    })

    const booksdb = bookTaskdefintion.addContainer("booksDbContainerDef", {
      containerName: "booksdb",
      image: ecs.ContainerImage.fromRegistry("pramath505/booksdb:1.0"),
      portMappings: [
        {
        containerPort: 3306,
        protocol: ecs.Protocol.TCP,
        }
      ],
      essential: true,
      environment: {
        MYSQL_ROOT_PASSWORD: "admin01",
        MYSQL_DATABASE: "appdb"
      }
    })

    booksdb.addMountPoints(
      {
        containerPath: "/var/lib/mysql",
        sourceVolume: "db-data",
        readOnly: false
      }
    )

    const bookservice = bookTaskdefintion.addContainer("bookServiceContainerDef", {
      containerName: "bookservice",
      image: ecs.ContainerImage.fromRegistry("pramath505/bookservice:1.1"),
      portMappings: [
        {
        containerPort: 5001,
        protocol: ecs.Protocol.TCP,
        }
      ],
      essential: true,
      environment: {
        DBHOST: "booksdb.foo.internal",
        DBPASSWORD: "admin01",
        DBUSER: "root",
        DBNAME: "appdb"
      }
    })
    
    const ecsSG = new ec2.SecurityGroup(this, "ecs-sg", {
      vpc: vpc,
      allowAllOutbound: true
    })

    ecsSG.addIngressRule(ec2.Peer.ipv4("172.31.0.0/16"), ec2.Port.allTcp(), "allow all tcp traffic");

    const booksEcsService = new ecs.FargateService(this, 'BookService', {
      cluster: ecscluster,
      taskDefinition: bookTaskdefintion,
      desiredCount: 2,
      securityGroups: [ecsSG],
      serviceName: "bookservice",
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      })
    });

    booksEcsService.associateCloudMapService({
      service: bookcmservice,
      container: booksdb,
      containerPort: 3306
    })

    const booksalb = new elbv2.ApplicationLoadBalancer(this, 'booksalb', { vpc, internetFacing: true });
    const bookservicelistener = booksalb.addListener('httplistener', { port: 80 });

    const booksTargetGroup = bookservicelistener.addTargets('bookservicetg', {
      port: 80,
      targets: [booksEcsService.loadBalancerTarget({
        containerName: bookservice.containerName,
        containerPort: 5001
      })],
    });

    

    //------------ User Service ----------------------------

    const userTaskdefintion = new ecs.FargateTaskDefinition(this, "userTaskdef", {
      family: "users",
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
      },
      volumes: [
        {
          name: "db-data"
        }
      ],
      ephemeralStorageGiB: 25
    })

    const usersdb = userTaskdefintion.addContainer("usersDbContainerDef", {
      containerName: "usersdb",
      image: ecs.ContainerImage.fromRegistry("pramath505/usersdb:1.0"),
      portMappings: [
        {
        containerPort: 3306,
        protocol: ecs.Protocol.TCP,
        }
      ],
      essential: true,
      environment: {
        MYSQL_ROOT_PASSWORD: "admin01",
        MYSQL_DATABASE: "appdb"
      }
    })

    usersdb.addMountPoints(
      {
        containerPath: "/var/lib/mysql",
        sourceVolume: "db-data",
        readOnly: false
      }
    )

    const userservice = userTaskdefintion.addContainer("userServiceContainerDef", {
      containerName: "userservice",
      image: ecs.ContainerImage.fromRegistry("pramath505/userservice:1.1"),
      portMappings: [
        {
        containerPort: 5000,
        protocol: ecs.Protocol.TCP,
        }
      ],
      essential: true,
      environment: {
        DBHOST: "usersdb.foo.internal",
        DBPASSWORD: "admin01",
        DBUSER: "root",
        DBNAME: "appdb"
      }
    })
    

  /*  const ecsSG = new ec2.SecurityGroup(this, "ecs-sg", {
      vpc: vpc,
      allowAllOutbound: true
    })

    ecsSG.addIngressRule(ec2.Peer.ipv4("172.31.0.0/16"), ec2.Port.allTcp(), "allow all tcp traffic");
  */

    const usersEcsService = new ecs.FargateService(this, 'UserService', {
      cluster: ecscluster,
      taskDefinition: userTaskdefintion,
      desiredCount: 2,
      securityGroups: [ecsSG],
      serviceName: "userservice",
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      })
    });

    usersEcsService.associateCloudMapService({
      service: usercmservice,
      container: usersdb,
      containerPort: 3306
    })

    const usersalb = new elbv2.ApplicationLoadBalancer(this, 'usersalb', { vpc, internetFacing: true });
    const userservicelistener = usersalb.addListener('httplistener', { port: 80 });

    const usersTargetGroup = userservicelistener.addTargets('userservicetg', {
      port: 80,
      targets: [usersEcsService.loadBalancerTarget({
        containerName: userservice.containerName,
        containerPort: 5000
      })],
    });

    const booksOrigin = new cloudfrontorigin.LoadBalancerV2Origin(booksalb, {
      httpPort: 80,
      originId: "books",
      originPath: "/books",
      protocolPolicy: cloudfront.OriginProtocolPolicy.MATCH_VIEWER
    })

    const usersOrigin = new cloudfrontorigin.LoadBalancerV2Origin(usersalb, {
      httpPort: 80,
      originId: "users",
      originPath: "/users",
      protocolPolicy: cloudfront.OriginProtocolPolicy.MATCH_VIEWER
    })

    const demodistribution = new cloudfront.Distribution(this, 'webdistribution', {
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: booksOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL
      },
      additionalBehaviors: {
        '/books': {
          origin: booksOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL
        },
        '/users': {
          origin: usersOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL
        }
      },
    });
  }
}
