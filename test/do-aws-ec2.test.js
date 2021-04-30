const util = require("util");
const getOutputs = require("./getOutputs");
const exec = util.promisify(require("child_process").exec);
const spawn = require("child_process").spawn;

describe("AWS EC2 Instance to DigitalOcean DB", () => {
  let database_url_local;
  let tunnel;

  beforeAll(async () => {
    const outputs = await getOutputs("cdktf", "cdk-day-digitalocean-aws-ec2");
    const { database_host_port, instance_ip } = outputs;
    database_url_local = outputs.database_url_local;

    // open ssh tunnel
    tunnel = exec(
      `ssh -o StrictHostKeyChecking=no -L 11111:${database_host_port} -N ubuntu@${instance_ip}`
    );

    // wair a bit for ssh tunnel to be setup
    await new Promise(r => setTimeout(r, 2000));

  }, 10000);

  afterAll(async () => {
    if (tunnel) tunnel.child.kill();
  })

  test("can access db", async () => {
    const result = await exec(
      `docker run --rm postgres:11 psql ${database_url_local.replace(
        "localhost",
        "host.docker.internal"
      )} -c "\\\\l"`
    );

    expect(result.stdout.toString()).toMatchInlineSnapshot(`
      "                                  List of databases
         Name    |  Owner   | Encoding |   Collate   |    Ctype    |   Access privileges   
      -----------+----------+----------+-------------+-------------+-----------------------
       _dodb     | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 
       defaultdb | doadmin  | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 
       template0 | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +
                 |          |          |             |             | postgres=CTc/postgres
       template1 | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +
                 |          |          |             |             | postgres=CTc/postgres
      (4 rows)

      "
    `);
  }, 20000);
});
