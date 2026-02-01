/**
 * Export Module for AIT Generator
 * Generates unified pack.zip with combined datapack and resourcepack
 */

const ExportManager = (function() {
    'use strict';

    /**
     * Generate pack.mcmeta content
     */
    function createMcMeta() {
        return JSON.stringify({
            pack: {
                pack_format: 15,
                description: "Made with duzo's AIT Generator"
            }
        }, null, 2);
    }

    /**
     * Merge multiple language JSON objects
     */
    function mergeLangFiles(langEntries) {
        const merged = {};
        for (const entry of langEntries) {
            Object.assign(merged, entry);
        }
        return JSON.stringify(merged, null, 2);
    }

    /**
     * Process exterior item for export
     */
    function processExterior(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        // Create exterior JSON
        const exteriorJson = {
            watermark: "made with duzos ait generator",
            id: `${namespace}:${data.id}`,
            category: data.category,
            parent: data.parent,
            texture: `${namespace}:textures/exterior/${data.id}.png`
        };

        if (files.emission) {
            exteriorJson.emission = `${namespace}:textures/exterior/${data.id}_emission.png`;
        }

        results.data[`data/${namespace}/exterior/${data.id}.json`] = JSON.stringify(exteriorJson, null, 2);

        // Add texture files
        if (files.texture) {
            results.assets[`assets/${namespace}/textures/exterior/${data.id}.png`] = files.texture;
        }
        if (files.emission) {
            results.assets[`assets/${namespace}/textures/exterior/${data.id}_emission.png`] = files.emission;
        }

        // Add lang entry
        const langKey = `exterior.${namespace}.${data.id}`;
        results.lang[langKey] = data.name || Utils.formatAndCapitalize(data.id);

        return results;
    }

    /**
     * Process exterior model item for export (full custom exterior with model and door)
     */
    function processExteriorModel(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        // Regenerate exterior JSON with current namespace
        const exteriorJson = {
            watermark: "made with duzos ait generator",
            id: `${namespace}:${data.id}`,
            category: data.category,
            parent: data.parent,
            texture: `${namespace}:textures/${data.id}.png`,
            model: `${namespace}:${data.id}`,
            door: `${namespace}:${data.id}`,
            left_animation: `${data.id}:${data.leftAnimation || 'open_left'}`,
            right_animation: `${data.id}:${data.rightAnimation || 'open_right'}`
        };

        if (files.emission) {
            exteriorJson.emission = `${namespace}:textures/${data.id}_emission.png`;
        }

        results.data[`data/${namespace}/exterior/${data.id}.json`] = JSON.stringify(exteriorJson, null, 2);

        // Regenerate door JSON with current namespace
        const doorJson = {
            watermark: "made with duzos ait generator",
            id: `${namespace}:${data.id}`,
            model: `${namespace}:${data.id}_door`,
            is_double: data.isDoubleDoor !== false,
            open_sound: data.openSound || 'ait:tardis/police_box_door_open',
            close_sound: data.closeSound || 'ait:tardis/police_box_door_close',
            left_animation: `${data.id}:${data.leftAnimation || 'open_left'}`,
            right_animation: `${data.id}:${data.rightAnimation || 'open_right'}`,
            offset: [
                parseFloat(data.doorOffsetX) || 0,
                parseFloat(data.doorOffsetY) || 2.5,
                parseFloat(data.doorOffsetZ) || -1
            ]
        };
        results.data[`data/${namespace}/door/${data.id}.json`] = JSON.stringify(doorJson, null, 2);

        // Exterior geometry file
        if (data.exteriorGeo) {
            results.assets[`assets/${namespace}/bedrock/${data.id}.geo.json`] = JSON.stringify(data.exteriorGeo, null, 2);
        } else if (files.exteriorGeo) {
            results.assets[`assets/${namespace}/bedrock/${data.id}.geo.json`] = files.exteriorGeo;
        }

        // Door geometry file
        if (data.doorGeo) {
            results.assets[`assets/${namespace}/bedrock/${data.id}_door.geo.json`] = JSON.stringify(data.doorGeo, null, 2);
        } else if (files.doorGeo) {
            results.assets[`assets/${namespace}/bedrock/${data.id}_door.geo.json`] = files.doorGeo;
        }

        // Door animations file
        if (data.doorAnimations) {
            results.assets[`assets/${namespace}/bedrock/${data.id}.animation.json`] = JSON.stringify(data.doorAnimations, null, 2);
        } else if (files.doorAnimations) {
            results.assets[`assets/${namespace}/bedrock/${data.id}.animation.json`] = files.doorAnimations;
        }

        // Textures
        if (files.texture) {
            results.assets[`assets/${namespace}/textures/${data.id}.png`] = files.texture;
        }
        if (files.emission) {
            results.assets[`assets/${namespace}/textures/${data.id}_emission.png`] = files.emission;
        }

        // Lang entry
        const langKey = `exterior.${namespace}.${data.id}`;
        results.lang[langKey] = data.name || Utils.formatAndCapitalize(data.id);

        return results;
    }

    /**
     * Process interior/desktop item for export
     */
    function processInterior(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        // Create desktop JSON
        const desktopJson = {
            watermark: "made with duzos ait generator",
            id: `${namespace}:${data.id}`
        };

        results.data[`data/${namespace}/desktop/${data.id}.json`] = JSON.stringify(desktopJson, null, 2);

        // Add structure file
        if (files.structure) {
            results.data[`data/${namespace}/structures/interiors/${data.id}.nbt`] = files.structure;
        }

        // Add preview image
        if (files.preview) {
            results.assets[`assets/${namespace}/textures/desktop/${data.id}.png`] = files.preview;
        }

        // Add lang entry
        const langKey = `desktop.${namespace}.${data.id}`;
        results.lang[langKey] = data.name || Utils.formatAndCapitalize(data.id);

        return results;
    }

    /**
     * Process category item for export
     */
    function processCategory(item, namespace) {
        const data = item.data;
        const results = { data: {}, assets: {}, lang: {} };

        const categoryJson = {
            id: `${namespace}:${data.id}`,
            name: data.name || Utils.formatAndCapitalize(data.id)
        };

        results.data[`data/${namespace}/categories/${data.id}.json`] = JSON.stringify(categoryJson, null, 2);

        return results;
    }

    /**
     * Process console variant item for export
     */
    function processConsoleVariant(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        const consoleJson = {
            watermark: "made with duzos ait generator",
            id: `${namespace}:${data.id}`,
            parent: data.parent,
            texture: `${namespace}:textures/blockentites/consoles/${data.id}.png`
        };

        if (files.emission) {
            consoleJson.emission = `${namespace}:textures/blockentites/consoles/${data.id}_emission.png`;
        }

        results.data[`data/${namespace}/console/${data.id}.json`] = JSON.stringify(consoleJson, null, 2);

        if (files.texture) {
            results.assets[`assets/${namespace}/textures/blockentites/consoles/${data.id}.png`] = files.texture;
        }
        if (files.emission) {
            results.assets[`assets/${namespace}/textures/blockentites/consoles/${data.id}_emission.png`] = files.emission;
        }

        const langKey = `console.${namespace}.${data.id}`;
        results.lang[langKey] = data.name || Utils.formatAndCapitalize(data.id);

        return results;
    }

    /**
     * Process console model item for export
     */
    function processConsoleModel(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        // Regenerate console JSON with current namespace
        const consoleJson = {
            watermark: "made with duzos ait generator",
            id: `${namespace}:${data.id}`,
            type: {
                id: `${namespace}:${data.id}`,
                name: data.name || Utils.formatAndCapitalize(data.id),
                controls: (data.controls || []).map(c => ({
                    ...c,
                    // Update animation namespace if it has one
                    animation: c.animation ? `${data.id}:${c.animation.split(':').pop()}` : undefined
                }))
            },
            texture: `${namespace}:textures/${data.id}.png`,
            model: `${namespace}:${data.id}`,
            transformations: data.transformations || {
                offset: [0.5, 0.2, -0.5],
                scale: [1, 1, 1],
                rotation: [0, 0, 0]
            },
            animations: {}
        };

        // Add emission if present
        if (files.emission) {
            consoleJson.emission = `${namespace}:textures/${data.id}_emission.png`;
        }

        // Add travel animations with updated namespace
        if (data.travelAnimations) {
            for (const [key, value] of Object.entries(data.travelAnimations)) {
                if (value) {
                    // Extract animation name and use current id as namespace
                    const animName = value.split(':').pop();
                    consoleJson.animations[key] = `${data.id}:${animName}`;
                }
            }
        }

        results.data[`data/${namespace}/console/${data.id}.json`] = JSON.stringify(consoleJson, null, 2);

        // Geometry file
        if (data.geometry || files.geometry) {
            const geoContent = data.geometry ? JSON.stringify(data.geometry, null, 2) : files.geometry;
            results.assets[`assets/${namespace}/bedrock/${data.id}.geo.json`] = geoContent;
        }

        // Animation file
        if (data.animations || files.animations) {
            const animContent = data.animations ? JSON.stringify(data.animations, null, 2) : files.animations;
            results.assets[`assets/${namespace}/bedrock/${data.id}.animation.json`] = animContent;
        }

        // Textures
        if (files.texture) {
            results.assets[`assets/${namespace}/textures/${data.id}.png`] = files.texture;
        }
        if (files.emission) {
            results.assets[`assets/${namespace}/textures/${data.id}_emission.png`] = files.emission;
        }

        const langKey = `console.${namespace}.${data.id}`;
        results.lang[langKey] = data.name || Utils.formatAndCapitalize(data.id);

        return results;
    }

    /**
     * Process hum item for export
     */
    function processHum(item, namespace) {
        const data = item.data;
        const results = { data: {}, assets: {}, lang: {} };

        const humJson = {
            id: `${namespace}:${data.id}`,
            sound: {
                sound_id: data.soundId
            }
        };

        results.data[`data/${namespace}/hum/${data.id}.json`] = JSON.stringify(humJson, null, 2);

        return results;
    }

    /**
     * Process sonic item for export
     */
    function processSonic(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        // State names for sonic
        const states = ['inactive', 'interaction', 'overload', 'scanning', 'tardis'];

        const sonicJson = {
            id: `${namespace}:${data.id}`,
            models: {
                inactive: `${namespace}:item/sonic/${data.id}/inactive`,
                interaction: `${namespace}:item/sonic/${data.id}/interaction`,
                overload: `${namespace}:item/sonic/${data.id}/overload`,
                scanning: `${namespace}:item/sonic/${data.id}/scanning`,
                tardis: `${namespace}:item/sonic/${data.id}/tardis`
            },
            loyalty: {
                type: data.loyalty || 'NEUTRAL'
            }
        };

        results.data[`data/${namespace}/sonic/${data.id}.json`] = JSON.stringify(sonicJson, null, 2);

        // Add base model file if provided
        if (files.model) {
            results.assets[`assets/${namespace}/models/item/sonic/${data.id}.json`] = files.model;
        }

        // Create state-specific model files that reference the base model
        // and add state-specific textures
        for (const state of states) {
            const textureKey = `texture${state.charAt(0).toUpperCase() + state.slice(1)}`;
            const hasTexture = files[textureKey];

            // Create state model JSON that references the parent model
            const stateModelJson = {
                parent: `${namespace}:item/sonic/${data.id}`,
                textures: {
                    "0": `${namespace}:item/sonic_tools/${data.id}_${state}`
                }
            };

            results.assets[`assets/${namespace}/models/item/sonic/${data.id}/${state}.json`] =
                JSON.stringify(stateModelJson, null, 2);

            // Add state-specific texture if provided
            if (hasTexture) {
                results.assets[`assets/${namespace}/textures/item/sonic_tools/${data.id}_${state}.png`] = hasTexture;
            }
        }

        const langKey = `sonic.${namespace}.${data.id}`;
        results.lang[langKey] = data.name || Utils.formatAndCapitalize(data.id);

        return results;
    }

    /**
     * Process vortex item for export
     */
    function processVortex(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        const vortexJson = {
            id: `${namespace}:${data.id}`,
            texture: `${namespace}:textures/vortex/${data.id}.png`
        };

        results.data[`data/${namespace}/fx/vortex/${data.id}.json`] = JSON.stringify(vortexJson, null, 2);

        if (files.texture) {
            results.assets[`assets/${namespace}/textures/vortex/${data.id}.png`] = files.texture;
        }
        if (files.textureSecond) {
            results.assets[`assets/${namespace}/textures/vortex/${data.id}_second.png`] = files.textureSecond;
        }
        if (files.textureThird) {
            results.assets[`assets/${namespace}/textures/vortex/${data.id}_third.png`] = files.textureThird;
        }

        return results;
    }

    /**
     * Process planet item for export
     */
    function processPlanet(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        const planetJson = {
            dimension: data.dimension,
            gravity: parseFloat(data.gravity) || 0,
            has_oxygen: data.hasOxygen !== false,
            has_landable_surface: data.hasLandableSurface !== false,
            temperature: parseInt(data.temperature) || 288,
            render: {
                texture: `${namespace}:textures/environment/${data.id}.png`,
                position: data.position || [9000, 76, -8000],
                scale: data.scale || [1200, 1200, 1200],
                rotation: data.rotation || [-22.5, 45, 0],
                clouds: data.clouds !== false,
                atmosphere: data.atmosphere !== false,
                color: data.color || [0.18, 0.35, 0.60],
                radius: parseInt(data.radius) || 1400,
                suction_radius: parseInt(data.suctionRadius) || 900,
                has_rings: data.hasRings === true
            },
            transition: {
                target: data.transitionTarget || 'ait:space',
                height: parseInt(data.transitionHeight) || 600
            }
        };

        results.data[`data/${namespace}/planet/${data.id}.json`] = JSON.stringify(planetJson, null, 2);

        if (files.texture) {
            results.assets[`assets/${namespace}/textures/environment/${data.id}.png`] = files.texture;
        }

        return results;
    }

    /**
     * Process fabricator recipe item for export
     */
    function processFabricator(item, namespace) {
        const data = item.data;
        const results = { data: {}, assets: {}, lang: {} };

        const blueprintJson = {
            output: {
                id: data.outputId,
                Count: parseInt(data.outputCount) || 1
            },
            inputs: (data.inputs || []).map(input => ({
                item: input.item,
                maxCount: parseInt(input.maxCount) || 1,
                minCount: parseInt(input.minCount) || 1
            }))
        };

        results.data[`data/${namespace}/blueprint/${data.id}.json`] = JSON.stringify(blueprintJson, null, 2);

        return results;
    }

    /**
     * Process flight sound item for export
     */
    function processFlightSound(item, namespace) {
        const data = item.data;
        const results = { data: {}, assets: {}, lang: {} };

        const flightJson = {
            id: `${namespace}:${data.id}`,
            sound: data.soundId,
            length: parseInt(data.length) || 10
        };

        results.data[`data/${namespace}/fx/flight/${data.id}.json`] = JSON.stringify(flightJson, null, 2);

        return results;
    }

    /**
     * Process mug/drink item for export
     */
    function processMug(item, namespace) {
        const data = item.data;
        const results = { data: {}, assets: {}, lang: {} };

        const drinkJson = {
            id: `${namespace}:${data.id}`,
            has_custom_color: data.hasCustomColor === true,
            custom_color: data.customColor || [0.5, 0.5, 0.5],
            potion_instances: (data.potions || []).map(p => ({
                id: p.id,
                duration: parseInt(p.duration) || 200,
                amplifier: parseInt(p.amplifier) || 0,
                ambient: p.ambient === true,
                show_particles: p.showParticles !== false,
                show_icon: p.showIcon !== false
            }))
        };

        results.data[`data/${namespace}/drink/effect/${data.id}.json`] = JSON.stringify(drinkJson, null, 2);

        return results;
    }

    /**
     * Process unlockable dimension item for export
     */
    function processUnlockableDimension(item, namespace) {
        const data = item.data;
        const results = { data: {}, assets: {}, lang: {} };

        // Build the stack codec from itemId and itemCount
        const stack = {
            id: data.itemId,
            count: parseInt(data.itemCount) || 1
        };

        const dimJson = {
            dimension: data.dimension,
            stack: stack
        };

        results.data[`data/${namespace}/locked_dimension/${data.id}.json`] = JSON.stringify(dimJson, null, 2);

        return results;
    }

    /**
     * Process exterior animation item for export
     */
    function processExteriorAnimation(item, namespace) {
        const data = item.data;
        const files = item.files || {};
        const results = { data: {}, assets: {}, lang: {} };

        const animTypeJson = {
            id: `${namespace}:${data.id}`,
            expected_state: data.expectedState || 'demat',
            sound: data.soundId
        };

        results.data[`data/${namespace}/fx/animation/type/${data.id}.json`] = JSON.stringify(animTypeJson, null, 2);

        if (files.keyframes) {
            results.data[`data/${namespace}/fx/animation/keyframes/${data.id}.json`] = files.keyframes;
        }

        return results;
    }

    /**
     * Export the entire pack stack as a single zip
     */
    async function exportPack() {
        const namespace = SharedState.getNamespace();
        if (!namespace) {
            Utils.showToast('Please set a namespace first!', 'error');
            return;
        }

        const stack = SharedState.getStack();
        if (stack.length === 0) {
            Utils.showToast('No items in pack to export!', 'error');
            return;
        }

        const zip = new JSZip();
        const allLang = {};

        // Add pack.mcmeta
        zip.file('pack.mcmeta', createMcMeta());

        // Process each item in the stack
        for (const item of stack) {
            let processed = { data: {}, assets: {}, lang: {} };

            switch (item.type) {
                case 'exterior':
                    processed = processExterior(item, namespace);
                    break;
                case 'exterior-model':
                    processed = processExteriorModel(item, namespace);
                    break;
                case 'interior':
                    processed = processInterior(item, namespace);
                    break;
                case 'category':
                    processed = processCategory(item, namespace);
                    break;
                case 'console-variant':
                    processed = processConsoleVariant(item, namespace);
                    break;
                case 'console-model':
                    processed = processConsoleModel(item, namespace);
                    break;
                case 'hum':
                    processed = processHum(item, namespace);
                    break;
                case 'sonic':
                    processed = processSonic(item, namespace);
                    break;
                case 'vortex':
                    processed = processVortex(item, namespace);
                    break;
                case 'planet':
                    processed = processPlanet(item, namespace);
                    break;
                case 'fabricator':
                    processed = processFabricator(item, namespace);
                    break;
                case 'flight-sound':
                    processed = processFlightSound(item, namespace);
                    break;
                case 'mug':
                    processed = processMug(item, namespace);
                    break;
                case 'unlockable-dimension':
                    processed = processUnlockableDimension(item, namespace);
                    break;
                case 'exterior-animation':
                    processed = processExteriorAnimation(item, namespace);
                    break;
            }

            // Add data files
            for (const [path, content] of Object.entries(processed.data)) {
                if (content instanceof File || content instanceof Blob) {
                    zip.file(path, content);
                } else {
                    zip.file(path, content);
                }
            }

            // Add asset files
            for (const [path, content] of Object.entries(processed.assets)) {
                if (content instanceof File || content instanceof Blob) {
                    zip.file(path, content);
                } else if (typeof content === 'string') {
                    zip.file(path, content);
                }
            }

            // Merge lang entries
            Object.assign(allLang, processed.lang);
        }

        // Add merged lang file
        if (Object.keys(allLang).length > 0) {
            zip.file(`assets/${namespace}/lang/en_us.json`, JSON.stringify(allLang, null, 2));
        }

        // Generate and download
        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, `${namespace}_pack.zip`);
            Utils.showToast('Pack exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showToast('Failed to export pack: ' + error.message, 'error');
        }
    }

    return {
        exportPack,
        createMcMeta,
        mergeLangFiles
    };
})();

if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
}

