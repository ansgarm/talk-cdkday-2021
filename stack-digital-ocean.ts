import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { DatabaseCluster as BaseDatabaseCluster, DatabaseFirewall, DigitaloceanProvider, Droplet } from "./.gen/providers/digitalocean";
import { Grantor, GrantStrategy } from "./lib/grants";

const DatabaseCluster = Grantor(BaseDatabaseCluster);

export class DigitalOceanStack extends TerraformStack {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        new DigitaloceanProvider(this, 'do-provider');

        const db = new DatabaseCluster(this, 'db', {
            name: 'demo-postgres-cluster-droplet-1',
            engine: 'pg',
            version: '11',
            nodeCount: 1,
            size: 'db-s-1vcpu-1gb',
            region: 'fra1',
        });

        const droplet = new Droplet(this, 'droplet', {
            name: 'do-droplet',
            image: 'ubuntu-18-04-x64',
            size: 's-1vcpu-1gb',
            region: 'fra1',
            sshKeys: ['d1:c3:bd:49:65:90:ac:01:fa:1e:9a:af:1b:6f:12:39'],
            privateNetworking: true,
        });

        db.grantAccess(droplet); // 😍

        new TerraformOutput(this, 'database_url_local', { value: 'overriden', sensitive: true })
            .addOverride('value', `postgresql://${db.user}:${db.password}@localhost:11111/${db.database}`);
        new TerraformOutput(this, 'database_host_port', { value: `${db.host}:${db.getStringAttribute('port')}` });
        new TerraformOutput(this, 'instance_ip', { value: droplet.ipv4Address });

    }
}
