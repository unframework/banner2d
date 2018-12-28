const planck = require('planck-js');

require('planck-js/testbed');

class BannerWorld {
    constructor() {
        this._ballFD = {
            density : 1.0,
            friction : 0.6
        };

        this._world = new planck.World({
            gravity: planck.Vec2(0, 0)
        });

        this._bodyList = [];

        this._spawnCountdown = 0;
    }

    step(dt) {
        const world = this._world;
        const bodyList = this._bodyList;

        // spawn new bodies
        this._spawnCountdown -= dt;

        if (this._spawnCountdown < 0) {
            // check if spawn area is too crowded
            const readyForSpawn = bodyList.length === 0 || bodyList[bodyList.length - 1].getPosition().x > 0.1;

            if (readyForSpawn) {
                this._spawnCountdown += 0.4;

                const radius = 0.4;
                const body = world.createDynamicBody(planck.Vec2(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1))
                const fixture = body.createFixture(planck.Circle(radius), this._ballFD);
                body.setLinearVelocity(planck.Vec2(2.5, Math.random() * 1.5 - 0.75));

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
            } else {
                this._spawnCountdown += 0.1; // do another check soon
            }
        }

        // process each moving body
        bodyList.forEach((body, index) => {
            body.data.sizeCountdown -= dt;

            if (body.data.sizeCountdown < 0) {
                body.data.sizeCountdown += 0.5 + Math.random() * 0.8;

                const nextRadius = body.data.radius + (4 - body.data.radius) * Math.random() * 0.1;
                const nextFixture = body.createFixture(planck.Circle(nextRadius), this._ballFD);

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

            if (position.x > 20) {
                world.destroyBody(lastBody);
                bodyList.splice(0, 1);
            }
        }
    }
}

planck.testbed('Banner', function (testbed) {
    const main = new BannerWorld();

    testbed.step = function (dtms) {
        const dt = dtms / 1000;

        main.step(dt);
    };

    testbed.x = 0;
    testbed.y = 0;
    testbed.info('Banner animation');

    return main._world;
});
