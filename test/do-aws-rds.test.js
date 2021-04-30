const util = require("util");
const getOutputs = require("./getOutputs");
const exec = util.promisify(require("child_process").exec);
const spawn = require("child_process").spawn;

describe("DigitalOcean Droplet to AWS RDS", () => {
  let database_url_local;
  let tunnel;

  beforeAll(async () => {
    const outputs = await getOutputs("cdktf", "cdk-day-digitalocean-aws-rds");
    const { database_host_port, instance_ip } = outputs;
    database_url_local = outputs.database_url_local;

    // open ssh tunnel
    tunnel = exec(
      `ssh -o StrictHostKeyChecking=no -L 11111:${database_host_port} -N root@${instance_ip}`
    );

    // wair a bit for ssh tunnel to be setup
    await new Promise((r) => setTimeout(r, 2000));
  }, 10000);

  afterAll(async () => {
    if (tunnel) tunnel.child.kill();
  });

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
       demodb    | cdkday   | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 
       postgres  | cdkday   | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 
       rdsadmin  | rdsadmin | UTF8     | en_US.UTF-8 | en_US.UTF-8 | rdsadmin=CTc/rdsadmin
       template0 | rdsadmin | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/rdsadmin          +
                 |          |          |             |             | rdsadmin=CTc/rdsadmin
       template1 | cdkday   | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/cdkday            +
                 |          |          |             |             | cdkday=CTc/cdkday
      (5 rows)

      "
    `);
  }, 20000);
});
