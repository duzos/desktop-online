/**
 * Tool Manager - Handles rendering and managing tool forms
 */

const ToolManager = (function() {
    'use strict';

    // Tool definitions
    const TOOLS = {
        'exterior': {
            name: 'Exterior Variant',
            icon: 'fa-door-open',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-exteriors/',
            description: 'Create custom exterior textures for TARDIS shells'
        },
        'exterior-model': {
            name: 'Exterior Model',
            icon: 'fa-cubes',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/exterior-model-datapacks/',
            description: 'Create full custom exterior with model, door, and animations'
        },
        'interior': {
            name: 'Interior/Desktop',
            icon: 'fa-cube',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-interiors/',
            description: 'Add custom TARDIS interior rooms'
        },
        'console-variant': {
            name: 'Console Variant',
            icon: 'fa-sliders',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-consoles/',
            description: 'Create console texture variants'
        },
        'console-model': {
            name: 'Console Model',
            icon: 'fa-gamepad',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-console-models-stub/',
            description: 'Create full custom console with controls'
        },
        'category': {
            name: 'Category',
            icon: 'fa-folder',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-categories/',
            description: 'Create custom exterior categories'
        },
        'hum': {
            name: 'Hum Sound',
            icon: 'fa-music',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-hums/',
            description: 'Add custom TARDIS hum sounds'
        },
        'sonic': {
            name: 'Sonic Screwdriver',
            icon: 'fa-wand-magic-sparkles',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-sonics/',
            description: 'Create custom sonic screwdrivers'
        },
        'vortex': {
            name: 'Vortex',
            icon: 'fa-hurricane',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-vortexes/',
            description: 'Add custom time vortex effects'
        },
        'planet': {
            name: 'Planet',
            icon: 'fa-globe',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-planets/',
            description: 'Create custom planets in space'
        },
        'fabricator': {
            name: 'Fabricator Recipe',
            icon: 'fa-gears',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-fabricator-recipes/',
            description: 'Add custom fabricator blueprints'
        },
        'flight-sound': {
            name: 'Flight Sound',
            icon: 'fa-volume-high',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-flight-sounds/',
            description: 'Add custom flight sounds'
        },
        'mug': {
            name: 'Mug/Drink',
            icon: 'fa-mug-hot',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-mugs/',
            description: 'Create custom drinks with effects'
        },
        'unlockable-dimension': {
            name: 'Locked Dimension',
            icon: 'fa-lock',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-unlockable-dimensions/',
            description: 'Lock dimensions behind items'
        },
        'exterior-animation': {
            name: 'Exterior Animation',
            icon: 'fa-film',
            wikiUrl: 'https://amblelabs.dev/ait-wiki/datapacks/custom-exterior-animations/',
            description: 'Create custom de/mat animations'
        }
    };

    // Console parent types
    const CONSOLE_PARENTS = [
        { value: 'ait:console/coral', name: 'Coral Console' },
        { value: 'ait:console/hartnell', name: 'Hartnell Console' },
        { value: 'ait:console/copper', name: 'Copper Console' },
        { value: 'ait:console/toyota', name: 'Toyota Console' },
        { value: 'ait:console/alnico', name: 'Alnico Console' },
        { value: 'ait:console/steam', name: 'Steam Console' },
        { value: 'ait:console/hudolin', name: 'Hudolin Console' },
        { value: 'ait:console/crystaline', name: 'Crystalline Console' },
        { value: 'ait:console/renaissance', name: 'Tokamak Console' }
    ];

    // Exterior parent types
    const EXTERIOR_PARENTS = [
        { value: 'ait:exterior/police_box/default', name: 'Police Box (Default)' },
        { value: 'ait:exterior/police_box/coral', name: 'Police Box (Coral)' },
        { value: 'ait:exterior/police_box/renaissance', name: 'Police Box (Renaissance)' },
        { value: 'ait:exterior/classic/prime', name: 'Classic Police Box' },
        { value: 'ait:exterior/classic/hudolin', name: 'Hudolin Box' },
        { value: 'ait:exterior/booth/default', name: 'K2 Phone Booth' },
        { value: 'ait:exterior/capsule/default', name: 'TT Capsule' },
        { value: 'ait:exterior/easter_head/default', name: 'Moyai' },
        { value: 'ait:exterior/plinth/default', name: 'Plinth' },
        { value: 'ait:exterior/tardim/default', name: 'TARDIM' },
        { value: 'ait:exterior/siege_mode/default', name: 'Siege Mode' }
    ];

    // Exterior categories
    const EXTERIOR_CATEGORIES = [
        { value: 'ait:exterior/police_box', name: 'Police Box' },
        { value: 'ait:exterior/classic', name: 'Classic' },
        { value: 'ait:exterior/booth', name: 'Booth' },
        { value: 'ait:exterior/capsule', name: 'Capsule' },
        { value: 'ait:exterior/easter_head', name: 'Easter Head' },
        { value: 'ait:exterior/plinth', name: 'Plinth' },
        { value: 'ait:exterior/tardim', name: 'TARDIM' },
        { value: 'ait:exterior/siege_mode', name: 'Siege Mode' }
    ];

    // Loyalty types for sonics
    const LOYALTY_TYPES = ['OWNER', 'PILOT', 'COMPANION', 'NEUTRAL', 'REJECT'];

    let currentTool = null;
    let editingItemId = null;
    let editingItemFiles = {}; // Store existing files when editing

    /**
     * Get tool info
     */
    function getToolInfo(type) {
        return TOOLS[type] || null;
    }

    /**
     * Get all tools
     */
    function getAllTools() {
        return Object.entries(TOOLS).map(([key, value]) => ({
            type: key,
            ...value
        }));
    }

    /**
     * Get current tool type
     */
    function getCurrentTool() {
        return currentTool;
    }

    /**
     * Render the tool selector dropdown
     */
    function renderToolSelector() {
        const container = document.getElementById('toolSelector');
        if (!container) return;

        let html = '<option value="">-- Select a Tool --</option>';
        for (const [type, tool] of Object.entries(TOOLS)) {
            html += `<option value="${type}">${tool.name}</option>`;
        }
        container.innerHTML = html;
    }

    /**
     * Render the workspace with a specific tool form
     */
    function renderTool(type, existingData = null, existingFiles = null) {
        currentTool = type;
        const workspace = document.getElementById('workspace');
        if (!workspace) return;

        const tool = TOOLS[type];
        if (!tool) {
            workspace.innerHTML = '<p class="no-tool">Select a tool to get started</p>';
            return;
        }

        // Track if we're editing (have existing files)
        const isEditing = editingItemId !== null;

        // Check if this tool type supports 3D preview AND if it's enabled
        const supportsPreview = ['console-model', 'exterior-model', 'console-variant', 'exterior'].includes(type);
        const hasPreview = supportsPreview && typeof is3DPreviewEnabled === 'function' && is3DPreviewEnabled();

        let formHtml = `
            <div class="tool-header">
                <h2><i class="fa-solid ${tool.icon}"></i> ${tool.name}</h2>
                <a href="${tool.wikiUrl}" target="_blank" class="wiki-link">
                    <i class="fa-solid fa-book"></i> Wiki Guide
                </a>
            </div>
            <p class="tool-description">${tool.description}</p>
        `;

        // Wrap in preview layout if applicable
        if (hasPreview) {
            formHtml += `<div class="form-with-preview"><div class="form-content">`;
        }

        formHtml += `<form id="toolForm" class="tool-form">`;

        switch (type) {
            case 'exterior':
                formHtml += renderExteriorForm(existingData, isEditing, existingFiles);
                break;
            case 'exterior-model':
                formHtml += renderExteriorModelForm(existingData, isEditing, existingFiles);
                break;
            case 'interior':
                formHtml += renderInteriorForm(existingData, isEditing, existingFiles);
                break;
            case 'console-variant':
                formHtml += renderConsoleVariantForm(existingData, isEditing, existingFiles);
                break;
            case 'console-model':
                formHtml += renderConsoleModelForm(existingData, isEditing, existingFiles);
                break;
            case 'category':
                formHtml += renderCategoryForm(existingData, isEditing, existingFiles);
                break;
            case 'hum':
                formHtml += renderHumForm(existingData, isEditing, existingFiles);
                break;
            case 'sonic':
                formHtml += renderSonicForm(existingData, isEditing, existingFiles);
                break;
            case 'vortex':
                formHtml += renderVortexForm(existingData, isEditing, existingFiles);
                break;
            case 'planet':
                formHtml += renderPlanetForm(existingData, isEditing, existingFiles);
                break;
            case 'fabricator':
                formHtml += renderFabricatorForm(existingData, isEditing, existingFiles);
                break;
            case 'flight-sound':
                formHtml += renderFlightSoundForm(existingData, isEditing, existingFiles);
                break;
            case 'mug':
                formHtml += renderMugForm(existingData, isEditing, existingFiles);
                break;
            case 'unlockable-dimension':
                formHtml += renderUnlockableDimensionForm(existingData, isEditing, existingFiles);
                break;
            case 'exterior-animation':
                formHtml += renderExteriorAnimationForm(existingData, isEditing, existingFiles);
                break;
        }

        formHtml += `
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fa-solid fa-plus"></i> ${editingItemId ? 'Update' : 'Add to Pack'}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="ToolManager.clearForm()">
                        <i class="fa-solid fa-xmark"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        // Add preview panel if applicable
        if (hasPreview) {
            formHtml += `</div>
                <div class="model-preview-panel">
                    <h3><i class="fa-solid fa-eye"></i> 3D Preview</h3>
                    <div id="modelPreviewContainer" class="model-preview-container">
                        <div class="preview-message">
                            <i class="fa-solid fa-cube"></i>
                            Upload a model to preview
                        </div>
                    </div>
                    <div class="preview-controls">
                        <button type="button" class="btn btn-small" onclick="ModelPreview.setAutoRotate(!ModelPreview.getAutoRotate()); this.innerHTML = ModelPreview.getAutoRotate() ? '<i class=\\'fa-solid fa-pause\\'></i> Pause' : '<i class=\\'fa-solid fa-rotate\\'></i> Rotate'">
                            <i class="fa-solid fa-pause"></i> Pause
                        </button>
                        <button type="button" class="btn btn-small" onclick="ModelPreview.resetCamera()">
                            <i class="fa-solid fa-arrows-to-circle"></i> Reset View
                        </button>
                    </div>
                </div>
            </div>`;
        }

        workspace.innerHTML = formHtml;

        // Attach form submit handler
        document.getElementById('toolForm').addEventListener('submit', handleFormSubmit);

        // Initialize any special form behaviors
        initializeFormBehaviors(type);

        // Initialize 3D preview if available
        if (hasPreview && typeof ModelPreview !== 'undefined' && ModelPreview.isAvailable()) {
            setTimeout(() => {
                ModelPreview.init('modelPreviewContainer');
            }, 100);
        }
    }

    /**
     * Helper to render file input with existing file status
     */
    function renderFileInput(id, name, label, accept, required, isEditing, existingFiles, hint = '') {
        const existingFile = existingFiles && existingFiles[name];
        const hasExisting = existingFile && (existingFile.name || existingFile.size);
        const isRequired = required && !hasExisting;

        let html = `
            <div class="form-group">
                <label for="${id}">${label}${isRequired ? ' <span class="required">*</span>' : ''}</label>
                <input type="file" id="${id}" name="${name}" accept="${accept}"${isRequired ? ' required' : ''}>
        `;

        if (hasExisting) {
            const fileName = existingFile.name || 'Uploaded file';
            html += `<span class="file-existing"><i class="fa-solid fa-check-circle"></i> Current: ${fileName}</span>`;
        }

        if (hint) {
            html += `<span class="file-hint">${hint}</span>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Render exterior form fields
     */
    function renderExteriorForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        const customCategories = SharedState.getCustomCategories();
        const customExteriors = SharedState.getCustomExteriors();

        let categoryOptions = EXTERIOR_CATEGORIES.map(c =>
            `<option value="${c.value}" ${data.category === c.value ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        // Add custom categories
        for (const cat of customCategories) {
            categoryOptions += `<option value="${cat.id}" ${data.category === cat.id ? 'selected' : ''}>${cat.name} (Custom)</option>`;
        }

        let parentOptions = EXTERIOR_PARENTS.map(p =>
            `<option value="${p.value}" ${data.parent === p.value ? 'selected' : ''}>${p.name}</option>`
        ).join('');

        // Add custom exterior models as parent options
        for (const ext of customExteriors) {
            parentOptions += `<option value="${ext.id}" ${data.parent === ext.id ? 'selected' : ''}>${ext.name} (Custom)</option>`;
        }

        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_exterior" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input type="text" id="name" name="name" value="${data.name || ''}" placeholder="My Exterior">
            </div>
            <div class="form-group">
                <label for="parent">Parent Model <span class="required">*</span></label>
                <select id="parent" name="parent" required>
                    <option value="">-- Select Parent --</option>
                    ${parentOptions}
                    <option value="custom" ${data.parent && !EXTERIOR_PARENTS.find(p => p.value === data.parent) && !customExteriors.find(e => e.id === data.parent) ? 'selected' : ''}>Other (Custom)</option>
                </select>
                <input type="text" id="customParent" name="customParent" class="hidden" 
                    placeholder="namespace:exterior/type/variant" value="${data.customParent || ''}">
            </div>
            <div class="form-group">
                <label for="category">Category <span class="required">*</span></label>
                <select id="category" name="category" required>
                    <option value="">-- Select Category --</option>
                    ${categoryOptions}
                    <option value="custom">Other (Custom)</option>
                </select>
                <input type="text" id="customCategory" name="customCategory" class="hidden" 
                    placeholder="namespace:category_name" value="${data.customCategory || ''}">
            </div>
            ${renderFileInput('texture', 'texture', 'Texture', '.png', true, isEditing, existingFiles, 'PNG image for the exterior')}
            ${renderFileInput('emission', 'emission', 'Emission Texture', '.png', false, isEditing, existingFiles, 'Optional glowing parts texture')}
        `;
    }

    /**
     * Render exterior model form fields (full custom exterior with model)
     */
    function renderExteriorModelForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        const customCategories = SharedState.getCustomCategories();

        let categoryOptions = EXTERIOR_CATEGORIES.map(c =>
            `<option value="${c.value}" ${data.category === c.value ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        for (const cat of customCategories) {
            categoryOptions += `<option value="${cat.id}" ${data.category === cat.id ? 'selected' : ''}>${cat.name} (Custom)</option>`;
        }

        let parentOptions = EXTERIOR_PARENTS.map(p =>
            `<option value="${p.value}" ${data.parent === p.value ? 'selected' : ''}>${p.name}</option>`
        ).join('');

        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_exterior" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input type="text" id="name" name="name" value="${data.name || ''}" placeholder="My Exterior">
            </div>
            <div class="form-group">
                <label for="parent">Parent Model <span class="required">*</span></label>
                <select id="parent" name="parent" required>
                    <option value="">-- Select Parent --</option>
                    ${parentOptions}
                </select>
                <span class="file-hint">Base exterior type for fallback behavior</span>
            </div>
            <div class="form-group">
                <label for="category">Category <span class="required">*</span></label>
                <select id="category" name="category" required>
                    <option value="">-- Select Category --</option>
                    ${categoryOptions}
                </select>
            </div>

            <div class="form-section">
                <h3><i class="fa-solid fa-cube"></i> Exterior Model</h3>
                <p class="section-hint">Upload a Blockbench model (.bbmodel) for automatic conversion, or upload Bedrock format files directly.</p>
                
                <div class="form-group">
                    <label for="exteriorBbmodel">Blockbench Model (.bbmodel)</label>
                    <input type="file" id="exteriorBbmodel" name="exteriorBbmodel" accept=".bbmodel">
                    <span class="file-hint">Automatically converts to Bedrock format</span>
                </div>
                
                <div class="form-divider">OR</div>
                
                <div class="form-group">
                    <label for="exteriorGeo">Geometry File (.geo.json)</label>
                    <input type="file" id="exteriorGeo" name="exteriorGeo" accept=".json,.geo.json">
                </div>
            </div>

            <div class="form-section">
                <h3><i class="fa-solid fa-door-open"></i> Door Model</h3>
                <p class="section-hint">Upload a separate door model for animated doors.</p>
                
                <div class="form-group">
                    <label for="doorBbmodel">Door Blockbench Model (.bbmodel)</label>
                    <input type="file" id="doorBbmodel" name="doorBbmodel" accept=".bbmodel">
                    <span class="file-hint">Model with doorLeft/doorRight bones for animation</span>
                </div>
                
                <div class="form-divider">OR</div>
                
                <div class="form-group">
                    <label for="doorGeo">Door Geometry File (.geo.json)</label>
                    <input type="file" id="doorGeo" name="doorGeo" accept=".json,.geo.json">
                </div>
                <div class="form-group">
                    <label for="doorAnimations">Door Animation File (.animation.json)</label>
                    <input type="file" id="doorAnimations" name="doorAnimations" accept=".json,.animation.json">
                    <span class="file-hint">Should contain open_left and open_right animations</span>
                </div>
            </div>

            <div class="form-section">
                <h3><i class="fa-solid fa-cog"></i> Door Settings</h3>
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="isDoubleDoor" name="isDoubleDoor" ${data.isDoubleDoor !== false ? 'checked' : ''}>
                        Double Door (two door panels)
                    </label>
                </div>
                <div class="form-group">
                    <label>Door Offset (X, Y, Z)</label>
                    <div class="vector-input">
                        <input type="number" step="0.1" id="doorOffsetX" name="doorOffsetX" value="${data.doorOffsetX || 0}" placeholder="X">
                        <input type="number" step="0.1" id="doorOffsetY" name="doorOffsetY" value="${data.doorOffsetY || 2.5}" placeholder="Y">
                        <input type="number" step="0.1" id="doorOffsetZ" name="doorOffsetZ" value="${data.doorOffsetZ || -1}" placeholder="Z">
                    </div>
                </div>
                <div class="form-group">
                    <label for="openSound">Door Open Sound</label>
                    <input type="text" id="openSound" name="openSound" value="${data.openSound || 'ait:tardis/police_box_door_open'}" 
                        placeholder="ait:tardis/police_box_door_open">
                </div>
                <div class="form-group">
                    <label for="closeSound">Door Close Sound</label>
                    <input type="text" id="closeSound" name="closeSound" value="${data.closeSound || 'ait:tardis/police_box_door_close'}" 
                        placeholder="ait:tardis/police_box_door_close">
                </div>
            </div>

            <div class="form-section">
                <h3><i class="fa-solid fa-image"></i> Textures</h3>
                ${renderFileInput('texture', 'texture', 'Texture', '.png', true, isEditing, existingFiles)}
                ${renderFileInput('emission', 'emission', 'Emission Texture', '.png', false, isEditing, existingFiles)}
            </div>

            <div id="exteriorModelPreview" class="controls-preview hidden">
                <h3><i class="fa-solid fa-check-circle"></i> Processed Models</h3>
                <div id="exteriorModelInfo"></div>
            </div>
        `;
    }

    /**
     * Render interior form fields
     */
    function renderInteriorForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_interior" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input type="text" id="name" name="name" value="${data.name || ''}" placeholder="My Interior">
            </div>
            ${renderFileInput('structure', 'structure', 'Structure File (.nbt)', '.nbt', true, isEditing, existingFiles, 'Use a Structure Block in-game to save your build')}
            ${renderFileInput('preview', 'preview', 'Preview Image', '.png', false, isEditing, existingFiles, 'Square PNG for the interior selection screen')}
        `;
    }

    /**
     * Render console variant form fields
     */
    function renderConsoleVariantForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        const customConsoles = SharedState.getCustomConsoles();

        let parentOptions = CONSOLE_PARENTS.map(p =>
            `<option value="${p.value}" ${data.parent === p.value ? 'selected' : ''}>${p.name}</option>`
        ).join('');

        // Add custom console types
        for (const con of customConsoles) {
            parentOptions += `<option value="${con.id}" ${data.parent === con.id ? 'selected' : ''}>${con.name} (Custom)</option>`;
        }

        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_console" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input type="text" id="name" name="name" value="${data.name || ''}" placeholder="My Console">
            </div>
            <div class="form-group">
                <label for="parent">Parent Console <span class="required">*</span></label>
                <select id="parent" name="parent" required>
                    <option value="">-- Select Parent --</option>
                    ${parentOptions}
                </select>
            </div>
            ${renderFileInput('texture', 'texture', 'Texture', '.png', true, isEditing, existingFiles)}
            ${renderFileInput('emission', 'emission', 'Emission Texture', '.png', false, isEditing, existingFiles)}
        `;
    }

    /**
     * Render console model form fields (full custom console)
     */
    function renderConsoleModelForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_custom_console" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input type="text" id="name" name="name" value="${data.name || ''}" placeholder="My Custom Console">
            </div>
            
            <div class="form-section">
                <h3><i class="fa-solid fa-cube"></i> Model</h3>
                <p class="section-hint">Upload a Blockbench model (.bbmodel) for automatic conversion, or upload Bedrock format files directly.</p>
                
                <div class="form-group">
                    <label for="bbmodel">Blockbench Model (.bbmodel)</label>
                    <input type="file" id="bbmodel" name="bbmodel" accept=".bbmodel">
                    <span class="file-hint">Automatically converts to Bedrock format and detects controls</span>
                </div>
                
                <div class="form-divider">OR</div>
                
                <div class="form-group">
                    <label for="geometry">Geometry File (.geo.json)</label>
                    <input type="file" id="geometry" name="geometry" accept=".json,.geo.json">
                </div>
                <div class="form-group">
                    <label for="animations">Animation File (.animation.json)</label>
                    <input type="file" id="animations" name="animations" accept=".json,.animation.json">
                </div>
            </div>
            
            <div class="form-section">
                <h3><i class="fa-solid fa-image"></i> Textures</h3>
                ${renderFileInput('texture', 'texture', 'Texture', '.png', true, isEditing, existingFiles)}
                ${renderFileInput('emission', 'emission', 'Emission Texture', '.png', false, isEditing, existingFiles)}
            </div>
            
            <div class="form-section">
                <h3><i class="fa-solid fa-arrows-up-down-left-right"></i> Transformations</h3>
                <div class="form-group">
                    <label>Offset (X, Y, Z)</label>
                    <div class="vector-input">
                        <input type="number" step="0.1" id="offsetX" name="offsetX" value="${data.offsetX || 0.5}" placeholder="X">
                        <input type="number" step="0.1" id="offsetY" name="offsetY" value="${data.offsetY || 0.2}" placeholder="Y">
                        <input type="number" step="0.1" id="offsetZ" name="offsetZ" value="${data.offsetZ || -0.5}" placeholder="Z">
                    </div>
                </div>
                <div class="form-group">
                    <label>Rotation (X, Y, Z)</label>
                    <div class="vector-input">
                        <input type="number" step="1" id="rotX" name="rotX" value="${data.rotX || 0}" placeholder="X">
                        <input type="number" step="1" id="rotY" name="rotY" value="${data.rotY || 0}" placeholder="Y">
                        <input type="number" step="1" id="rotZ" name="rotZ" value="${data.rotZ || 0}" placeholder="Z">
                    </div>
                </div>
            </div>
            
            <div id="controlsPreview" class="controls-preview hidden">
                <h3><i class="fa-solid fa-gamepad"></i> Detected Controls</h3>
                <div id="controlsList"></div>
            </div>
            
            <div id="animationsPreview" class="animations-preview hidden">
                <h3><i class="fa-solid fa-film"></i> Matched Animations</h3>
                <div id="animationsList"></div>
            </div>
        `;
    }

    /**
     * Render category form fields
     */
    function renderCategoryForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_category" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name <span class="required">*</span></label>
                <input type="text" id="name" name="name" required value="${data.name || ''}" placeholder="My Category">
            </div>
        `;
    }

    /**
     * Render hum form fields
     */
    function renderHumForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_hum" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="soundId">Sound ID <span class="required">*</span></label>
                <input type="text" id="soundId" name="soundId" required value="${data.soundId || ''}" 
                    placeholder="namespace:path/to/sound">
                <span class="file-hint">Use /playsound command to find sound IDs</span>
            </div>
        `;
    }

    /**
     * Render sonic form fields
     */
    function renderSonicForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        const loyaltyOptions = LOYALTY_TYPES.map(l =>
            `<option value="${l}" ${data.loyalty === l ? 'selected' : ''}>${l}</option>`
        ).join('');

        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_sonic" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input type="text" id="name" name="name" value="${data.name || ''}" placeholder="My Sonic">
            </div>
            <div class="form-group">
                <label for="loyalty">Loyalty Type</label>
                <select id="loyalty" name="loyalty">
                    ${loyaltyOptions}
                </select>
            </div>
            ${renderFileInput('model', 'model', 'Model File (.json)', '.json', false, isEditing, existingFiles)}
            ${renderFileInput('texture', 'texture', 'Texture', '.png', false, isEditing, existingFiles)}
        `;
    }

    /**
     * Render vortex form fields
     */
    function renderVortexForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_vortex" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            ${renderFileInput('texture', 'texture', 'Texture', '.png', true, isEditing, existingFiles, 'Recommended: 128x128 pixels')}
            ${renderFileInput('textureSecond', 'textureSecond', 'Second Layer Texture', '.png', false, isEditing, existingFiles)}
            ${renderFileInput('textureThird', 'textureThird', 'Third Layer Texture', '.png', false, isEditing, existingFiles)}
        `;
    }

    /**
     * Render planet form fields
     */
    function renderPlanetForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_planet" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="dimension">Dimension <span class="required">*</span></label>
                <input type="text" id="dimension" name="dimension" required value="${data.dimension || ''}" 
                    placeholder="minecraft:overworld">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="gravity">Gravity</label>
                    <input type="number" step="0.1" id="gravity" name="gravity" value="${data.gravity || 0}">
                </div>
                <div class="form-group">
                    <label for="temperature">Temperature (K)</label>
                    <input type="number" id="temperature" name="temperature" value="${data.temperature || 288}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="hasOxygen" name="hasOxygen" ${data.hasOxygen !== false ? 'checked' : ''}>
                        Has Oxygen
                    </label>
                </div>
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="hasLandableSurface" name="hasLandableSurface" ${data.hasLandableSurface !== false ? 'checked' : ''}>
                        Has Landable Surface
                    </label>
                </div>
            </div>
            ${renderFileInput('texture', 'texture', 'Planet Texture', '.png', true, isEditing, existingFiles)}
            <div class="form-section">
                <h3>Render Settings</h3>
                <div class="form-group">
                    <label>Position</label>
                    <div class="vector-input">
                        <input type="number" id="posX" name="posX" value="${data.posX || 9000}" placeholder="X">
                        <input type="number" id="posY" name="posY" value="${data.posY || 76}" placeholder="Y">
                        <input type="number" id="posZ" name="posZ" value="${data.posZ || -8000}" placeholder="Z">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="radius">Radius</label>
                        <input type="number" id="radius" name="radius" value="${data.radius || 1400}">
                    </div>
                    <div class="form-group">
                        <label for="suctionRadius">Suction Radius</label>
                        <input type="number" id="suctionRadius" name="suctionRadius" value="${data.suctionRadius || 900}">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render fabricator form fields
     */
    function renderFabricatorForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">Recipe ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_recipe" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-section">
                <h3>Output</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="outputId">Item ID <span class="required">*</span></label>
                        <input type="text" id="outputId" name="outputId" required value="${data.outputId || ''}" 
                            placeholder="minecraft:diamond">
                    </div>
                    <div class="form-group">
                        <label for="outputCount">Count</label>
                        <input type="number" id="outputCount" name="outputCount" min="1" value="${data.outputCount || 1}">
                    </div>
                </div>
            </div>
            <div class="form-section">
                <h3>Inputs</h3>
                <div id="inputsList">
                    <div class="input-item">
                        <input type="text" name="inputItem[]" placeholder="minecraft:iron_ingot" required>
                        <input type="number" name="inputMin[]" min="1" value="1" placeholder="Min">
                        <input type="number" name="inputMax[]" min="1" value="1" placeholder="Max">
                        <button type="button" class="btn-icon" onclick="this.parentElement.remove()">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-small" onclick="ToolManager.addFabricatorInput()">
                    <i class="fa-solid fa-plus"></i> Add Input
                </button>
            </div>
        `;
    }

    /**
     * Render flight sound form fields
     */
    function renderFlightSoundForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_flight_sound" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="soundId">Sound ID <span class="required">*</span></label>
                <input type="text" id="soundId" name="soundId" required value="${data.soundId || ''}" 
                    placeholder="namespace:path/to/sound">
            </div>
            <div class="form-group">
                <label for="length">Length (seconds) <span class="required">*</span></label>
                <input type="number" id="length" name="length" required min="1" value="${data.length || 10}">
            </div>
        `;
    }

    /**
     * Render mug form fields
     */
    function renderMugForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_drink" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group checkbox-group">
                <label>
                    <input type="checkbox" id="hasCustomColor" name="hasCustomColor" ${data.hasCustomColor ? 'checked' : ''}>
                    Custom Color
                </label>
            </div>
            <div class="form-group" id="colorGroup">
                <label>Color (RGB 0-1)</label>
                <div class="vector-input">
                    <input type="number" step="0.01" min="0" max="1" id="colorR" name="colorR" value="${data.colorR || 0.5}" placeholder="R">
                    <input type="number" step="0.01" min="0" max="1" id="colorG" name="colorG" value="${data.colorG || 0.5}" placeholder="G">
                    <input type="number" step="0.01" min="0" max="1" id="colorB" name="colorB" value="${data.colorB || 0.5}" placeholder="B">
                </div>
            </div>
            <div class="form-section">
                <h3>Potion Effects</h3>
                <div id="potionsList">
                    <div class="potion-item">
                        <input type="text" name="potionId[]" placeholder="minecraft:speed" required>
                        <input type="number" name="potionDuration[]" min="1" value="200" placeholder="Duration">
                        <input type="number" name="potionAmplifier[]" min="0" value="0" placeholder="Amplifier">
                        <button type="button" class="btn-icon" onclick="this.parentElement.remove()">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-small" onclick="ToolManager.addPotionEffect()">
                    <i class="fa-solid fa-plus"></i> Add Effect
                </button>
            </div>
        `;
    }

    /**
     * Render unlockable dimension form fields
     */
    function renderUnlockableDimensionForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="locked_dimension" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="dimension">Dimension ID <span class="required">*</span></label>
                <input type="text" id="dimension" name="dimension" required value="${data.dimension || ''}" 
                    placeholder="minecraft:the_nether">
            </div>
            <div class="form-section">
                <h3>Unlock Item</h3>
                <p class="section-hint">The item required to unlock this dimension</p>
                <div class="form-row">
                    <div class="form-group">
                        <label for="itemId">Item ID <span class="required">*</span></label>
                        <input type="text" id="itemId" name="itemId" required value="${data.itemId || ''}" 
                            placeholder="minecraft:nether_star">
                    </div>
                    <div class="form-group">
                        <label for="itemCount">Count</label>
                        <input type="number" id="itemCount" name="itemCount" min="1" value="${data.itemCount || 1}">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render exterior animation form fields
     */
    function renderExteriorAnimationForm(data, isEditing = false, existingFiles = null) {
        data = data || {};
        existingFiles = existingFiles || {};
        // Default sounds based on state
        const defaultDematSound = 'ait:tardis/demat';
        const defaultMatSound = 'ait:tardis/mat';
        const defaultSound = data.expectedState === 'mat' ? defaultMatSound : defaultDematSound;

        return `
            <div class="form-group">
                <label for="id">ID <span class="required">*</span></label>
                <input type="text" id="id" name="id" required value="${data.id || ''}" 
                    placeholder="my_animation" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
            </div>
            <div class="form-group">
                <label for="expectedState">Animation State <span class="required">*</span></label>
                <select id="expectedState" name="expectedState" required onchange="updateExteriorAnimSound(this.value)">
                    <option value="demat" ${data.expectedState === 'demat' || !data.expectedState ? 'selected' : ''}>Dematerialization</option>
                    <option value="mat" ${data.expectedState === 'mat' ? 'selected' : ''}>Materialization</option>
                </select>
            </div>
            <div class="form-group">
                <label for="soundId">Sound ID <span class="required">*</span></label>
                <input type="text" id="soundId" name="soundId" required value="${data.soundId || defaultSound}" 
                    placeholder="ait:tardis/demat">
                <span class="file-hint">Default AIT sounds: ait:tardis/demat, ait:tardis/mat</span>
            </div>
            ${renderFileInput('keyframes', 'keyframes', 'Keyframes File (.json)', '.json', false, isEditing, existingFiles, 'Animation keyframes - see wiki or use BlockBench')}
        `;
    }

    /**
     * Initialize special form behaviors
     */
    function initializeFormBehaviors(type) {
        // Handle custom parent/category toggles for exterior
        if (type === 'exterior') {
            const parentSelect = document.getElementById('parent');
            const customParentInput = document.getElementById('customParent');
            const categorySelect = document.getElementById('category');
            const customCategoryInput = document.getElementById('customCategory');

            parentSelect?.addEventListener('change', () => {
                customParentInput.classList.toggle('hidden', parentSelect.value !== 'custom');
                if (parentSelect.value !== 'custom') customParentInput.value = '';
            });

            categorySelect?.addEventListener('change', () => {
                customCategoryInput.classList.toggle('hidden', categorySelect.value !== 'custom');
                if (categorySelect.value !== 'custom') customCategoryInput.value = '';
            });

            // Handle parent selection to load custom model geometry for preview
            parentSelect?.addEventListener('change', () => {
                customParentInput.classList.toggle('hidden', parentSelect.value !== 'custom');
                if (parentSelect.value !== 'custom') customParentInput.value = '';

                // Try to load custom model geometry for preview
                loadCustomParentModelForPreview(parentSelect.value, 'exterior');
            });

            // Handle texture upload for variant preview
            const textureInput = document.getElementById('texture');
            textureInput?.addEventListener('change', handleTextureUploadForPreview);
        }

        // Handle file uploads for console-model
        if (type === 'console-model') {
            const bbmodelInput = document.getElementById('bbmodel');
            const geoInput = document.getElementById('geometry');
            const animInput = document.getElementById('animations');
            const textureInput = document.getElementById('texture');

            bbmodelInput?.addEventListener('change', handleBBModelUpload);
            geoInput?.addEventListener('change', handleGeoJsonUpload);
            animInput?.addEventListener('change', handleAnimationJsonUpload);
            textureInput?.addEventListener('change', handleTextureUploadForPreview);
        }

        // Handle texture uploads for console-variant
        if (type === 'console-variant') {
            const parentSelect = document.getElementById('parent');
            const customParentInput = document.getElementById('customParent');
            const textureInput = document.getElementById('texture');

            // Handle parent selection to load custom model geometry for preview
            parentSelect?.addEventListener('change', () => {
                if (customParentInput) {
                    customParentInput.classList.toggle('hidden', parentSelect.value !== 'custom');
                    if (parentSelect.value !== 'custom') customParentInput.value = '';
                }

                // Try to load custom model geometry for preview
                loadCustomParentModelForPreview(parentSelect.value, 'console');
            });

            textureInput?.addEventListener('change', handleTextureUploadForPreview);
        }

        // Handle file uploads for exterior-model
        if (type === 'exterior-model') {
            const exteriorBbmodel = document.getElementById('exteriorBbmodel');
            const doorBbmodel = document.getElementById('doorBbmodel');
            const exteriorGeo = document.getElementById('exteriorGeo');
            const doorGeo = document.getElementById('doorGeo');
            const doorAnimations = document.getElementById('doorAnimations');
            const textureInput = document.getElementById('texture');

            exteriorBbmodel?.addEventListener('change', (e) => handleExteriorBBModelUpload(e, 'exterior'));
            doorBbmodel?.addEventListener('change', (e) => handleExteriorBBModelUpload(e, 'door'));
            exteriorGeo?.addEventListener('change', (e) => handleExteriorGeoUpload(e, 'exterior'));
            textureInput?.addEventListener('change', handleTextureUploadForPreview);
            doorGeo?.addEventListener('change', (e) => handleExteriorGeoUpload(e, 'door'));
            doorAnimations?.addEventListener('change', handleExteriorAnimationUpload);
        }
    }

    /**
     * Handle .geo.json file upload for console-model
     */
    async function handleGeoJsonUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            Utils.showToast('Processing geometry file...', 'info');

            const content = await Utils.readFileAsText(file);
            const geoJson = JSON.parse(content);

            // Validate it's a geo.json file
            if (!geoJson['minecraft:geometry'] && !geoJson.format_version) {
                Utils.showToast('Invalid geometry file format', 'error');
                return;
            }

            // Store in form dataset
            const form = document.getElementById('toolForm');
            let processedData = {};
            try {
                processedData = JSON.parse(form.dataset.processedModel || '{}');
            } catch (e) {
                processedData = {};
            }

            processedData.geometry = geoJson;
            form.dataset.processedModel = JSON.stringify(processedData);

            // Update preview
            updateConsoleModelPreview(processedData);

            // Update 3D preview
            if (typeof ModelPreview !== 'undefined' && ModelPreview.isAvailable()) {
                // Get texture if available
                const textureInput = document.getElementById('texture');
                let textureUrl = null;
                if (textureInput?.files[0]) {
                    textureUrl = await readFileAsDataUrl(textureInput.files[0]);
                }
                ModelPreview.loadGeometry(geoJson, textureUrl);
            }

            Utils.showToast('Geometry file loaded!', 'success');
        } catch (error) {
            console.error('Error processing geo.json:', error);
            Utils.showToast('Failed to process geometry file: ' + error.message, 'error');
        }
    }

    /**
     * Handle .animation.json file upload for console-model
     */
    async function handleAnimationJsonUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            Utils.showToast('Processing animation file...', 'info');

            const content = await Utils.readFileAsText(file);
            const animJson = JSON.parse(content);

            // Validate it's an animation file
            if (!animJson.animations && !animJson.format_version) {
                Utils.showToast('Invalid animation file format', 'error');
                return;
            }

            // Store in form dataset
            const form = document.getElementById('toolForm');
            let processedData = {};
            try {
                processedData = JSON.parse(form.dataset.processedModel || '{}');
            } catch (e) {
                processedData = {};
            }

            processedData.animations = animJson;

            // Try to match animations to controls and travel states
            if (animJson.animations) {
                const animNames = Object.keys(animJson.animations);
                const travelAnimations = {};

                // First, find explicit matches for demat/mat (must contain the word)
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

                processedData.travelAnimations = travelAnimations;
            }

            form.dataset.processedModel = JSON.stringify(processedData);

            // Update preview
            updateConsoleModelPreview(processedData);

            Utils.showToast('Animation file loaded!', 'success');
        } catch (error) {
            console.error('Error processing animation.json:', error);
            Utils.showToast('Failed to process animation file: ' + error.message, 'error');
        }
    }

    /**
     * Handle .geo.json file upload for exterior-model
     */
    async function handleExteriorGeoUpload(event, modelType) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            Utils.showToast(`Processing ${modelType} geometry...`, 'info');

            const content = await Utils.readFileAsText(file);
            const geoJson = JSON.parse(content);

            // Validate it's a geo.json file
            if (!geoJson['minecraft:geometry'] && !geoJson.format_version) {
                Utils.showToast('Invalid geometry file format', 'error');
                return;
            }

            // Store in form dataset
            const form = document.getElementById('toolForm');
            let processedData = {};
            try {
                processedData = JSON.parse(form.dataset.processedExterior || '{}');
            } catch (e) {
                processedData = {};
            }

            if (modelType === 'exterior') {
                processedData.exteriorGeo = geoJson;
            } else if (modelType === 'door') {
                processedData.doorGeo = geoJson;
            }

            form.dataset.processedExterior = JSON.stringify(processedData);

            // Update preview
            updateExteriorModelPreview(processedData);

            // Update 3D preview for exterior model
            if (modelType === 'exterior' && typeof ModelPreview !== 'undefined' && ModelPreview.isAvailable()) {
                const textureInput = document.getElementById('texture');
                let textureUrl = null;
                if (textureInput?.files[0]) {
                    textureUrl = await readFileAsDataUrl(textureInput.files[0]);
                }
                ModelPreview.loadGeometry(geoJson, textureUrl);
            }

            Utils.showToast(`${modelType.charAt(0).toUpperCase() + modelType.slice(1)} geometry loaded!`, 'success');
        } catch (error) {
            console.error('Error processing geo.json:', error);
            Utils.showToast('Failed to process geometry file: ' + error.message, 'error');
        }
    }

    /**
     * Handle .animation.json file upload for exterior-model door
     */
    async function handleExteriorAnimationUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            Utils.showToast('Processing door animations...', 'info');

            const content = await Utils.readFileAsText(file);
            const animJson = JSON.parse(content);

            // Validate it's an animation file
            if (!animJson.animations && !animJson.format_version) {
                Utils.showToast('Invalid animation file format', 'error');
                return;
            }

            // Store in form dataset
            const form = document.getElementById('toolForm');
            let processedData = {};
            try {
                processedData = JSON.parse(form.dataset.processedExterior || '{}');
            } catch (e) {
                processedData = {};
            }

            processedData.doorAnimations = animJson;

            // Try to detect door animations (open_left, open_right)
            if (animJson.animations) {
                const animNames = Object.keys(animJson.animations);
                const leftAnim = animNames.find(n => n.toLowerCase().includes('left') || n.toLowerCase().includes('open_l'));
                const rightAnim = animNames.find(n => n.toLowerCase().includes('right') || n.toLowerCase().includes('open_r'));

                if (leftAnim) processedData.leftAnimation = leftAnim;
                if (rightAnim) processedData.rightAnimation = rightAnim;
            }

            form.dataset.processedExterior = JSON.stringify(processedData);

            // Update preview
            updateExteriorModelPreview(processedData);

            Utils.showToast('Door animations loaded!', 'success');
        } catch (error) {
            console.error('Error processing animation.json:', error);
            Utils.showToast('Failed to process animation file: ' + error.message, 'error');
        }
    }

    /**
     * Update console model preview UI
     */
    function updateConsoleModelPreview(processedData) {
        const controlsPreview = document.getElementById('controlsPreview');
        const controlsList = document.getElementById('controlsList');
        const animationsPreview = document.getElementById('animationsPreview');
        const animationsList = document.getElementById('animationsList');

        let hasContent = false;

        // Show controls if available
        if (processedData.controls && processedData.controls.length > 0) {
            controlsPreview?.classList.remove('hidden');
            if (controlsList) {
                controlsList.innerHTML = processedData.controls.map(c => `
                    <div class="control-item">
                        <span class="control-id">${c.controlId}</span>
                        <span class="control-group">${c.groupName}</span>
                        ${c.animation ? `<span class="control-anim"><i class="fa-solid fa-film"></i> ${c.animation}</span>` : ''}
                    </div>
                `).join('');
            }
            hasContent = true;
        }

        // Show travel animations if available
        if (processedData.travelAnimations && Object.keys(processedData.travelAnimations).length > 0) {
            animationsPreview?.classList.remove('hidden');
            if (animationsList) {
                animationsList.innerHTML = Object.entries(processedData.travelAnimations).map(([key, value]) => `
                    <div class="animation-item">
                        <span class="anim-type">${key}</span>
                        <span class="anim-name">${value}</span>
                    </div>
                `).join('');
            }
            hasContent = true;
        }

        // Show geometry info
        if (processedData.geometry) {
            controlsPreview?.classList.remove('hidden');
            const boneCount = processedData.geometry['minecraft:geometry']?.[0]?.bones?.length || 0;
            const existingHtml = controlsList?.innerHTML || '';
            if (!existingHtml.includes('Geometry')) {
                controlsList.innerHTML = `<div class="control-item"><span class="control-id">Geometry</span><span class="control-group">${boneCount} bones</span></div>` + existingHtml;
            }
        }

        // Show animation info
        if (processedData.animations) {
            animationsPreview?.classList.remove('hidden');
            const animCount = Object.keys(processedData.animations.animations || {}).length;
            const existingHtml = animationsList?.innerHTML || '';
            if (!existingHtml.includes('Total Animations')) {
                animationsList.innerHTML = `<div class="animation-item"><span class="anim-type">Total Animations</span><span class="anim-name">${animCount}</span></div>` + existingHtml;
            }
        }
    }

    /**
     * Update exterior model preview UI
     */
    function updateExteriorModelPreview(processedData) {
        const preview = document.getElementById('exteriorModelPreview');
        const info = document.getElementById('exteriorModelInfo');

        if (!preview || !info) return;

        preview.classList.remove('hidden');

        let infoHtml = '';
        if (processedData.exteriorGeo) {
            const boneCount = processedData.exteriorGeo['minecraft:geometry']?.[0]?.bones?.length || 0;
            infoHtml += `<div class="control-item"><span class="control-id">Exterior Model</span><span class="control-group">${boneCount} bones</span></div>`;
        }
        if (processedData.doorGeo) {
            const boneCount = processedData.doorGeo['minecraft:geometry']?.[0]?.bones?.length || 0;
            infoHtml += `<div class="control-item"><span class="control-id">Door Model</span><span class="control-group">${boneCount} bones</span></div>`;
        }
        if (processedData.doorAnimations) {
            const animCount = Object.keys(processedData.doorAnimations.animations || {}).length;
            infoHtml += `<div class="control-item"><span class="control-id">Door Animations</span><span class="control-group">${animCount} animations</span></div>`;
            if (processedData.leftAnimation) {
                infoHtml += `<div class="animation-item"><span class="anim-type">Left Door</span><span class="anim-name">${processedData.leftAnimation}</span></div>`;
            }
            if (processedData.rightAnimation) {
                infoHtml += `<div class="animation-item"><span class="anim-type">Right Door</span><span class="anim-name">${processedData.rightAnimation}</span></div>`;
            }
        }

        info.innerHTML = infoHtml;
    }

    /**
     * Handle BBModel file upload
     */
    async function handleBBModelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        let namespace = SharedState.getNamespace();
        if (!namespace) {
            Utils.showToast('Please set a namespace first!', 'warning');
            return;
        }

        const id = document.getElementById('id').value || 'custom_console';
        const name = document.getElementById('name').value || '';

        try {
            Utils.showToast('Processing model...', 'info');

            const result = await BBModelParser.processModel(file, namespace, id, {
                name: name || Utils.formatAndCapitalize(id),
                emission: !!document.getElementById('emission').files[0],
                transformations: {
                    offset: [
                        parseFloat(document.getElementById('offsetX')?.value) || 0.5,
                        parseFloat(document.getElementById('offsetY')?.value) || 0.2,
                        parseFloat(document.getElementById('offsetZ')?.value) || -0.5
                    ],
                    scale: [1, 1, 1],
                    rotation: [
                        parseFloat(document.getElementById('rotX')?.value) || 0,
                        parseFloat(document.getElementById('rotY')?.value) || 0,
                        parseFloat(document.getElementById('rotZ')?.value) || 0
                    ]
                }
            });

            // Show detected controls
            const controlsPreview = document.getElementById('controlsPreview');
            const controlsList = document.getElementById('controlsList');

            if (result.controls.length > 0) {
                controlsPreview.classList.remove('hidden');
                controlsList.innerHTML = result.controls.map(c => `
                    <div class="control-item">
                        <span class="control-id">${c.controlId}</span>
                        <span class="control-group">${c.groupName}</span>
                        ${c.animation ? `<span class="control-anim"><i class="fa-solid fa-film"></i> ${c.animation}</span>` : ''}
                    </div>
                `).join('');
            }

            // Show matched travel animations
            const animationsPreview = document.getElementById('animationsPreview');
            const animationsList = document.getElementById('animationsList');

            if (Object.keys(result.travelAnimations).length > 0) {
                animationsPreview.classList.remove('hidden');
                animationsList.innerHTML = Object.entries(result.travelAnimations).map(([key, value]) => `
                    <div class="animation-item">
                        <span class="anim-type">${key}</span>
                        <span class="anim-name">${value}</span>
                    </div>
                `).join('');
            }

            // Store processed data for form submission
            document.getElementById('toolForm').dataset.processedModel = JSON.stringify(result);

            // Update 3D preview if enabled
            if (typeof is3DPreviewEnabled === 'function' && is3DPreviewEnabled() &&
                typeof ModelPreview !== 'undefined' && ModelPreview.isAvailable()) {
                ModelPreview.loadGeometry(result.geometry);

                // Check if texture is uploaded and apply it
                const textureInput = document.getElementById('texture');
                if (textureInput?.files[0]) {
                    const textureUrl = await readFileAsDataUrl(textureInput.files[0]);
                    ModelPreview.updateTexture(textureUrl);
                }
            }

            Utils.showToast(`Detected ${result.controls.length} controls!`, 'success');
        } catch (error) {
            console.error('Error processing bbmodel:', error);
            Utils.showToast('Failed to process model: ' + error.message, 'error');
        }
    }

    /**
     * Load custom parent model geometry for variant preview
     */
    async function loadCustomParentModelForPreview(parentValue, modelType) {
        if (!parentValue || typeof ModelPreview === 'undefined' || !ModelPreview.isAvailable()) {
            return;
        }

        // Check if this is a custom model from the pack
        const namespace = SharedState.getNamespace();
        const stack = SharedState.getStack();

        // Find matching custom model in the stack
        let customModel = null;

        if (modelType === 'console') {
            // Look for console-model items
            customModel = stack.find(item =>
                item.type === 'console-model' &&
                (parentValue === `${namespace}:${item.data.id}` || parentValue === item.data.id)
            );
        } else if (modelType === 'exterior') {
            // Look for exterior-model items
            customModel = stack.find(item =>
                item.type === 'exterior-model' &&
                (parentValue === `${namespace}:${item.data.id}` || parentValue === item.data.id)
            );
        }

        if (customModel && customModel.files) {
            try {
                // Get geometry file
                let geoFile = null;
                if (modelType === 'console') {
                    geoFile = customModel.files.geometry;
                } else if (modelType === 'exterior') {
                    geoFile = customModel.files.exteriorGeo;
                }

                if (geoFile) {
                    const content = await Utils.readFileAsText(geoFile);
                    const geoJson = JSON.parse(content);

                    // Get texture if available
                    let textureUrl = null;
                    const textureInput = document.getElementById('texture');
                    if (textureInput?.files[0]) {
                        textureUrl = await readFileAsDataUrl(textureInput.files[0]);
                    }

                    ModelPreview.loadGeometry(geoJson, textureUrl);
                    Utils.showToast('Loaded custom model for preview', 'info');
                }
            } catch (error) {
                console.error('Error loading custom parent model:', error);
            }
        } else {
            // Not a custom model - clear the preview or show placeholder
            ModelPreview.clear();
        }
    }

    /**
     * Read file as data URL helper
     */
    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Handle texture upload and update 3D preview
     */
    async function handleTextureUploadForPreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (typeof ModelPreview !== 'undefined' && ModelPreview.isAvailable()) {
            try {
                const textureUrl = await readFileAsDataUrl(file);
                ModelPreview.updateTexture(textureUrl);
            } catch (error) {
                console.error('Error updating texture preview:', error);
            }
        }
    }

    /**
     * Handle BBModel file upload for exterior models
     */
    async function handleExteriorBBModelUpload(event, modelType) {
        const file = event.target.files[0];
        if (!file) return;

        let namespace = SharedState.getNamespace();
        if (!namespace) {
            Utils.showToast('Please set a namespace first!', 'warning');
            return;
        }

        const id = document.getElementById('id').value || 'custom_exterior';

        try {
            Utils.showToast(`Processing ${modelType} model...`, 'info');

            const content = await Utils.readFileAsText(file);
            const model = JSON.parse(content);

            // Extract geometry
            const geometry = BBModelParser.extractGeometry(model);

            // Extract animations if present
            const animations = BBModelParser.extractAnimations(model);

            // Store in form dataset
            const form = document.getElementById('toolForm');
            let processedData = {};
            try {
                processedData = JSON.parse(form.dataset.processedExterior || '{}');
            } catch (e) {
                processedData = {};
            }

            if (modelType === 'exterior') {
                processedData.exteriorGeo = geometry;
                processedData.exteriorAnimations = animations;
            } else if (modelType === 'door') {
                processedData.doorGeo = geometry;
                processedData.doorAnimations = animations;

                // Try to detect door animations (open_left, open_right)
                if (animations && animations.animations) {
                    const animNames = Object.keys(animations.animations);
                    const leftAnim = animNames.find(n => n.toLowerCase().includes('left') || n.toLowerCase().includes('open_l'));
                    const rightAnim = animNames.find(n => n.toLowerCase().includes('right') || n.toLowerCase().includes('open_r'));

                    if (leftAnim) processedData.leftAnimation = leftAnim;
                    if (rightAnim) processedData.rightAnimation = rightAnim;
                }
            }

            form.dataset.processedExterior = JSON.stringify(processedData);

            // Update preview
            const preview = document.getElementById('exteriorModelPreview');
            const info = document.getElementById('exteriorModelInfo');

            preview.classList.remove('hidden');

            let infoHtml = '';
            if (processedData.exteriorGeo) {
                const boneCount = processedData.exteriorGeo['minecraft:geometry']?.[0]?.bones?.length || 0;
                infoHtml += `<div class="control-item"><span class="control-id">Exterior Model</span><span class="control-group">${boneCount} bones</span></div>`;
            }
            if (processedData.doorGeo) {
                const boneCount = processedData.doorGeo['minecraft:geometry']?.[0]?.bones?.length || 0;
                infoHtml += `<div class="control-item"><span class="control-id">Door Model</span><span class="control-group">${boneCount} bones</span></div>`;
            }
            if (processedData.doorAnimations) {
                const animCount = Object.keys(processedData.doorAnimations.animations || {}).length;
                infoHtml += `<div class="control-item"><span class="control-id">Door Animations</span><span class="control-group">${animCount} animations</span></div>`;
                if (processedData.leftAnimation) {
                    infoHtml += `<div class="animation-item"><span class="anim-type">Left Door</span><span class="anim-name">${processedData.leftAnimation}</span></div>`;
                }
                if (processedData.rightAnimation) {
                    infoHtml += `<div class="animation-item"><span class="anim-type">Right Door</span><span class="anim-name">${processedData.rightAnimation}</span></div>`;
                }
            }

            info.innerHTML = infoHtml;

            // Update 3D preview for exterior model
            if (modelType === 'exterior' && typeof ModelPreview !== 'undefined' && ModelPreview.isAvailable()) {
                const textureInput = document.getElementById('texture');
                let textureUrl = null;
                if (textureInput?.files[0]) {
                    textureUrl = await readFileAsDataUrl(textureInput.files[0]);
                }
                ModelPreview.loadGeometry(geometry, textureUrl);
            }

            Utils.showToast(`${modelType.charAt(0).toUpperCase() + modelType.slice(1)} model processed!`, 'success');
        } catch (error) {
            console.error('Error processing exterior bbmodel:', error);
            Utils.showToast('Failed to process model: ' + error.message, 'error');
        }
    }

    /**
     * Handle form submission
     */
    async function handleFormSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        const files = {};

        // If editing, start with existing files
        if (editingItemId && editingItemFiles) {
            Object.assign(files, editingItemFiles);
        }

        // Process form data - new file uploads override existing
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                files[key] = value;
            } else if (typeof value === 'string') {
                data[key] = value;
            }
        }

        // Handle array inputs (fabricator, mugs)
        const inputItems = form.querySelectorAll('[name="inputItem[]"]');
        if (inputItems.length > 0) {
            data.inputs = [];
            inputItems.forEach((input, i) => {
                if (input.value) {
                    data.inputs.push({
                        item: input.value,
                        minCount: form.querySelectorAll('[name="inputMin[]"]')[i]?.value || 1,
                        maxCount: form.querySelectorAll('[name="inputMax[]"]')[i]?.value || 1
                    });
                }
            });
        }

        const potionItems = form.querySelectorAll('[name="potionId[]"]');
        if (potionItems.length > 0) {
            data.potions = [];
            potionItems.forEach((input, i) => {
                if (input.value) {
                    data.potions.push({
                        id: input.value,
                        duration: form.querySelectorAll('[name="potionDuration[]"]')[i]?.value || 200,
                        amplifier: form.querySelectorAll('[name="potionAmplifier[]"]')[i]?.value || 0
                    });
                }
            });
        }

        // Handle checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        // Handle custom parent/category for exterior
        if (currentTool === 'exterior') {
            if (data.parent === 'custom' && data.customParent) {
                data.parent = data.customParent;
            }
            if (data.category === 'custom' && data.customCategory) {
                data.category = data.customCategory;
            }
        }

        // Handle processed bbmodel data for console-model
        if (currentTool === 'console-model') {
            const processed = form.dataset.processedModel ? JSON.parse(form.dataset.processedModel) : {};
            const namespace = SharedState.getNamespace();

            // Copy over any processed data (from bbmodel, geo.json, or animation.json uploads)
            if (processed.geometry) data.geometry = processed.geometry;
            if (processed.animations) data.animations = processed.animations;
            if (processed.controls) data.controls = processed.controls;
            if (processed.travelAnimations) data.travelAnimations = processed.travelAnimations;

            // If we have a full consoleJson from bbmodel processing, use it
            // Otherwise generate one
            if (processed.consoleJson) {
                data.consoleJson = processed.consoleJson;
            } else {
                // Generate console JSON from the available data
                data.consoleJson = {
                    id: `${namespace}:${data.id}`,
                    type: {
                        id: `${namespace}:${data.id}`,
                        name: data.name || Utils.formatAndCapitalize(data.id),
                        controls: data.controls || []
                    },
                    texture: `${namespace}:textures/${data.id}.png`,
                    model: `${namespace}:${data.id}`,
                    transformations: {
                        offset: [parseFloat(data.offsetX) || 0.5, parseFloat(data.offsetY) || 0.2, parseFloat(data.offsetZ) || -0.5],
                        scale: [1, 1, 1],
                        rotation: [parseFloat(data.rotX) || 0, parseFloat(data.rotY) || 0, parseFloat(data.rotZ) || 0]
                    },
                    animations: {}
                };

                // Add travel animations if detected
                if (data.travelAnimations) {
                    for (const [key, value] of Object.entries(data.travelAnimations)) {
                        if (value) {
                            data.consoleJson.animations[key] = `${data.id}:${value}`;
                        }
                    }
                }

                if (files.emission) {
                    data.consoleJson.emission = `${namespace}:textures/${data.id}_emission.png`;
                }
            }
        }

        // Handle processed data for exterior-model
        if (currentTool === 'exterior-model') {
            const namespace = SharedState.getNamespace();
            let processedData = {};
            try {
                processedData = JSON.parse(form.dataset.processedExterior || '{}');
            } catch (e) {
                processedData = {};
            }

            // Store processed geometry/animations
            if (processedData.exteriorGeo) {
                data.exteriorGeo = processedData.exteriorGeo;
            }
            if (processedData.doorGeo) {
                data.doorGeo = processedData.doorGeo;
            }
            if (processedData.doorAnimations) {
                data.doorAnimations = processedData.doorAnimations;
            }

            // Store detected animation names
            data.leftAnimation = processedData.leftAnimation || 'open_left';
            data.rightAnimation = processedData.rightAnimation || 'open_right';
        }

        // Add or update item
        if (editingItemId) {
            SharedState.updateStackItem(editingItemId, data, files);
            Utils.showToast('Item updated!', 'success');
            editingItemId = null;
        } else {
            SharedState.addToStack(currentTool, data, files);
            Utils.showToast('Added to pack!', 'success');
        }

        // Clear form and update UI
        clearForm();
        updateStackUI();
    }

    /**
     * Get current form data and files without clearing the form
     * Used to preserve state when toggling 3D preview
     */
    function getCurrentFormData() {
        const form = document.getElementById('toolForm');
        if (!form) return { data: null, files: null };

        const formData = new FormData(form);
        const data = {};
        const files = { ...editingItemFiles }; // Start with existing files

        // Process form data
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                files[key] = value;
            } else if (typeof value === 'string') {
                data[key] = value;
            }
        }

        // Handle array inputs (fabricator, mugs)
        const inputItems = form.querySelectorAll('[name="inputItem[]"]');
        if (inputItems.length > 0) {
            data.inputs = [];
            inputItems.forEach((input, i) => {
                if (input.value) {
                    data.inputs.push({
                        item: input.value,
                        minCount: form.querySelectorAll('[name="inputMin[]"]')[i]?.value || 1,
                        maxCount: form.querySelectorAll('[name="inputMax[]"]')[i]?.value || 1
                    });
                }
            });
        }

        const potionItems = form.querySelectorAll('[name="potionId[]"]');
        if (potionItems.length > 0) {
            data.potions = [];
            potionItems.forEach((input, i) => {
                if (input.value) {
                    data.potions.push({
                        id: input.value,
                        duration: form.querySelectorAll('[name="potionDuration[]"]')[i]?.value || 200,
                        amplifier: form.querySelectorAll('[name="potionAmplifier[]"]')[i]?.value || 0
                    });
                }
            });
        }

        // Handle checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        // Handle processed bbmodel data
        if (form.dataset.processedModel) {
            data._processedModel = form.dataset.processedModel;
        }

        // Handle controls data
        const controlsContainer = document.getElementById('consoleControlsList') || document.getElementById('exteriorControlsList');
        if (controlsContainer) {
            const controlItems = controlsContainer.querySelectorAll('.control-item');
            data._controls = [];
            controlItems.forEach(item => {
                data._controls.push({
                    id: item.querySelector('[data-control-id]')?.dataset.controlId || item.querySelector('.control-name')?.textContent,
                    type: item.querySelector('.control-type')?.value,
                    sequence: item.querySelector('.control-sequence')?.checked || false
                });
            });
        }

        return { data, files };
    }

    /**
     * Clear the form and workspace
     */
    function clearForm() {
        editingItemId = null;
        editingItemFiles = {};
        currentTool = null;
        const workspace = document.getElementById('workspace');
        if (workspace) {
            workspace.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-toolbox"></i>
                    <h3>Select a Tool</h3>
                    <p>Choose a tool from the dropdown above to add items to your pack</p>
                </div>
            `;
        }
        const selector = document.getElementById('toolSelector');
        if (selector) selector.value = '';
    }

    /**
     * Edit an existing stack item
     */
    function editItem(itemId) {
        const stack = SharedState.getStack();
        const item = stack.find(i => i.id === itemId);
        if (!item) return;

        editingItemId = itemId;
        editingItemFiles = item.files || {}; // Store existing files for reference
        renderTool(item.type, item.data, item.files);
    }

    /**
     * Update the stack sidebar UI
     */
    function updateStackUI() {
        const stackContainer = document.getElementById('stackItems');
        if (!stackContainer) return;

        const stack = SharedState.getStack();

        if (stack.length === 0) {
            stackContainer.innerHTML = `
                <div class="empty-stack">
                    <p>No items yet</p>
                </div>
            `;
            return;
        }

        stackContainer.innerHTML = stack.map(item => {
            const tool = TOOLS[item.type] || { name: item.type, icon: 'fa-question' };
            return `
                <div class="stack-item" data-id="${item.id}">
                    <div class="stack-item-icon">
                        <i class="fa-solid ${tool.icon}"></i>
                    </div>
                    <div class="stack-item-info">
                        <span class="stack-item-type">${tool.name}</span>
                        <span class="stack-item-id">${item.data.id || item.data.name || 'Unnamed'}</span>
                    </div>
                    <div class="stack-item-actions">
                        <button type="button" class="btn-icon" onclick="ToolManager.editItem('${item.id}')" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger" onclick="ToolManager.removeItem('${item.id}')" title="Remove">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Remove an item from stack
     */
    function removeItem(itemId) {
        if (confirm('Remove this item from the pack?')) {
            SharedState.removeFromStack(itemId);
            updateStackUI();
            Utils.showToast('Item removed', 'info');
        }
    }

    /**
     * Add fabricator input row
     */
    function addFabricatorInput() {
        const list = document.getElementById('inputsList');
        const div = document.createElement('div');
        div.className = 'input-item';
        div.innerHTML = `
            <input type="text" name="inputItem[]" placeholder="minecraft:iron_ingot" required>
            <input type="number" name="inputMin[]" min="1" value="1" placeholder="Min">
            <input type="number" name="inputMax[]" min="1" value="1" placeholder="Max">
            <button type="button" class="btn-icon" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        list.appendChild(div);
    }

    /**
     * Add potion effect row
     */
    function addPotionEffect() {
        const list = document.getElementById('potionsList');
        const div = document.createElement('div');
        div.className = 'potion-item';
        div.innerHTML = `
            <input type="text" name="potionId[]" placeholder="minecraft:speed" required>
            <input type="number" name="potionDuration[]" min="1" value="200" placeholder="Duration">
            <input type="number" name="potionAmplifier[]" min="0" value="0" placeholder="Amplifier">
            <button type="button" class="btn-icon" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        list.appendChild(div);
    }

    return {
        TOOLS,
        CONSOLE_PARENTS,
        EXTERIOR_PARENTS,
        EXTERIOR_CATEGORIES,
        getToolInfo,
        getAllTools,
        getCurrentTool,
        getCurrentFormData,
        renderToolSelector,
        renderTool,
        clearForm,
        editItem,
        removeItem,
        updateStackUI,
        addFabricatorInput,
        addPotionEffect
    };
})();

if (typeof window !== 'undefined') {
    window.ToolManager = ToolManager;
}

