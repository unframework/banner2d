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
            const readyForSpawn = bodyList.length === 0 || bodyList[bodyList.length - 1].getPosition().x - bodyList[bodyList.length - 1].data.radius > 0.6;

            if (readyForSpawn) {
                this._spawnCountdown += 0.4;

                const radius = 0.3;
                const body = world.createDynamicBody(planck.Vec2(radius, this._startingDirection * (-radius + Math.random() * 0.1)))
                const fixture = body.createFixture(planck.Circle(radius), this._ballFD);
                body.setLinearVelocity(planck.Vec2(1.2, this._startingDirection * Math.random() * 2.0));

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
    ctx.scale(bufferHeight / 20, -bufferHeight / 20);

    ctx.lineWidth = 0.05;
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#f00';

    ctx.beginPath();

    ctx.moveTo(0, 0);

    const segmentTravel = 0.2;
    const segmentCount = 150;
    let segmentIndex = 0;

    let direction = -main._startingDirection; // first body gets the proper winding direction
    let bx = 0, by = 0, br = 0;
    let azimuth = 0;
    let travelLeft = 0;
    let nextBodyIndex = main._bodyList.length - 1;

    while (nextBodyIndex >= 0) {
        // determine arc and line segment towards next body
        const nextBody = main._bodyList[nextBodyIndex];
        const nextPos = nextBody.getPosition();
        const nextRadius = nextBody.data.radius - 0.1;

        const dx = nextPos.x - bx;
        const dy = nextPos.y - by;
        const nextBodyDirection = Math.atan2(dy, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);
        const projectedDistance = Math.min(distance, br + nextRadius);
        const alongDistance = Math.sqrt(distance * distance - projectedDistance * projectedDistance);

        const alphaSine = projectedDistance / distance;
        const arcEndAzimuth = nextBodyDirection - direction * (Math.PI / 2 - Math.asin(alphaSine));

        // ensure end of arc is always "ahead" of the starting azimuth
        const arcAzimuthDelta = arcEndAzimuth - azimuth;
        const extraRotations = -Math.floor(direction * arcAzimuthDelta / (Math.PI * 2));
        const arcLength = direction * (arcAzimuthDelta + direction * extraRotations * Math.PI * 2) * br;

        const travelUntilStraightPortion = travelLeft + arcLength;
        const arcSegmentCount = Math.floor(travelUntilStraightPortion / segmentTravel);
        const displayedArcSegmentCount = Math.min(arcSegmentCount, segmentCount - segmentIndex);

        // step through arc segments, drawing line to end of each one (hence 1-based loop)
        for (let i = 1; i <= displayedArcSegmentCount; i += 1) {
            const segmentAzimuth = azimuth + direction * (i * segmentTravel - travelLeft) / br;
            ctx.lineTo(bx + Math.cos(segmentAzimuth) * br, by + Math.sin(segmentAzimuth) * br);
        }

        segmentIndex += displayedArcSegmentCount;

        // step through the linear portion
        const travelLeftInArc = travelUntilStraightPortion - arcSegmentCount * segmentTravel;
        const travelUntilNextArc = travelLeftInArc + alongDistance;
        const straightSegmentCount = Math.floor(travelUntilNextArc / segmentTravel);
        const displayedStraightSegmentCount = Math.min(straightSegmentCount, segmentCount - segmentIndex);
        const endCos = Math.cos(arcEndAzimuth);
        const endSin = Math.sin(arcEndAzimuth);

        // draw to first segment point on the line
        if (displayedStraightSegmentCount > 0) {
            const firstSegmentLinearTravel = direction * (segmentTravel - travelLeftInArc);
            ctx.lineTo(bx + endCos * br - endSin * firstSegmentLinearTravel, by + endSin * br + endCos * firstSegmentLinearTravel);
        }

        // draw to last segment point on the line
        if (displayedStraightSegmentCount > 1) {
            const lastSegmentLinearTravel = direction * (segmentTravel * displayedStraightSegmentCount - travelLeftInArc);
            ctx.lineTo(bx + endCos * br - endSin * lastSegmentLinearTravel, by + endSin * br + endCos * lastSegmentLinearTravel);
        }

        segmentIndex += displayedStraightSegmentCount;

        bx = nextPos.x;
        by = nextPos.y;
        br = nextRadius;
        azimuth = arcEndAzimuth + Math.PI; // next arc starts at opposite side of circle
        travelLeft = travelUntilNextArc - straightSegmentCount * segmentTravel;
        direction = -direction;
        nextBodyIndex -= 1;
    }

    ctx.stroke();

    main._bodyList.forEach(body => {
        const pos = body.getPosition();
        ctx.fillStyle = '#0f0';
        ctx.fillRect(pos.x - 0.05, pos.y - 0.05, 0.1, 0.1);
    });

    ctx.restore();

    window.requestAnimationFrame(renderer);
}

renderer();

// planck.testbed('Banner', function (testbed) {
//     testbed.step = function (dtms) {
//         const dt = dtms / 1000;

//         main.step(dt);
//     };

//     testbed.x = 0;
//     testbed.y = 0;
//     testbed.info('Banner animation');

//     return main._world;
// });
