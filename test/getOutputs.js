// this is very hacky but works for this prototype. There will be a way to retrieve outputs via the cdktf in the future.
const { TerraformLogin } = require('cdktf-cli/bin/cmds/helper/terraform-login');
const TerraformCloudClient = require('@skorfmann/terraform-cloud');
const login = new TerraformLogin();

async function getOutputs(organizationName, workspaceName) {
    const token = await login.getTokenFromTerraformCredentialsFile();
    const client = new TerraformCloudClient.TerraformCloud(token)
    const workspaceId = (await client.Workspaces.showByName(organizationName, workspaceName)).id;
    const stateVersion = await client.StateVersions.current(workspaceId, true);

    const outputs = stateVersion.included.reduce((acc, output) => {
        acc[output.attributes.name] = output.attributes.value;
        return acc
      }, {})

    return outputs;
}
module.exports = getOutputs;