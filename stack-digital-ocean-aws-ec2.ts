import { AwsProvider, DataAwsAmi, Instance, KeyPair, SecurityGroup } from "@cdktf/provider-aws";
import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { DatabaseCluster as BaseDatabaseCluster, DatabaseFirewall, DigitaloceanProvider } from "./.gen/providers/digitalocean";
import { Grantor, GrantStrategy } from "./lib/grants";

const DatabaseCluster = Grantor(BaseDatabaseCluster);

export class DigitalOceanAwsEc2Stack extends TerraformStack {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        new DigitaloceanProvider(this, 'do-provider');
        new AwsProvider(this, 'aws-provider', { region: 'eu-central-1' });

        const db = new DatabaseCluster(this, 'db', {
            name: 'demo-postgres-cluster-ec2',
            engine: 'pg',
            version: '11',
            nodeCount: 1,
            size: 'db-s-1vcpu-1gb',
            region: 'fra1',
        })

        const latestUbuntu = new DataAwsAmi(this, 'ami', {
            owners: ['099720109477'], // Canonical
            mostRecent: true,
            filter: [{
                name: 'name',
                values: ['ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*'],
            }, {
                name: 'virtualization-type',
                values: ['hvm']
            }]
        });

        const keyPair = new KeyPair(this, 'ssh-key', {
            keyName: 'ansgar-cdk-demo',
            publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDkJq0a9H8zRZQHZQop9vbADw/UNUxSDxntWWPRAVpf0iky4h3a7FkaWMPMc0nN6C1QAy6P3qfx4z3En0RsfJ0V02+9oBTkN9oxMe+vWfFL44zdiSYBA7b6Y5QXHWcEI0HYxxxYyOGK7TfG7X/wlLodM4IAnd4zOj8X7Y8+CoKkctg9YywM75ZFU//dZRHv4BwDdcw96K2ybhmhfDEbSvYICPwrzbJzpPFKFk5j8NlPNxENKASQGHghdx25Dk22j+JvtvEKEIzNYpTts++9fpzYnfh2ifDftG/vDpvVf3jB4mk277G3Hje8iDnUXTtxta1crJrSc/UrK8wyW+9Gukut0U+RPRnjQfJPFl3AD2kDjQPpnsKs/Lwp4/cQurvK4thQ6MZlojggi6mYHbtVBN/udV0uNVFOBg6lVsWRZoWKTDOj9wTZqryugtK+pzOI/I8C13YM0AP+9qhVOl81fgKy8uroOk81TNYDAbF0TWOz3K9mlGzUgyCIbufGVV72qvM= ansgar@hashicorp.com',
        });

        const securityGroup = new SecurityGroup(this, 'sg-ec2-instance', {
            ingress: [{ fromPort: 22, toPort: 22, protocol: 'tcp', description: 'Allow SSH access', cidrBlocks: ["0.0.0.0/0"] }],
            egress: [{ fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"], description: 'Allow all egress' }]
        });

        const ec2 = new Instance(this, 'ec2', {
            ami: latestUbuntu.id,
            instanceType: 't3.micro',
            tags: { Name: 'cdk-day-example' },
            keyName: keyPair.keyName,
            securityGroups: [securityGroup.name],
        });

        db.grantAccess(ec2);

        new TerraformOutput(this, 'database_url_local', { value: 'overriden', sensitive: true })
            .addOverride('value', `postgresql://${db.user}:${db.password}@localhost:11111/${db.database}`);
        new TerraformOutput(this, 'database_host_port', { value: `${db.host}:${db.getStringAttribute('port')}` });
        new TerraformOutput(this, 'instance_ip', { value: ec2.publicIp });
    }
}
