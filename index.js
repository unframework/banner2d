const planck = require('planck-js');

require('planck-js/testbed');

class BannerWorld {
    constructor() {
        this._ballFD = {
            density : 1.0,
            friction : 0.6
        };

        this._world = new planck.World({
            gravity: planck.Vec2(0.1, 0)
        });

        this._ground = this._world.createBody();
        this._ground.createFixture(planck.Edge(planck.Vec2(-0.1, -50), planck.Vec2(-0.1, 50)), {
            density: 0,
            friction: 0.6
        });

        this._bodyList = [];
        this._startingDirection = 1;

        this._spawnCountdown = 0;
    }

    step(dt) {
        const world = this._world;
        const bodyList = this._bodyList;

        // spawn new bodies
        this._spawnCountdown -= dt;

        if (this._spawnCountdown < 0) {
            // check if spawn area is too crowded
            const readyForSpawn = bodyList.length === 0 || bodyList[bodyList.length - 1].getPosition().x - bodyList[bodyList.length - 1].data.radius > 0.5;

            if (readyForSpawn) {
                this._spawnCountdown += 0.4;

                const radius = 0.2;
                const body = world.createDynamicBody(planck.Vec2(0, Math.random() * 0.1 - 0.05))
                const fixture = body.createFixture(planck.Circle(radius), this._ballFD);
                body.setLinearVelocity(planck.Vec2(1.5, this._startingDirection * Math.random() * 1.5));

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
                        collideConnected: true, // rigid minimum distance
                        frequencyHz: 0.2,
                        dampingRatio: 0.5,
                        bodyA: prevBody,
                        localAnchorA: planck.Vec2(0, 0),
                        bodyB: body,
                        localAnchorB: planck.Vec2(0, 0),
                        length: prevBody.data.radius + radius
                    }));
                }

                bodyList.push(body);
                this._startingDirection = -this._startingDirection;
            } else {
                this._spawnCountdown += 0.1; // do another check soon
            }
        }

        // process each moving body
        bodyList.forEach((body, index) => {
            body.data.sizeCountdown -= dt;

            if (body.data.sizeCountdown < 0) {
                body.data.sizeCountdown += 0.1 + Math.random() * 0.3;

                const nextRadius = body.data.radius + (2 - body.data.radius) * Math.random() * 0.05;
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

const canvas = document.createElement('canvas');
canvas.style.position = 'absolute';
canvas.style.top = '0vh';
canvas.style.left = '0vw';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
document.body.appendChild(canvas);

const bufferWidth = canvas.offsetWidth;
const bufferHeight = canvas.offsetHeight;
const aspectRatio = bufferWidth / bufferHeight;
canvas.width = bufferWidth;
canvas.height = bufferHeight;

const ctx = canvas.getContext('2d');

const main = new BannerWorld();

function renderer() {
    const dt = 1 / 60.0;
    main._world.step(dt);
    main.step(dt);

    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, bufferWidth, bufferHeight);

    ctx.save();

    ctx.translate(bufferWidth / 2, bufferHeight / 2);
    ctx.scale(bufferHeight / 20, bufferHeight / 20);

    const firstBodyIndex = main._bodyList.length - 1;
    let bodyIndex = firstBodyIndex;
    let segmentIndex = 0;
    let azimuth = Math.PI;
    let direction = main._startingDirection;
    const segmentDistance = 0.3;

    ctx.lineWidth = 0.05;
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#f00';

    ctx.beginPath();

    while (bodyIndex > 0) {
        const body = main._bodyList[bodyIndex];
        const pos = body.getPosition();
        const radius = body.data.radius;
        const azimuthIncrement = direction * segmentDistance / radius;

        const nextBody = main._bodyList[bodyIndex - 1];
        const nextPos = nextBody.getPosition();
        const nextBodyAzimuth = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x);
        const switchAzimuth = nextBodyAzimuth + Math.PI * 2 * Math.ceil(direction * (azimuth - nextBodyAzimuth) / (Math.PI * 2));

        if (bodyIndex === firstBodyIndex) {
            ctx.moveTo(pos.x + Math.cos(azimuth) * radius, pos.y + Math.sin(azimuth) * radius);
        }

        while (segmentIndex < 150) {
            segmentIndex += 1;

            const nextAzimuth = azimuth + azimuthIncrement;
            const remainder = direction * (nextAzimuth - switchAzimuth);

            if (remainder > 0) {
                // flip to other side and anticipate leftover distance (for the new radius)
                direction = -direction;
                azimuth = nextBodyAzimuth + Math.PI - (azimuth - switchAzimuth) * radius / nextBody.data.radius;
                break;
            }

            azimuth = nextAzimuth;
            ctx.lineTo(pos.x + Math.cos(azimuth) * radius, pos.y + Math.sin(azimuth) * radius);
        }

        bodyIndex -= 1;
    }

    ctx.stroke();

    ctx.restore();

    window.requestAnimationFrame(renderer);
}

// renderer();

planck.testbed('Banner', function (testbed) {
    testbed.step = function (dtms) {
        const dt = dtms / 1000;

        main.step(dt);
    };

    testbed.x = 0;
    testbed.y = 0;
    testbed.info('Banner animation');

    return main._world;
});
