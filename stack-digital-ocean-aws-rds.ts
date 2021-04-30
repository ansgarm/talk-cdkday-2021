import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { DigitaloceanProvider, Droplet } from "./.gen/providers/digitalocean";
import { Password } from './.gen/providers/random';
import { TerraformAwsModulesVpcAws } from './.gen/modules/terraform-aws-modules/vpc/aws'
import { TerraformAwsModulesRdsAws as BaseTerraformAwsModulesRdsAws } from './.gen/modules/terraform-aws-modules/rds/aws'
import { AwsProvider, SecurityGroup, SecurityGroupRule } from "@cdktf/provider-aws";
import { Grantor, GrantStrategy } from './lib/grants';
import * as assert from 'assert';

const TerraformAwsModulesRdsAws = Grantor(BaseTerraformAwsModulesRdsAws);

export class DigitalOceanAwsRdsStack extends TerraformStack {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        const region = 'eu-central-1';

        new DigitaloceanProvider(this, 'do-provider');
        new AwsProvider(this, 'aws-provider', {
            region,
        });

        const droplet = new Droplet(this, 'droplet', {
            name: 'do-droplet-rds',
            image: 'ubuntu-18-04-x64',
            size: 's-1vcpu-1gb',
            region: 'fra1',
            // privateNetworking: true,
            sshKeys: ['d1:c3:bd:49:65:90:ac:01:fa:1e:9a:af:1b:6f:12:39'],
        });

        const vpc = new TerraformAwsModulesVpcAws(this, 'vpc', {
            singleNatGateway: true,
            name: name,
            cidr: "10.99.0.0/18",
            azs: [`${region}a`, `${region}b`, `${region}c`,],
            publicSubnets: ["10.99.0.0/24", "10.99.1.0/24", "10.99.2.0/24"],
            privateSubnets: ["10.99.3.0/24", "10.99.4.0/24", "10.99.5.0/24"],
            databaseSubnets: ["10.99.6.0/24", "10.99.7.0/24", "10.99.8.0/24"],

            createDatabaseSubnetGroup: true,
            createDatabaseSubnetRouteTable: true,
            createDatabaseInternetGatewayRoute: true,
          
            enableDnsHostnames: true,
            enableDnsSupport: true,
        });

        const password = new Password(this, 'db-password', {
            length: 16,
            special: false,
        })

        const securityGroup = new SecurityGroup(this, 'sg-rds-cdkday-test', {
            vpcId: vpc.vpcIdOutput,
        });

        const db = new TerraformAwsModulesRdsAws(this, 'db', {
            identifier: 'cdkday-test',

            engine: 'postgres',
            engineVersion: '11.10',
            family: 'postgres11',
            instanceClass: 'db.t3.micro',
            allocatedStorage: '5',

            createDbOptionGroup: false,
            createDbParameterGroup: false,
            applyImmediately: true,

            name: "demodb",
            port: '5432',
            username: 'cdkday',
            password: password.result,

            maintenanceWindow: 'Mon:00:00-Mon:03:00',
            backupWindow: '03:00-06:00',

            subnetIds: vpc.databaseSubnetsOutput as unknown as any, // 🙈
            vpcSecurityGroupIds: [securityGroup.id],
            publiclyAccessible: true,
        });

        db.grantAccess(droplet, new DropletToRdsViaSecurityGroupGrantStrategy(securityGroup));
        
        new TerraformOutput(this, 'database_url_local', { value: 'overriden', sensitive: true })
            .addOverride('value', `postgresql://${db.username}:${db.password}@localhost:11111/${db.name}`);
        new TerraformOutput(this, 'database_host_port', { value: `${db.dbInstanceEndpointOutput}` });
        new TerraformOutput(this, 'instance_ip', { value: droplet.ipv4Address });
    }
}

class DropletToRdsViaSecurityGroupGrantStrategy implements GrantStrategy<BaseTerraformAwsModulesRdsAws, Droplet> {
    constructor(private securityGroup: SecurityGroup) { }

    grantAccess(grantor: BaseTerraformAwsModulesRdsAws, grantee: Droplet, scope: Construct): void {
        this.checkPrerequisites(grantor);
        new SecurityGroupRule(scope, 'sg-rule', {
            description: 'Allow access from DigitalOcean Droplet',
            securityGroupId: this.securityGroup.id,
            type: 'ingress',
            fromPort: 5432,
            toPort: 5432,
            protocol: 'tcp',
            cidrBlocks: [`${grantee.ipv4Address}/32`],
        })
    }

    private checkPrerequisites(grantor: BaseTerraformAwsModulesRdsAws) {
        assert(grantor.publiclyAccessible, "RDS instance is not configured to be publicly accessible. Cannot grant access to it from a Droplet");
    }
}