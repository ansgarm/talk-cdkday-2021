import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { DigitaloceanProvider, DatabaseCluster, Droplet, DatabaseFirewall } from './.gen/providers/digitalocean';

export class DigitalOceanPlainStack extends TerraformStack {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        new DigitaloceanProvider(this, 'do-provider');

        const db = new DatabaseCluster(this, 'db', {
            name: 'demo-postgres-cluster-plain',
            engine: 'pg',
            version: '11',
            nodeCount: 1,
            size: 'db-s-1vcpu-1gb',
            region: 'fra1',
        });

        const droplet = new Droplet(this, 'droplet', {
            name: 'do-plain-droplet',
            image: 'ubuntu-18-04-x64',
            size: 's-1vcpu-1gb',
            region: 'fra1',
            sshKeys: ['d1:c3:bd:49:65:90:ac:01:fa:1e:9a:af:1b:6f:12:39'],
            privateNetworking: true,
        });

        new DatabaseFirewall(this, 'db-allow-droplet', {
            clusterId: db.id,

            rule: [{
                type: 'droplet',
                value: droplet.id,
            }],
        });

        new TerraformOutput(this, 'database_url', { value: 'overriden', sensitive: true })
            .addOverride('value', `postgresql://${db.user}:${db.password}@${db.host}:${db.getStringAttribute('port')}/${db.database}`);
        new TerraformOutput(this, 'instance_ip', { value: droplet.ipv4Address });
    }
}