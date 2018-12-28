const planck = require('planck-js');

require('planck-js/testbed');

planck.testbed('Banner', function (testbed) {
    const world = new planck.World({
        gravity: planck.Vec2(0, 0)
    });

    const ballFD = {
        density : 1.0,
        friction : 0.6
    };

    world.createDynamicBody(planck.Vec2(0, 0)).createFixture(planck.Circle(0.4), ballFD);

    let spawnCountdown = 2000;

    testbed.step = function (dt) {
        spawnCountdown -= dt;

        if (spawnCountdown < 0) {
            spawnCountdown += 2000;

            world.createDynamicBody(planck.Vec2(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1)).createFixture(planck.Circle(0.4), ballFD);
        }
    };

    testbed.x = 0;
    testbed.y = 0;
    testbed.info('Banner animation');

    return world;
});
