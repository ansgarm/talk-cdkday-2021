import { TerraformElement } from "cdktf";
import { Construct } from "constructs";
import { findStrategy } from "./strategies";

export interface GrantStrategy<TGrantor extends TerraformElement, TGrantee extends TerraformElement> {
    grantAccess(grantor: TGrantor, grantee: TGrantee, scope: Construct): void;
}

interface Grantor extends TerraformElement {
    grantAccess<TGrantee extends TerraformElement>(grantee: TGrantee, strategy?: GrantStrategy<this, TGrantee>): void;
}

type Constructor<T = {}> = new (...args: any[]) => T;

export function Grantor<TBase extends Constructor<TerraformElement>>(Base: TBase): TBase & Constructor<Grantor> {
    return class Grantor extends Base {
        grantAccess<TGrantee extends TerraformElement>(grantee: TGrantee, strategy?: GrantStrategy<this, TGrantee> | null) {
            if (!strategy) {
                // try to find a registered one if none was passed
                strategy = findStrategy(this, grantee);
            }
            if (strategy){
                strategy.grantAccess(this, grantee, this);
            } else {
                throw new Error(`No default GrantStrategy registered to grant ${grantee} access to ${this}`);
            }
        }
    }
}
