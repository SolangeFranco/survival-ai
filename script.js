(() => {
    'use strict';

    const canvas = document.getElementById('simulationCanvas');
    const context = canvas.getContext('2d');
    const elements = {
        status: document.getElementById('simulationStatus'),
        statusDot: document.getElementById('statusDot'),
        startPause: document.getElementById('startPauseBtn'),
        reset: document.getElementById('resetBtn'),
        speedDown: document.getElementById('decreaseSpeedBtn'),
        speedUp: document.getElementById('increaseSpeedBtn'),
        speedValue: document.getElementById('speedValue'),
        addEnergy: document.getElementById('addEnergyBtn'),
        resourcesDown: document.getElementById('decreaseResourcesBtn'),
        resourcesUp: document.getElementById('increaseResourcesBtn'),
        resourceSetting: document.getElementById('resourceSetting'),
        populationInput: document.getElementById('populationInput'),
        populationValue: document.getElementById('populationValue'),
        mutationInput: document.getElementById('mutationInput'),
        mutationValue: document.getElementById('mutationValue'),
        scarcityInput: document.getElementById('scarcityInput'),
        scarcityValue: document.getElementById('scarcityValue'),
        population: document.getElementById('population'),
        arenaPopulation: document.getElementById('arenaPopulation'),
        generation: document.getElementById('generation'),
        time: document.getElementById('time'),
        averageEnergy: document.getElementById('averageEnergy'),
        maxEnergyAgent: document.getElementById('maxEnergyAgent'),
        births: document.getElementById('births'),
        deaths: document.getElementById('deaths'),
        resourceCount: document.getElementById('resourceCount'),
        bestSurvival: document.getElementById('bestSurvival'),
        maxAge: document.getElementById('maxAge'),
        populationLine: document.getElementById('populationLine'),
        energyLine: document.getElementById('energyLine')
    };

    const STEP = 1 / 30;
    const MAX_POPULATION = 360;
    const RESOURCE_TYPES = [
        { name: 'Nutriente', color: '#6be6c3', energy: 34, radius: 3 },
        { name: 'Biomasa', color: '#a88bff', energy: 52, radius: 4 },
        { name: 'Mineral', color: '#ffc66e', energy: 25, radius: 2.7 }
    ];
    const agents = [];
    const resources = [];
    const populationHistory = [];
    const energyHistory = [];

    let worldWidth = 0;
    let worldHeight = 0;
    let running = false;
    let animationFrame = null;
    let previousFrame = 0;
    let accumulator = 0;
    let simulationSpeed = 1;
    let simulationSeconds = 0;
    let births = 0;
    let deaths = 0;
    let maximumGeneration = 1;
    let bestSurvival = 0;
    let maxAge = 0;
    let resourceTarget = 80;
    let resourceRegenClock = 0;
    let statClock = 0;

    const random = (min, max) => min + Math.random() * (max - min);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const oldWidth = worldWidth;
        const oldHeight = worldHeight;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        worldWidth = Math.max(1, rect.width);
        worldHeight = Math.max(1, rect.height);
        canvas.width = Math.round(worldWidth * pixelRatio);
        canvas.height = Math.round(worldHeight * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        if (oldWidth && oldHeight) {
            const scaleX = worldWidth / oldWidth;
            const scaleY = worldHeight / oldHeight;
            for (const agent of agents) {
                agent.x *= scaleX;
                agent.y *= scaleY;
            }
            for (const resource of resources) {
                resource.x *= scaleX;
                resource.y *= scaleY;
            }
        }
        render();
    }

    function createGenome(source = null) {
        if (!source) {
            return {
                speed: random(20, 34),
                perception: random(75, 145),
                metabolism: random(0.17, 0.32),
                lifespan: random(105, 165),
                hue: random(155, 285)
            };
        }

        const mutationRate = Number(elements.mutationInput.value) / 100;
        const inherit = (trait, min, max, mutationScale) => {
            const average = (source.genome[trait] + source.mateGenome[trait]) / 2;
            const mutation = Math.random() < mutationRate
                ? random(-mutationScale, mutationScale)
                : random(-mutationScale * 0.15, mutationScale * 0.15);
            return clamp(average + mutation, min, max);
        };

        return {
            speed: inherit('speed', 14, 48, 7),
            perception: inherit('perception', 50, 210, 26),
            metabolism: inherit('metabolism', 0.1, 0.52, 0.065),
            lifespan: inherit('lifespan', 70, 230, 23),
            hue: inherit('hue', 0, 360, 34)
        };
    }

    function createAgent(x, y, genome = null, generation = 1, energy = null) {
        const traits = genome || createGenome();
        return {
            x: x === undefined ? random(14, Math.max(15, worldWidth - 14)) : x,
            y: y === undefined ? random(14, Math.max(15, worldHeight - 14)) : y,
            energy: energy === null ? random(65, 100) : energy,
            genome: traits,
            generation,
            age: 0,
            survival: 0,
            heading: random(0, Math.PI * 2),
            turnTimer: random(0.3, 1.8),
            reproductionCooldown: random(4, 10),
            color: `hsl(${traits.hue} 82% 67%)`
        };
    }

    function spawnResource() {
        const type = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];
        resources.push({
            x: random(8, Math.max(9, worldWidth - 8)),
            y: random(8, Math.max(9, worldHeight - 8)),
            type,
            value: type.energy
        });
    }

    function reconcileResources() {
        while (resources.length < resourceTarget) spawnResource();
        if (resources.length > resourceTarget) resources.splice(resourceTarget);
        updateResourceCounts();
    }

    function updateResourceCounts() {
        elements.resourceSetting.value = resourceTarget;
        elements.resourceCount.textContent = resources.length;
    }

    function setRunning(nextRunning) {
        running = nextRunning;
        elements.startPause.innerHTML = running
            ? '<span class="pause-icon" aria-hidden="true">Ⅱ</span> Pausar simulación'
            : '<span class="play-icon" aria-hidden="true">▶</span> Iniciar simulación';
        elements.status.textContent = running ? 'SIMULACIÓN ACTIVA' : 'EN ESPERA';
        elements.statusDot.classList.toggle('is-paused', !running);
        elements.startPause.setAttribute('aria-pressed', String(running));
        previousFrame = 0;
        if (running && animationFrame === null) animationFrame = requestAnimationFrame(frame);
    }

    function resetSimulation() {
        setRunning(false);
        agents.length = 0;
        resources.length = 0;
        populationHistory.length = 0;
        energyHistory.length = 0;
        births = 0;
        deaths = 0;
        simulationSeconds = 0;
        maximumGeneration = 1;
        bestSurvival = 0;
        maxAge = 0;
        resourceRegenClock = 0;
        statClock = 0;
        accumulator = 0;
        resourceTarget = 80;
        simulationSpeed = 1;
        elements.populationInput.value = '60';
        elements.mutationInput.value = '8';
        elements.scarcityInput.value = '3';
        elements.populationValue.value = '60';
        elements.mutationValue.value = '8%';
        elements.scarcityValue.value = 'Normal';
        elements.speedValue.value = '1×';

        const initialPopulation = Number(elements.populationInput.value);
        for (let i = 0; i < initialPopulation; i++) agents.push(createAgent());
        reconcileResources();
        updateStats();
        updateChart();
        render();
    }

    function findNearestResource(agent) {
        let nearest = null;
        let nearestDistance = agent.genome.perception;
        for (const resource of resources) {
            const distance = Math.hypot(agent.x - resource.x, agent.y - resource.y);
            if (distance < nearestDistance) {
                nearest = resource;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    function moveAgent(agent, delta) {
        const target = findNearestResource(agent);
        agent.turnTimer -= delta;

        if (target) {
            const targetAngle = Math.atan2(target.y - agent.y, target.x - agent.x);
            const angleDifference = Math.atan2(
                Math.sin(targetAngle - agent.heading),
                Math.cos(targetAngle - agent.heading)
            );
            agent.heading += clamp(angleDifference, -3.2 * delta, 3.2 * delta);
        } else if (agent.turnTimer <= 0) {
            agent.heading += random(-0.85, 0.85);
            agent.turnTimer = random(0.45, 1.7);
        }

        const distance = agent.genome.speed * delta;
        agent.x += Math.cos(agent.heading) * distance;
        agent.y += Math.sin(agent.heading) * distance;
        const margin = 5;
        if (agent.x < margin || agent.x > worldWidth - margin) {
            agent.heading = Math.PI - agent.heading;
            agent.x = clamp(agent.x, margin, worldWidth - margin);
        }
        if (agent.y < margin || agent.y > worldHeight - margin) {
            agent.heading = -agent.heading;
            agent.y = clamp(agent.y, margin, worldHeight - margin);
        }

        agent.energy -= (agent.genome.metabolism + agent.genome.speed * 0.003) * delta;
        if (target && Math.hypot(agent.x - target.x, agent.y - target.y) < target.type.radius + 5) {
            agent.energy = Math.min(145, agent.energy + target.value);
            const resourceIndex = resources.indexOf(target);
            if (resourceIndex >= 0) resources.splice(resourceIndex, 1);
        }
    }

    function reproduce(parent, partner) {
        if (agents.length >= MAX_POPULATION) return null;
        const childGenome = createGenome({ genome: parent.genome, mateGenome: partner.genome });
        parent.energy -= 42;
        partner.energy -= 32;
        parent.reproductionCooldown = 8;
        partner.reproductionCooldown = 8;
        const child = createAgent(
            (parent.x + partner.x) / 2,
            (parent.y + partner.y) / 2,
            childGenome,
            Math.max(parent.generation, partner.generation) + 1,
            50
        );
        births++;
        maximumGeneration = Math.max(maximumGeneration, child.generation);
        return child;
    }

    function updateAgents(delta) {
        const newborns = [];
        for (let index = 0; index < agents.length; index++) {
            const agent = agents[index];
            agent.age += delta;
            agent.survival += delta;
            agent.reproductionCooldown -= delta;
            moveAgent(agent, delta);

            if (agent.energy >= 112 && agent.reproductionCooldown <= 0) {
                let partner = null;
                let closestDistance = 24;
                for (let otherIndex = index + 1; otherIndex < agents.length; otherIndex++) {
                    const candidate = agents[otherIndex];
                    if (candidate.energy < 85 || candidate.reproductionCooldown > 0) continue;
                    const distance = Math.hypot(agent.x - candidate.x, agent.y - candidate.y);
                    if (distance < closestDistance) {
                        partner = candidate;
                        closestDistance = distance;
                    }
                }
                if (partner) {
                    const child = reproduce(agent, partner);
                    if (child) newborns.push(child);
                }
            }

            if (agent.energy <= 0 || agent.age >= agent.genome.lifespan) {
                deaths++;
                bestSurvival = Math.max(bestSurvival, agent.survival);
                maxAge = Math.max(maxAge, agent.age);
                agents.splice(index, 1);
                index--;
            } else {
                maximumGeneration = Math.max(maximumGeneration, agent.generation);
                maxAge = Math.max(maxAge, agent.age);
            }
        }
        agents.push(...newborns);
        elements.resourceCount.textContent = resources.length;
    }

    function updateSimulation() {
        simulationSeconds += STEP;
        const scarcity = Number(elements.scarcityInput.value);
        const regenInterval = 0.65 + scarcity * 0.58;
        resourceRegenClock += STEP;
        if (resourceRegenClock >= regenInterval) {
            resourceRegenClock = 0;
            if (resources.length < resourceTarget) {
                const numberToSpawn = Math.min(2, resourceTarget - resources.length);
                for (let i = 0; i < numberToSpawn; i++) spawnResource();
            }
        }

        updateAgents(STEP);
        statClock += STEP;
        if (statClock >= 0.25) {
            statClock = 0;
            updateStats();
        }
    }

    function frame(timestamp) {
        animationFrame = null;
        if (!running) return;

        if (previousFrame) {
            accumulator += Math.min((timestamp - previousFrame) / 1000, 0.1) * simulationSpeed;
        }
        previousFrame = timestamp;
        let updates = 0;
        while (accumulator >= STEP && updates < 12) {
            updateSimulation();
            accumulator -= STEP;
            updates++;
        }
        render();
        animationFrame = requestAnimationFrame(frame);
    }

    function drawBackground() {
        context.fillStyle = '#0a111c';
        context.fillRect(0, 0, worldWidth, worldHeight);
        context.strokeStyle = 'rgba(121, 155, 188, 0.055)';
        context.lineWidth = 1;
        const spacing = 36;
        context.beginPath();
        for (let x = spacing; x < worldWidth; x += spacing) {
            context.moveTo(x, 0);
            context.lineTo(x, worldHeight);
        }
        for (let y = spacing; y < worldHeight; y += spacing) {
            context.moveTo(0, y);
            context.lineTo(worldWidth, y);
        }
        context.stroke();
        const glow = context.createRadialGradient(
            worldWidth * 0.5, worldHeight * 0.48, 0,
            worldWidth * 0.5, worldHeight * 0.48, Math.max(worldWidth, worldHeight) * 0.75
        );
        glow.addColorStop(0, 'rgba(23, 73, 85, 0.15)');
        glow.addColorStop(1, 'rgba(7, 12, 20, 0)');
        context.fillStyle = glow;
        context.fillRect(0, 0, worldWidth, worldHeight);
    }

    function render() {
        if (!worldWidth || !worldHeight) return;
        drawBackground();
        for (const resource of resources) {
            context.beginPath();
            context.fillStyle = resource.type.color;
            context.shadowColor = resource.type.color;
            context.shadowBlur = 9;
            context.arc(resource.x, resource.y, resource.type.radius, 0, Math.PI * 2);
            context.fill();
        }
        context.shadowBlur = 0;
        for (const agent of agents) {
            context.beginPath();
            context.fillStyle = agent.color;
            context.shadowColor = agent.color;
            context.shadowBlur = 10;
            context.arc(agent.x, agent.y, 3.3, 0, Math.PI * 2);
            context.fill();
            context.beginPath();
            context.fillStyle = 'rgba(255,255,255,.82)';
            context.arc(agent.x, agent.y, 1, 0, Math.PI * 2);
            context.fill();
        }
        context.shadowBlur = 0;
    }

    function formatTime(seconds) {
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        return `${String(minutes).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
    }

    function updateStats() {
        const totalEnergy = agents.reduce((sum, agent) => sum + agent.energy, 0);
        const averageEnergy = agents.length ? totalEnergy / agents.length : 0;
        const highestEnergy = agents.reduce((best, agent) => Math.max(best, agent.energy), 0);
        elements.population.textContent = agents.length;
        elements.arenaPopulation.textContent = `${agents.length} AGENTES`;
        elements.generation.textContent = maximumGeneration;
        elements.time.textContent = formatTime(simulationSeconds);
        elements.averageEnergy.textContent = Math.round(averageEnergy);
        elements.maxEnergyAgent.textContent = agents.length ? `${Math.round(highestEnergy)} EN` : '—';
        elements.births.textContent = births;
        elements.deaths.textContent = deaths;
        elements.bestSurvival.textContent = Math.floor(bestSurvival);
        elements.maxAge.textContent = Math.floor(maxAge);
        updateResourceCounts();

        if (running) {
            populationHistory.push(agents.length);
            energyHistory.push(averageEnergy);
            if (populationHistory.length > 60) {
                populationHistory.shift();
                energyHistory.shift();
            }
            updateChart();
        }
    }

    function updateChart() {
        const lastIndex = Math.max(populationHistory.length - 1, 1);
        const maxPopulation = Math.max(10, ...populationHistory);
        const maxEnergy = Math.max(100, ...energyHistory);
        const populationPoints = populationHistory.map((value, index) =>
            `${(index / lastIndex) * 600},${102 - (value / maxPopulation) * 88}`
        ).join(' ');
        const energyPoints = energyHistory.map((value, index) =>
            `${(index / lastIndex) * 600},${102 - (value / maxEnergy) * 88}`
        ).join(' ');
        elements.populationLine.setAttribute('points', populationPoints);
        elements.energyLine.setAttribute('points', energyPoints);
    }

    elements.startPause.addEventListener('click', () => setRunning(!running));
    elements.reset.addEventListener('click', resetSimulation);

    elements.speedDown.addEventListener('click', () => {
        simulationSpeed = Math.max(0.5, Math.round((simulationSpeed - 0.5) * 10) / 10);
        elements.speedValue.value = `${simulationSpeed}×`;
    });
    elements.speedUp.addEventListener('click', () => {
        simulationSpeed = Math.min(8, Math.round((simulationSpeed + 0.5) * 10) / 10);
        elements.speedValue.value = `${simulationSpeed}×`;
    });
    elements.addEnergy.addEventListener('click', () => {
        for (const agent of agents) agent.energy = Math.min(145, agent.energy + 25);
        updateStats();
        render();
    });
    elements.resourcesDown.addEventListener('click', () => {
        resourceTarget = Math.max(10, resourceTarget - 10);
        reconcileResources();
        render();
    });
    elements.resourcesUp.addEventListener('click', () => {
        resourceTarget = Math.min(250, resourceTarget + 10);
        reconcileResources();
        render();
    });
    elements.populationInput.addEventListener('input', () => {
        elements.populationValue.value = elements.populationInput.value;
    });
    elements.mutationInput.addEventListener('input', () => {
        elements.mutationValue.value = `${elements.mutationInput.value}%`;
    });
    elements.scarcityInput.addEventListener('input', () => {
        const labels = ['Muy baja', 'Baja', 'Normal', 'Alta', 'Extrema'];
        elements.scarcityValue.value = labels[Number(elements.scarcityInput.value) - 1];
    });
    window.addEventListener('resize', resizeCanvas);

    resizeCanvas();
    resetSimulation();
})();
