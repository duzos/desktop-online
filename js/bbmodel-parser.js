/**
 * BBModel Parser and Converter for AIT Generator
 * Converts Blockbench .bbmodel files to Bedrock format
 */

const BBModelParser = (function() {
    'use strict';

    // Known control names from AIT ControlRegistry
    const KNOWN_CONTROLS = [
        'throttle', 'handbrake', 'door_control', 'door_lock', 'antigravs',
        'monitor', 'telepathic_circuit', 'visualiser', 'engine_overload',
        'land_type', 'increment', 'x', 'y', 'z', 'randomiser', 'direction',
        'protocol_813', 'dimension', 'refueler', 'power', 'protocol_1913',
        'alarms', 'save_waypoint', 'load_waypoint', 'console_port',
        'protocol_3', 'shields', 'sonic_port', 'electrical_discharge',
        'protocol_19', 'fast_return', 'protocol_116', 'auto_pilot',
        'cloak', 'hads', 'hail_mary', 'security', 'siege_mode'
    ];

    // Known travel animation names
    const TRAVEL_ANIMATIONS = ['flight', 'demat', 'mat', 'landed', 'idle'];

    // Control name aliases for fuzzy matching
    const CONTROL_ALIASES = {
        'brake': 'handbrake',
        'lever': null, // Context dependent
        'button': null,
        'door': 'door_control',
        'lock': 'door_lock',
        'antigrav': 'antigravs',
        'screen': 'monitor',
        'display': 'monitor',
        'telepathic': 'telepathic_circuit',
        'visualize': 'visualiser',
        'visualizer': 'visualiser',
        'overload': 'engine_overload',
        'engine': 'engine_overload',
        'land': 'land_type',
        'random': 'randomiser',
        'randomize': 'randomiser',
        'randomizer': 'randomiser',
        'dir': 'direction',
        'compass': 'direction',
        'dim': 'dimension',
        'fuel': 'refueler',
        'refuel': 'refueler',
        'waypoint': 'save_waypoint',
        'shield': 'shields',
        'sonic': 'sonic_port',
        'discharge': 'electrical_discharge',
        'electric': 'electrical_discharge',
        'fast': 'fast_return',
        'return': 'fast_return',
        'auto': 'auto_pilot',
        'pilot': 'auto_pilot',
        'clk': 'cloak',
        'security': 'security',
        'siege': 'siege_mode'
    };

    // Pixels per block in Blockbench
    const PIXELS_PER_BLOCK = 16;
    const BLOCK_CENTER = { x: 0, y: 8, z: 0 };

    /**
     * Parse a .bbmodel file
     * @param {string} jsonString - The bbmodel JSON content
     * @returns {Object} - Parsed model data
     */
    function parseBBModel(jsonString) {
        const model = JSON.parse(jsonString);
        return {
            name: model.name || 'unnamed',
            geometry: extractGeometry(model),
            animations: extractAnimations(model),
            groups: extractGroups(model),
            elements: model.elements || [],
            resolution: model.resolution || { width: 64, height: 64 }
        };
    }

    /**
     * Extract geometry in Bedrock format
     */
    function extractGeometry(model) {
        const geo = {
            format_version: "1.12.0",
            "minecraft:geometry": [{
                description: {
                    identifier: `geometry.${model.name || 'custom'}`,
                    texture_width: model.resolution?.width || 64,
                    texture_height: model.resolution?.height || 64,
                    visible_bounds_width: 5,
                    visible_bounds_height: 10.5,
                    visible_bounds_offset: [0, 4.75, 0]
                },
                bones: []
            }]
        };

        // Convert outliner groups to bones
        if (model.outliner) {
            geo["minecraft:geometry"][0].bones = convertOutlinerToBones(model.outliner, model.elements);
        }

        return geo;
    }

    /**
     * Convert outliner structure to Bedrock bones
     * Handles bbmodels with or without a root group
     */
    function convertOutlinerToBones(outliner, elements, parentName = null) {
        const bones = [];

        // Collect any top-level element UUIDs (elements not in any group)
        const topLevelElementUuids = [];

        for (const item of outliner) {
            if (typeof item === 'string') {
                // This is a top-level element UUID - collect it for the root bone
                topLevelElementUuids.push(item);
                continue;
            }

            if (typeof item === 'object' && item.name) {
                const bone = {
                    name: item.name,
                    pivot: item.origin || [0, 0, 0]
                };

                if (parentName) {
                    bone.parent = parentName;
                }

                if (item.rotation && (item.rotation[0] !== 0 || item.rotation[1] !== 0 || item.rotation[2] !== 0)) {
                    bone.rotation = item.rotation;
                }

                // Find cubes belonging to this group
                const cubes = [];
                if (item.children) {
                    for (const child of item.children) {
                        if (typeof child === 'string') {
                            // Find element by UUID
                            const element = elements.find(e => e.uuid === child);
                            if (element && element.type === 'cube') {
                                cubes.push(convertElementToCube(element));
                            }
                        }
                    }
                }

                if (cubes.length > 0) {
                    bone.cubes = cubes;
                }

                bones.push(bone);

                // Process child groups
                if (item.children) {
                    const childBones = convertOutlinerToBones(
                        item.children.filter(c => typeof c === 'object'),
                        elements,
                        item.name
                    );
                    bones.push(...childBones);
                }
            }
        }

        // If we have top-level elements (not in any group), create a root bone for them
        if (topLevelElementUuids.length > 0 && !parentName) {
            const rootCubes = [];
            for (const uuid of topLevelElementUuids) {
                const element = elements.find(e => e.uuid === uuid);
                if (element && element.type === 'cube') {
                    rootCubes.push(convertElementToCube(element));
                }
            }

            if (rootCubes.length > 0) {
                // Insert root bone at the beginning
                bones.unshift({
                    name: 'root',
                    pivot: [0, 0, 0],
                    cubes: rootCubes
                });

                // Make all other top-level bones children of root if they don't have a parent
                for (const bone of bones) {
                    if (bone.name !== 'root' && !bone.parent) {
                        bone.parent = 'root';
                    }
                }
            }
        }

        return bones;
    }

    /**
     * Convert a Blockbench element to a Bedrock cube
     */
    function convertElementToCube(element) {
        const cube = {
            origin: element.from,
            size: [
                element.to[0] - element.from[0],
                element.to[1] - element.from[1],
                element.to[2] - element.from[2]
            ]
        };

        // Add UV if present
        if (element.faces) {
            // Simplified UV handling - use box UV if available
            if (element.box_uv !== false && element.uv_offset) {
                cube.uv = element.uv_offset;
            } else if (element.faces.north) {
                // Use per-face UV
                cube.uv = element.faces.north.uv ?
                    [element.faces.north.uv[0], element.faces.north.uv[1]] : [0, 0];
            }
        }

        if (element.rotation && (element.rotation[0] !== 0 || element.rotation[1] !== 0 || element.rotation[2] !== 0)) {
            cube.rotation = element.rotation;
            cube.pivot = element.origin || element.from;
        }

        return cube;
    }

    /**
     * Extract animations in Bedrock format
     */
    function extractAnimations(model) {
        if (!model.animations || model.animations.length === 0) {
            return null;
        }

        const anims = {
            format_version: "1.8.0",
            animations: {}
        };

        for (const anim of model.animations) {
            const animData = {
                loop: anim.loop === 'loop' ? true : (anim.loop === 'hold' ? 'hold_on_last_frame' : false),
                animation_length: anim.length || 1
            };

            if (anim.animators) {
                animData.bones = {};

                for (const [uuid, animator] of Object.entries(anim.animators)) {
                    // Find bone name by UUID
                    const boneName = findBoneNameByUUID(model.outliner, uuid) || uuid;

                    const boneAnim = {};

                    if (animator.keyframes) {
                        for (const keyframe of animator.keyframes) {
                            const channel = keyframe.channel || 'position';
                            if (!boneAnim[channel]) {
                                boneAnim[channel] = {};
                            }

                            const time = keyframe.time.toString();
                            boneAnim[channel][time] = {
                                post: keyframe.data_points?.[0] ?
                                    [keyframe.data_points[0].x || 0, keyframe.data_points[0].y || 0, keyframe.data_points[0].z || 0] :
                                    [0, 0, 0],
                                lerp_mode: keyframe.interpolation || 'linear'
                            };
                        }
                    }

                    if (Object.keys(boneAnim).length > 0) {
                        animData.bones[boneName] = boneAnim;
                    }
                }
            }

            anims.animations[anim.name] = animData;
        }

        return anims;
    }

    /**
     * Find bone name by UUID in outliner
     */
    function findBoneNameByUUID(outliner, uuid) {
        for (const item of outliner) {
            if (typeof item === 'object') {
                if (item.uuid === uuid) {
                    return item.name;
                }
                if (item.children) {
                    const found = findBoneNameByUUID(item.children, uuid);
                    if (found) return found;
                }
            }
        }
        return null;
    }

    /**
     * Extract groups (bones) for control detection
     */
    function extractGroups(model) {
        const groups = [];

        function processOutliner(items, parent = null) {
            for (const item of items) {
                if (typeof item === 'object' && item.name) {
                    const group = {
                        name: item.name,
                        uuid: item.uuid,
                        origin: item.origin || [0, 0, 0],
                        rotation: item.rotation || [0, 0, 0],
                        parent: parent,
                        children: []
                    };

                    // Get child element UUIDs
                    if (item.children) {
                        for (const child of item.children) {
                            if (typeof child === 'string') {
                                group.children.push(child);
                            }
                        }
                    }

                    groups.push(group);

                    // Process child groups
                    if (item.children) {
                        processOutliner(
                            item.children.filter(c => typeof c === 'object'),
                            item.name
                        );
                    }
                }
            }
        }

        if (model.outliner) {
            processOutliner(model.outliner);
        }

        return groups;
    }

    /**
     * Detect controls from group names
     * @param {Array} groups - List of groups from the model
     * @returns {Array} - Detected controls with their data
     */
    function detectControls(groups, elements) {
        const controls = [];

        for (const group of groups) {
            const controlId = matchControlName(group.name);
            if (controlId) {
                // Calculate bounds for this group
                const groupElements = elements.filter(e => group.children.includes(e.uuid));
                const bounds = calculateGroupBounds(groupElements, group);

                if (bounds) {
                    controls.push({
                        groupName: group.name,
                        controlId: `ait:${controlId}`,
                        width: bounds.width,
                        height: bounds.height,
                        offset: bounds.offset,
                        animation: null // Will be matched later
                    });
                }
            }
        }

        return controls;
    }

    /**
     * Match a group name to a known control
     */
    function matchControlName(name) {
        const nameLower = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Direct match
        if (KNOWN_CONTROLS.includes(nameLower)) {
            return nameLower;
        }

        // Check aliases
        for (const [alias, control] of Object.entries(CONTROL_ALIASES)) {
            if (nameLower.includes(alias) && control) {
                return control;
            }
        }

        // Fuzzy match
        const match = Utils.fuzzyMatch(nameLower, KNOWN_CONTROLS, 2);
        return match;
    }

    /**
     * Calculate bounds for a group of elements
     */
    function calculateGroupBounds(elements, group) {
        if (elements.length === 0) return null;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const element of elements) {
            if (element.type !== 'cube') continue;

            const from = element.from;
            const to = element.to;

            minX = Math.min(minX, from[0], to[0]);
            minY = Math.min(minY, from[1], to[1]);
            minZ = Math.min(minZ, from[2], to[2]);
            maxX = Math.max(maxX, from[0], to[0]);
            maxY = Math.max(maxY, from[1], to[1]);
            maxZ = Math.max(maxZ, from[2], to[2]);
        }

        if (!isFinite(minX)) return null;

        // Calculate dimensions in blocks
        const sizeX = (maxX - minX) / PIXELS_PER_BLOCK;
        const sizeY = (maxY - minY) / PIXELS_PER_BLOCK;
        const sizeZ = (maxZ - minZ) / PIXELS_PER_BLOCK;

        // Calculate offset from block center
        const centerX = (minX + maxX) / 2;
        const centerY = minY; // Bottom of bounding box
        const centerZ = (minZ + maxZ) / 2;

        const offsetX = -(centerX - BLOCK_CENTER.x) / PIXELS_PER_BLOCK;
        const offsetY = (centerY - BLOCK_CENTER.y) / PIXELS_PER_BLOCK;
        const offsetZ = -(centerZ - BLOCK_CENTER.z) / PIXELS_PER_BLOCK;

        return {
            width: Math.max(sizeX, sizeZ),
            height: sizeY,
            offset: [offsetX, offsetY, offsetZ]
        };
    }

    /**
     * Match animations to controls using Levenshtein distance
     * @param {Array} controls - Detected controls
     * @param {Object} animations - Parsed animations
     * @returns {Object} - Control animations and travel animations
     */
    function matchAnimations(controls, animations) {
        if (!animations || !animations.animations) {
            return { controlAnimations: {}, travelAnimations: {} };
        }

        const animNames = Object.keys(animations.animations);
        const controlAnimations = {};
        const travelAnimations = {};

        // First, try to find explicit matches for demat/mat animations (must contain the word)
        const dematMatch = animNames.find(n => {
            const lower = n.toLowerCase();
            return lower.includes('demat') || lower.includes('dematerializ');
        });

        const matMatch = animNames.find(n => {
            const lower = n.toLowerCase();
            return (lower.includes('material') && !lower.includes('demat')) ||
                   (lower === 'mat') ||
                   (lower.includes('_mat') || lower.includes('mat_') || lower.startsWith('mat'));
        });

        // Find flight animation using fuzzy match
        const flightMatch = Utils.fuzzyMatch('flight', animNames, 3);

        // Find other animations with fuzzy match
        const landedMatch = Utils.fuzzyMatch('landed', animNames, 3);
        const idleMatch = Utils.fuzzyMatch('idle', animNames, 3);

        // Assign flight first
        if (flightMatch) travelAnimations.flight = flightMatch;

        // Assign demat - use explicit match, or fallback to whatever was matched for flight
        if (dematMatch) {
            travelAnimations.demat = dematMatch;
        } else if (travelAnimations.flight) {
            travelAnimations.demat = travelAnimations.flight;
        }

        // Assign mat - use explicit match, or fallback to whatever was matched for flight
        if (matMatch) {
            travelAnimations.mat = matMatch;
        } else if (travelAnimations.flight) {
            travelAnimations.mat = travelAnimations.flight;
        }

        if (landedMatch) travelAnimations.landed = landedMatch;
        if (idleMatch) travelAnimations.idle = idleMatch;

        // Match control animations
        for (const control of controls) {
            const groupName = control.groupName.toLowerCase();
            const match = Utils.fuzzyMatch(groupName, animNames, 3);
            if (match) {
                controlAnimations[control.groupName] = match;
                control.animation = match;
            }
        }

        return { controlAnimations, travelAnimations };
    }

    /**
     * Generate console JSON structure
     */
    function generateConsoleJson(namespace, id, controls, travelAnimations, options = {}) {
        const consoleJson = {
            id: `${namespace}:${id}`,
            type: {
                id: `${namespace}:${id}`,
                name: options.name || Utils.formatAndCapitalize(id),
                controls: controls.map(c => ({
                    id: c.controlId,
                    width: c.width,
                    height: c.height,
                    offset: c.offset,
                    ...(c.animation && { animation: `${id}:${c.animation}` })
                }))
            },
            texture: `${namespace}:textures/${id}.png`,
            ...(options.emission && { emission: `${namespace}:textures/${id}_emission.png` }),
            model: `${namespace}:${id}`,
            transformations: options.transformations || {
                offset: [0.5, 0.2, -0.5],
                scale: [1, 1, 1],
                rotation: [0, 0, 0]
            },
            animations: {
                ...(travelAnimations.demat && { demat: `${id}:${travelAnimations.demat}` }),
                ...(travelAnimations.flight && { flight: `${id}:${travelAnimations.flight}` }),
                ...(travelAnimations.mat && { mat: `${id}:${travelAnimations.mat}` }),
                ...(travelAnimations.landed && { landed: `${id}:${travelAnimations.landed}` }),
                ...(travelAnimations.idle && { idle: `${id}:${travelAnimations.idle}` })
            }
        };

        return consoleJson;
    }

    // Public API
    return {
        KNOWN_CONTROLS,
        TRAVEL_ANIMATIONS,

        parseBBModel,
        extractGeometry,
        extractAnimations,
        extractGroups,
        detectControls,
        matchAnimations,
        generateConsoleJson,
        matchControlName,

        /**
         * Process a complete bbmodel file and return all necessary outputs
         */
        async processModel(file, namespace, id, options = {}) {
            const content = await Utils.readFileAsText(file);
            const parsed = parseBBModel(content);

            const geometry = parsed.geometry;
            const animations = parsed.animations;
            const controls = detectControls(parsed.groups, parsed.elements);
            const { controlAnimations, travelAnimations } = matchAnimations(controls, animations);

            // Update controls with matched animations
            for (const control of controls) {
                if (controlAnimations[control.groupName]) {
                    control.animation = controlAnimations[control.groupName];
                }
            }

            const consoleJson = generateConsoleJson(namespace, id, controls, travelAnimations, options);

            return {
                geometry,
                animations,
                controls,
                consoleJson,
                travelAnimations,
                modelName: parsed.name
            };
        }
    };
})();

if (typeof window !== 'undefined') {
    window.BBModelParser = BBModelParser;
}

