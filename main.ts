import { App, RemoteBackend } from 'cdktf';
import { DigitalOceanStack } from './stack-digital-ocean';
import { DigitalOceanPlainStack } from './stack-digital-ocean-plain';
import { DigitalOceanAwsEc2Stack } from './stack-digital-ocean-aws-ec2';
import { DigitalOceanAwsRdsStack } from './stack-digital-ocean-aws-rds';

const app = new App();

const digitalOceanPlainStack = new DigitalOceanPlainStack(app, 'do-plain');
const digitalOceanStack = new DigitalOceanStack(app, 'do');
const digitalOceanAwsEc2Stack = new DigitalOceanAwsEc2Stack(app, 'do-aws-ec2');
const digitalOceanAwsRdsStack = new DigitalOceanAwsRdsStack(app, 'do-aws-rds');

const remoteBackendBaseConfig = {
  hostname: 'app.terraform.io',
  organization: 'cdktf',
};

new RemoteBackend(digitalOceanPlainStack, {
  ...remoteBackendBaseConfig,
  workspaces: {
    name: 'cdk-day-digitalocean-plain'
  }
});
new RemoteBackend(digitalOceanStack, {
  ...remoteBackendBaseConfig,
  workspaces: {
    name: 'cdk-day-digitalocean'
  }
});
new RemoteBackend(digitalOceanAwsEc2Stack, {
  ...remoteBackendBaseConfig,
  workspaces: {
    name: 'cdk-day-digitalocean-aws-ec2'
  }
});
new RemoteBackend(digitalOceanAwsRdsStack, {
  ...remoteBackendBaseConfig,
  workspaces: {
    name: 'cdk-day-digitalocean-aws-rds'
  }
});

app.synth();
