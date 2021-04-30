import { Instance } from "@cdktf/provider-aws";
import { TerraformElement } from "cdktf";
import { Construct } from "constructs";
import { DatabaseCluster, DatabaseFirewall, Droplet } from "../.gen/providers/digitalocean";
import { GrantStrategy } from "./grants";

// utility
type Constructor<T = {}> = new (...args: any[]) => T;

// simple registry to keep track of known grant strategies
interface RegistryEntry<TGrantor extends TerraformElement, TGrantee extends TerraformElement> {
    strategy: GrantStrategy<TGrantor, TGrantee>,
    grantorClass: Constructor<TGrantor>,
    granteeClass: Constructor<TGrantee>,
}
const registeredStrategies = new Set<RegistryEntry<TerraformElement, TerraformElement>>();
export function registerStrategy<TGrantor extends TerraformElement, TGrantee extends TerraformElement>(
    strategy: GrantStrategy<TGrantor, TGrantee>,
    grantorClass: Constructor<TGrantor>,
    granteeClass: Constructor<TGrantee>,
) {
    registeredStrategies.add({ strategy, grantorClass, granteeClass });
}
export function findStrategy<TGrantor extends TerraformElement, TGrantee extends TerraformElement>(grantor: TGrantor, grantee: TGrantee): GrantStrategy<TGrantor, TGrantee> | null {
    return [...registeredStrategies]
        .find(strategy => grantor instanceof strategy.grantorClass && grantee instanceof strategy.granteeClass)
        ?.strategy || null;
}

// some example strategies used in this codebase
export class DigitalOceanDBGrantStrategy implements GrantStrategy<DatabaseCluster, Droplet> {
    grantAccess(grantor: DatabaseCluster, grantee: Droplet, scope: Construct): void {
        new DatabaseFirewall(scope, 'db-allow-droplet', {
            clusterId: grantor.id,

            rule: [{
                type: 'droplet',
                value: grantee.id,
            }],
        });
    }
}
registerStrategy(new DigitalOceanDBGrantStrategy(), DatabaseCluster, Droplet);

export class DigitalOceanDBEc2GrantStrategy implements GrantStrategy<DatabaseCluster, Instance> {
    grantAccess(grantor: DatabaseCluster, grantee: Instance, scope: Construct): void {
        new DatabaseFirewall(scope, 'db-allow-ec2', {
            clusterId: grantor.id,

            rule: [{
                type: 'ip_addr',
                value: grantee.publicIp,
            }],
        });
    }
}
registerStrategy(new DigitalOceanDBEc2GrantStrategy(), DatabaseCluster, Instance);
