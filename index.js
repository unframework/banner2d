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

    const distanceJD = {
        frequencyHz: 2.0,
        dampingRatio: 0.5
    };

    const bodyList = [];

    let spawnCountdown = 0;

    testbed.step = function (dtms) {
        const dt = dtms / 1000;

        // spawn new bodies
        spawnCountdown -= dt;

        if (spawnCountdown < 0) {
            spawnCountdown += 0.8;

            const radius = 0.4;
            const body = world.createDynamicBody(planck.Vec2(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1))
            const fixture = body.createFixture(planck.Circle(radius), ballFD);

            body.data = {
                prevJoint: null,
                nextJoint: null,
                sizeCountdown: 0,
                radius: radius,
                fixture: fixture
            };

            if (bodyList.length > 0) {
                const prevBody = bodyList[bodyList.length - 1];

                prevBody.data.nextJoint = body.data.prevJoint = world.createJoint(planck.DistanceJoint({
                    bodyA: prevBody,
                    localAnchorA: planck.Vec2(0, 0),
                    bodyB: body,
                    localAnchorB: planck.Vec2(0, 0),
                    length: prevBody.data.radius + radius
                }));
            }

            bodyList.push(body);
        }

        // process each moving body
        bodyList.forEach((body, index) => {
            body.data.sizeCountdown -= dt;

            if (body.data.sizeCountdown < 0) {
                body.data.sizeCountdown += 0.2 + Math.random() * 0.5;

                const nextRadius = body.data.radius * (1 + Math.random() * 0.1);
                const nextFixture = body.createFixture(planck.Circle(nextRadius), ballFD);

                body.destroyFixture(body.data.fixture);

                body.data.fixture = nextFixture;
                body.data.radius = nextRadius;

                if (index > 0) {
                    const prevBody = bodyList[index - 1];
                    body.data.prevJoint.setLength(prevBody.data.radius + nextRadius);
                }

                if (index < bodyList.length - 1) {
                    const nextBody = bodyList[index + 1];
                    body.data.nextJoint.setLength(nextBody.data.radius + nextRadius);
                }
            }
        });

        // eliminate furthest offscreen bubble in the chain
        if (bodyList.length > 0) {
            const lastBody = bodyList[0];
            const position = lastBody.getPosition();

            if (position.x > 10) {
                world.destroyBody(lastBody);
                bodyList.splice(0, 1);
            }
        }
    };

    testbed.x = 0;
    testbed.y = 0;
    testbed.info('Banner animation');

    return world;
});
