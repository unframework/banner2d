const planck = require('planck-js');

require('planck-js/testbed');

planck.testbed('Banner', function (testbed) {
    const world = new planck.World({
        gravity: planck.Vec2(0.2, 0)
    });

    const ballFD = {
        density : 1.0,
        friction : 0.6
    };

    const bodyList = [];
    const deletionIndexList = []; // reusable instance

    let spawnCountdown = 0;

    testbed.step = function (dtms) {
        const dt = dtms / 1000;

        // spawn new bodies
        spawnCountdown -= dt;

        if (spawnCountdown < 0) {
            spawnCountdown += 2;

            const radius = 0.4;
            const body = world.createDynamicBody(planck.Vec2(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1))
            const fixture = body.createFixture(planck.Circle(radius), ballFD);

            body.data = {
                sizeCountdown: 0,
                radius: radius,
                fixture: fixture
            };

            bodyList.push(body);
        }

        // process each moving body
        bodyList.forEach((body, index) => {
            body.data.sizeCountdown -= dt;

            if (body.data.sizeCountdown < 0) {
                body.data.sizeCountdown += 0.5 + Math.random() * 0.5;

                const nextRadius = body.data.radius * (1 + Math.random() * 0.1);
                const nextFixture = body.createFixture(planck.Circle(nextRadius), ballFD);

                body.destroyFixture(body.data.fixture);

                body.data.fixture = nextFixture;
                body.data.radius = nextRadius;
            }

            const position = body.getPosition();

            if (position.x > 10) {
                deletionIndexList.push(index);
            }
        });

        // clean up bodies marked for deletion
        deletionIndexList.forEach(bodyIndex => {
            world.destroyBody(bodyList[bodyIndex]);
            bodyList.splice(bodyIndex, 1);
        });

        deletionIndexList.length = 0; // clean out temporary state
    };

    testbed.x = 0;
    testbed.y = 0;
    testbed.info('Banner animation');

    return world;
});
