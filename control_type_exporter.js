/**
 * Blockbench Plugin: Control Type Exporter
 * Converts selected cubes/groups to ControlType definitions for Minecraft NeoForge mods.
 * 
 * ControlTypes(Control control, EntityDimensions scaling, Vector3f offset)
 * - scaling: width (larger of X/Z) and height from cube dimensions
 * - offset: position relative to block center
 * 
 * In-game calculation:
 *   Vector3f position = current.toCenterPos().toVector3f().add(offset)
 *   // where current is a BlockPos, toCenterPos() adds 0.5 to each coordinate
 */

(function() {
    'use strict';

    const PLUGIN_ID = 'control_type_exporter';
    const PLUGIN_NAME = 'Control Type Exporter';
    const PLUGIN_AUTHOR = 'duzo';
    const PLUGIN_VERSION = '1.3.1';
    const PLUGIN_DESCRIPTION = 'Export your model groups as ControlType definitions for your AIT datapacks!\n Simply name the group the name of a control in AIT (see https://github.com/amblelabs/ait/blob/main/src/main/java/dev/amble/ait/registry/impl/ControlRegistry.java)\n and press Tools > (Quick) Export as Control Type.\n The generated JSON or Java code can then be used in your mod or datapack.';

    // Blockbench uses 16 pixels = 1 block
    const PIXELS_PER_BLOCK = 16;
    
    // Block center in Blockbench coordinates
    const BLOCK_CENTER = { x: 0, y: 8, z: 0 };

    let exportAction;
    let exportDialog;

    /**
     * Calculate cube dimensions and bottom-center from Blockbench cube
     * Uses bottom-center because Minecraft entities spawn at a position
     * and their AABB extends upward from there
     */
    function getCubeInfo(cube) {
        const from = cube.from;
        const to = cube.to;

        // Dimensions in pixels
        const sizeX = Math.abs(to[0] - from[0]);
        const sizeY = Math.abs(to[1] - from[1]);
        const sizeZ = Math.abs(to[2] - from[2]);

        // Bottom-center position in pixels
        // X/Z = geometric center, Y = bottom of cube
        const centerX = (from[0] + to[0]) / 2;
        const bottomY = Math.min(from[1], to[1]);  // Bottom, not center!
        const centerZ = (from[2] + to[2]) / 2;

        return {
            dimensions: { x: sizeX, y: sizeY, z: sizeZ },
            center: { x: centerX, y: bottomY, z: centerZ }
        };
    }

    /**
     * Rotate a point around a pivot using Euler angles (in degrees)
     * Rotation order: ZYX (Blockbench/Bedrock standard)
     */
    function rotatePoint(point, pivot, rotation) {
        if (!rotation || (rotation[0] === 0 && rotation[1] === 0 && rotation[2] === 0)) {
            return point;
        }

        // Translate point to pivot origin
        let x = point.x - pivot.x;
        let y = point.y - pivot.y;
        let z = point.z - pivot.z;

        // Convert degrees to radians
        const rx = rotation[0] * Math.PI / 180;
        const ry = rotation[1] * Math.PI / 180;
        const rz = rotation[2] * Math.PI / 180;

        // Rotation matrices (applied in ZYX order)
        // Rotate around Z
        if (rz !== 0) {
            const cosZ = Math.cos(rz);
            const sinZ = Math.sin(rz);
            const newX = x * cosZ - y * sinZ;
            const newY = x * sinZ + y * cosZ;
            x = newX;
            y = newY;
        }

        // Rotate around Y
        if (ry !== 0) {
            const cosY = Math.cos(ry);
            const sinY = Math.sin(ry);
            const newX = x * cosY + z * sinY;
            const newZ = -x * sinY + z * cosY;
            x = newX;
            z = newZ;
        }

        // Rotate around X
        if (rx !== 0) {
            const cosX = Math.cos(rx);
            const sinX = Math.sin(rx);
            const newY = y * cosX - z * sinX;
            const newZ = y * sinX + z * cosX;
            y = newY;
            z = newZ;
        }

        // Translate back from pivot origin
        return {
            x: x + pivot.x,
            y: y + pivot.y,
            z: z + pivot.z
        };
    }

    /**
     * Get all 8 corners of a cube
     */
    function getCubeCorners(cube) {
        const from = cube.from;
        const to = cube.to;
        return [
            { x: from[0], y: from[1], z: from[2] },
            { x: from[0], y: from[1], z: to[2] },
            { x: from[0], y: to[1], z: from[2] },
            { x: from[0], y: to[1], z: to[2] },
            { x: to[0], y: from[1], z: from[2] },
            { x: to[0], y: from[1], z: to[2] },
            { x: to[0], y: to[1], z: from[2] },
            { x: to[0], y: to[1], z: to[2] }
        ];
    }

    /**
     * Collect all parent transforms from a group up to root.
     * Returns an array of { pivot, rotation } objects, ordered from
     * innermost (the group itself) to outermost (top-level parent).
     * This order is important: we apply inner rotations first, then outer ones.
     */
    function collectParentTransforms(group) {
        const transforms = [];
        let current = group;
        
        while (current && current.type === 'group') {
            const pivot = current.origin ? 
                { x: current.origin[0], y: current.origin[1], z: current.origin[2] } : 
                { x: 0, y: 0, z: 0 };
            const rotation = current.rotation ? 
                [current.rotation[0] || 0, current.rotation[1] || 0, current.rotation[2] || 0] : 
                [0, 0, 0];
            
            const hasRotation = rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0;
            
            if (hasRotation) {
                transforms.push({ pivot, rotation });
            }
            
            current = current.parent;
        }
        
        return transforms;
    }

    /**
     * Apply a chain of transforms (from innermost to outermost) to a point.
     */
    function applyTransformChain(point, transforms) {
        let result = { ...point };
        
        for (const transform of transforms) {
            result = rotatePoint(result, transform.pivot, transform.rotation);
        }
        
        return result;
    }

    /**
     * Get a string showing the parent chain names for debugging
     */
    function getParentChainNames(group) {
        const names = [];
        let current = group;
        
        while (current && current.type === 'group') {
            const rotation = current.rotation ? 
                `[${current.rotation[0] || 0}, ${current.rotation[1] || 0}, ${current.rotation[2] || 0}]` : 
                '[0, 0, 0]';
            names.push(`${current.name || 'unnamed'}(rot: ${rotation})`);
            current = current.parent;
        }
        
        return names.join(' -> ');
    }

    /**
     * Calculate bounding box for a group of cubes, accounting for group rotation
     * AND all parent group rotations in the hierarchy.
     * Uses the GEOMETRIC CENTER of the bounding box for offset calculation.
     * 
     * For the hitbox to align with the visual model, you should center the group's
     * pivot at: X/Z = horizontal center of cubes, Y = bottom of cubes.
     */
    function getGroupBounds(elements, group) {
        if (elements.length === 0) return null;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        // Collect all transforms from this group up through parent hierarchy
        // This includes the group itself and all its parents with rotations
        const parentTransforms = collectParentTransforms(group);
        
        console.log('Group:', group ? group.name : 'none');
        console.log('Parent transforms:', parentTransforms.map(t => ({
            pivot: t.pivot,
            rotation: t.rotation
        })));

        elements.forEach(cube => {
            if (cube.type !== 'cube') return;
            
            // Get all 8 corners of the cube
            let corners = getCubeCorners(cube);
            
            // First, apply cube's own rotation if it has one
            // In Blockbench: cube.origin is the rotation pivot point
            if (cube.rotation && (cube.rotation[0] !== 0 || cube.rotation[1] !== 0 || cube.rotation[2] !== 0)) {
                // Cube's rotation pivot priority:
                // 1. cube.origin - Blockbench's primary rotation pivot property
                // 2. cube.rotation_origin - alternative property name
                // 3. Fallback to cube's geometric center
                let cubePivot;
                if (cube.origin && Array.isArray(cube.origin)) {
                    cubePivot = { x: cube.origin[0], y: cube.origin[1], z: cube.origin[2] };
                } else if (cube.rotation_origin) {
                    cubePivot = { x: cube.rotation_origin[0], y: cube.rotation_origin[1], z: cube.rotation_origin[2] };
                } else {
                    // Fallback to geometric center of the cube
                    cubePivot = { 
                        x: (cube.from[0] + cube.to[0]) / 2, 
                        y: (cube.from[1] + cube.to[1]) / 2, 
                        z: (cube.from[2] + cube.to[2]) / 2 
                    };
                }
                
                console.log('Cube rotation:', cube.rotation, 'pivot:', cubePivot);
                corners = corners.map(corner => rotatePoint(corner, cubePivot, cube.rotation));
            }
            
            // Then apply all group rotations (from innermost group to outermost parent)
            if (parentTransforms.length > 0) {
                corners = corners.map(corner => applyTransformChain(corner, parentTransforms));
            }
            
            // Update bounds with transformed corners
            corners.forEach(corner => {
                minX = Math.min(minX, corner.x);
                minY = Math.min(minY, corner.y);
                minZ = Math.min(minZ, corner.z);
                maxX = Math.max(maxX, corner.x);
                maxY = Math.max(maxY, corner.y);
                maxZ = Math.max(maxZ, corner.z);
            });
        });

        if (!isFinite(minX)) return null;

        // Calculate geometric center from actual bounding box
        // X/Z = horizontal center of bounding box
        // Y = bottom of bounding box (entities spawn at bottom, AABB extends upward)
        return {
            dimensions: { 
                x: maxX - minX, 
                y: maxY - minY, 
                z: maxZ - minZ 
            },
            center: { 
                x: (minX + maxX) / 2,  // Horizontal center
                y: minY,                // Bottom of bounding box
                z: (minZ + maxZ) / 2   // Horizontal center
            }
        };
    }

    /**
     * Convert Blockbench coordinates to Minecraft offset
     * Block center in Blockbench is (8, 8, 8)
     * In Minecraft, BlockPos.toCenterPos() gives (x+0.5, y+0.5, z+0.5)
     */
    function calculateOffset(cubeCenter, blockOrigin) {
        // Offset from block center in pixels
        const offsetPixelsX = cubeCenter.x - (blockOrigin.x + BLOCK_CENTER.x);
        const offsetPixelsY = cubeCenter.y - (blockOrigin.y + BLOCK_CENTER.y);
        const offsetPixelsZ = cubeCenter.z - (blockOrigin.z + BLOCK_CENTER.z);

        // Rotate 180 degs about centre (invert X and Z)
        // Translate to origin
        
        // Convert to blocks (16 pixels = 1 block)
        return {
            x: -offsetPixelsX / PIXELS_PER_BLOCK,
            y: offsetPixelsY / PIXELS_PER_BLOCK,
            z: -offsetPixelsZ / PIXELS_PER_BLOCK
        };
    }

    /**
     * Convert dimensions to EntityDimensions (width = max(x, z), height = y)
     */
    function calculateEntityDimensions(dimensions) {
        // Convert from pixels to blocks
        const widthBlocks = Math.max(dimensions.x, dimensions.z) / PIXELS_PER_BLOCK;
        const heightBlocks = dimensions.y / PIXELS_PER_BLOCK;

        return {
            width: widthBlocks,
            height: heightBlocks
        };
    }

    /**
     * Format a float to a reasonable precision
     */
    function formatFloat(value) {
        // Round to 4 decimal places
        const rounded = Math.round(value * 10000) / 10000;
        // Add 'f' suffix if it's a non-integer
        if (Number.isInteger(rounded)) {
            return rounded + '.0f';
        }
        return rounded + 'f';
    }

    /**
     * Generate Java code for ControlTypes
     */
    function generateControlTypeCode(name, entityDimensions, offset) {
        const code = `new ControlTypes(
    Control.${name.toUpperCase()},
    EntityDimensions.scalable(${formatFloat(entityDimensions.width)}, ${formatFloat(entityDimensions.height)}),
    new Vector3f(${formatFloat(offset.x)}, ${formatFloat(offset.y)}, ${formatFloat(offset.z)})
)`;
        return code;
    }

    /**
     * Generate alternative simpler format
     */
    function generateSimpleFormat(name, entityDimensions, offset) {
        return `// ${name}
// Scale: width=${formatFloat(entityDimensions.width)}, height=${formatFloat(entityDimensions.height)}
// Offset: (${formatFloat(offset.x)}, ${formatFloat(offset.y)}, ${formatFloat(offset.z)})
EntityDimensions.scalable(${formatFloat(entityDimensions.width)}, ${formatFloat(entityDimensions.height)})
new Vector3f(${formatFloat(offset.x)}, ${formatFloat(offset.y)}, ${formatFloat(offset.z)})`;
    }

    /**
     * Process selection and generate output
     */
    function processSelection(blockOriginX, blockOriginY, blockOriginZ) {
        const selected = Outliner.selected.slice();
        
        if (selected.length === 0) {
            Blockbench.showQuickMessage('No cubes or groups selected!', 2000);
            return null;
        }

        const blockOrigin = { 
            x: parseFloat(blockOriginX) || 0, 
            y: parseFloat(blockOriginY) || 0, 
            z: parseFloat(blockOriginZ) || 0 
        };

        const results = [];
        const processedGroups = new Set(); // Track processed groups to avoid duplicates

        selected.forEach(element => {
            let info;
            let name;
            let group;

            console.log('Element type:', element.type);

            if (element.type === 'group') {
                group = element;
            } else if (element.type === 'cube') {
                // Find the parent group of this cube
                group = element.parent;
                if (!group || group.type !== 'group') {
                    // Cube has no parent group, skip it
                    console.log('Cube has no parent group, skipping');
                    return;
                }
            } else {
                return;
            }

            // Skip if we've already processed this group
            if (processedGroups.has(group.uuid)) {
                return;
            }
            processedGroups.add(group.uuid);

            // Get all cubes in the group
            const cubes = group.children.filter(child => child.type === 'cube');
            if (cubes.length === 0) return;
            
            info = getGroupBounds(cubes, group);
            name = group.name || 'UNNAMED_GROUP';

            console.log('Processing group:', name);
            console.log('Group origin (pivot):', group.origin);
            console.log('Group rotation:', group.rotation);
            console.log('Parent chain:', getParentChainNames(group));
            console.log('Calculated bounds:', info);

            if (!info) return;

            const entityDimensions = calculateEntityDimensions(info.dimensions);
            const offset = calculateOffset(info.center, blockOrigin);

            results.push({
                name: name,
                entityDimensions: entityDimensions,
                offset: offset,
                rawDimensions: info.dimensions,
                rawCenter: info.center
            });
        });

        return results;
    }

    /**
     * Generate JSON format matching the required structure
     */
    function generateJsonFormat(name, namespace, entityDimensions, offset) {
        const controlId = name.toLowerCase().replace(/\s+/g, '_');
        return {
            id: `${namespace}:${controlId}`,
            width: entityDimensions.width,
            height: entityDimensions.height,
            offset: [offset.x, offset.y, offset.z]
        };
    }

    /**
     * Show the export dialog
     */
    function showExportDialog() {
        if (exportDialog) {
            exportDialog.show();
            return;
        }

        exportDialog = new Dialog({
            id: 'control_type_export_dialog',
            title: 'Export Control Types',
            width: 600,
            form: {
                namespace: {
                    label: 'Namespace',
                    type: 'text',
                    value: 'ait',
                    description: 'The mod namespace for the control ID (e.g., "ait" for "ait:handbrake")'
                },
                block_origin_x: {
                    label: 'Block Origin X',
                    type: 'number',
                    value: 0,
                    description: 'X coordinate of the block origin in Blockbench (usually 0)'
                },
                block_origin_y: {
                    label: 'Block Origin Y', 
                    type: 'number',
                    value: 0,
                    description: 'Y coordinate of the block origin in Blockbench (usually 0)'
                },
                block_origin_z: {
                    label: 'Block Origin Z',
                    type: 'number', 
                    value: 0,
                    description: 'Z coordinate of the block origin in Blockbench (usually 0)'
                },
                output_format: {
                    label: 'Output Format',
                    type: 'select',
                    options: {
                        json: 'JSON Format',
                        full: 'Full ControlTypes Constructor',
                        simple: 'Simple Format (Copy-Paste)'
                    },
                    value: 'json'
                }
            },
            buttons: ['Export', 'Cancel'],
            onConfirm(formData) {
                const results = processSelection(
                    formData.block_origin_x,
                    formData.block_origin_y, 
                    formData.block_origin_z
                );

                if (!results || results.length === 0) {
                    Blockbench.showQuickMessage('No valid elements to export!', 2000);
                    return;
                }

                const namespace = formData.namespace || 'ait';
                let output = '';

                if (formData.output_format === 'json') {
                    // Generate array of JSON objects
                    const jsonArray = results.map(result => 
                        generateJsonFormat(
                            result.name,
                            namespace,
                            result.entityDimensions,
                            result.offset
                        )
                    );
                    
                    // Output as JSON array if multiple, or single object if one
                    if (jsonArray.length === 1) {
                        output = JSON.stringify(jsonArray[0], null, 2);
                    } else {
                        output = JSON.stringify(jsonArray, null, 2);
                    }
                } else {
                    results.forEach((result, index) => {
                        if (formData.output_format === 'full') {
                            output += generateControlTypeCode(
                                result.name,
                                result.entityDimensions,
                                result.offset
                            );
                        } else if (formData.output_format === 'simple') {
                            output += generateSimpleFormat(
                                result.name,
                                result.entityDimensions,
                                result.offset
                            );
                        }

                        if (index < results.length - 1) {
                            output += '\n\n';
                        }
                    });
                }

                // Show result dialog with copy button
                showResultDialog(output);
            }
        });

        exportDialog.show();
    }

    /**
     * Show the result dialog with the generated code
     */
    function showResultDialog(output) {
        const resultDialog = new Dialog({
            id: 'control_type_result_dialog',
            title: 'Generated Control Types',
            width: 700,
            lines: [
                '<style>',
                '#control_type_output { width: 100%; height: 300px; font-family: monospace; font-size: 12px; resize: vertical; }',
                '</style>',
                '<textarea id="control_type_output" readonly>' + output.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>'
            ],
            buttons: ['Copy to Clipboard', 'Close'],
            onConfirm() {
                // Copy to clipboard
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(output).then(() => {
                        Blockbench.showQuickMessage('Copied to clipboard!', 2000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                        Blockbench.showQuickMessage('Failed to copy to clipboard', 2000);
                    });
                } else {
                    // Fallback for older browsers
                    const textarea = document.getElementById('control_type_output');
                    if (textarea) {
                        textarea.select();
                        document.execCommand('copy');
                        Blockbench.showQuickMessage('Copied to clipboard!', 2000);
                    }
                }
            }
        });

        resultDialog.show();
    }

    /**
     * Quick export - directly output to console and copy as JSON
     */
    function quickExport() {
        const results = processSelection(0, 0, 0);
        
        if (!results || results.length === 0) {
            Blockbench.showQuickMessage('No valid elements selected!', 2000);
            return;
        }

        // Default namespace for quick export
        const namespace = 'ait';
        
        // Generate JSON array
        const jsonArray = results.map(result => 
            generateJsonFormat(
                result.name,
                namespace,
                result.entityDimensions,
                result.offset
            )
        );
        
        // Output as JSON array if multiple, or single object if one
        let output;
        if (jsonArray.length === 1) {
            output = JSON.stringify(jsonArray[0], null, 2);
        } else {
            output = JSON.stringify(jsonArray, null, 2);
        }

        console.log('=== Control Types Export ===');
        console.log(output);

        if (navigator.clipboard) {
            navigator.clipboard.writeText(output).then(() => {
                Blockbench.showQuickMessage('Control Type JSON copied to clipboard!', 2000);
            });
        }
    }

    // Plugin registration
    BBPlugin.register(PLUGIN_ID, {
        title: PLUGIN_NAME,
        author: PLUGIN_AUTHOR,
        description: PLUGIN_DESCRIPTION,
        icon: 'control_camera',
        version: PLUGIN_VERSION,
        variant: 'both',
        
        onload() {
            // Create menu action
            exportAction = new Action('export_control_type', {
                name: 'Export as Control Type',
                description: 'Export selected cubes/groups as ControlType definitions',
                icon: 'control_camera',
                click: showExportDialog
            });

            // Create quick export action
            const quickExportAction = new Action('quick_export_control_type', {
                name: 'Quick Export Control Type',
                description: 'Quickly export selected elements to clipboard',
                icon: 'content_copy',
                click: quickExport
            });

            // Add to menu
            MenuBar.addAction(exportAction, 'filter');
            MenuBar.addAction(quickExportAction, 'filter');

            // Add keyboard shortcut
            Keybinds.actions.push(exportAction);
            
            console.log(`${PLUGIN_NAME} v${PLUGIN_VERSION} loaded successfully!`);
        },
        
        onunload() {
            // Clean up
            if (exportAction) {
                exportAction.delete();
            }
            
            if (exportDialog) {
                exportDialog.close();
            }
            
            console.log(`${PLUGIN_NAME} unloaded`);
        }
    });

})();
