/**
 * Model Preview - 3D renderer for Bedrock geometry models
 * Based on coordinate transformations from sakitus/BedrockModel.java
 */

const ModelPreview = (function() {
    'use strict';

    let scene, camera, renderer, controls;
    let currentModel = null;
    let animationId = null;
    let container = null;
    let autoRotate = true;
    let currentTexture = null;

    // Java item model state
    let currentItemModelJson = null;
    let currentDisplayTransform = 'none';
    let availableDisplayTransforms = [];
    let isJavaItemModel = false;

    /**
     * Initialize the 3D preview renderer
     */
    function init(containerId) {
        container = document.getElementById(containerId);
        if (!container || typeof THREE === 'undefined') {
            console.warn('ModelPreview: Container not found or Three.js not loaded');
            return false;
        }

        // Clear any existing content
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) existingCanvas.remove();

        const msg = container.querySelector('.preview-message');
        if (msg) msg.style.display = 'none';

        const width = container.clientWidth || 350;
        const height = container.clientHeight || 350;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // Camera - positioned to view model from front
        camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000);
        camera.position.set(0, 30, 80);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Controls
        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.autoRotate = autoRotate;
            controls.autoRotateSpeed = 1.5;
            controls.target.set(0, 20, 0);
            controls.minDistance = 10;
            controls.maxDistance = 300;
        }

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-50, 50, -50);
        scene.add(fillLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(80, 40, 0x4ade80, 0x2a2a3e);
        gridHelper.position.y = 0;
        scene.add(gridHelper);

        // Start animation loop
        animate();

        // Handle resize
        const resizeObserver = new ResizeObserver(() => onWindowResize());
        resizeObserver.observe(container);

        return true;
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function onWindowResize() {
        if (!container || !camera || !renderer) return;
        const width = container.clientWidth || 350;
        const height = container.clientHeight || 350;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    /**
     * Load and display a Bedrock geometry model
     */
    function loadGeometry(geoJson, textureDataUrl = null) {
        if (!scene) {
            console.warn('ModelPreview: Scene not initialized');
            return;
        }

        // Remove existing model
        if (currentModel) {
            scene.remove(currentModel);
            disposeObject(currentModel);
            currentModel = null;
        }

        // Hide placeholder message
        if (container) {
            const msg = container.querySelector('.preview-message');
            if (msg) msg.style.display = 'none';
        }

        if (!geoJson) {
            showMessage('<i class="fa-solid fa-cube"></i>Upload a model to preview');
            return;
        }

        // This is a Bedrock model, not a Java item model
        isJavaItemModel = false;

        // Handle format
        let geometry;
        if (geoJson['minecraft:geometry']) {
            geometry = geoJson['minecraft:geometry'][0];
        } else if (geoJson.bones) {
            geometry = geoJson;
        } else {
            showMessage('<i class="fa-solid fa-exclamation-triangle"></i>Invalid model format');
            return;
        }

        const description = geometry.description || {};
        const textureWidth = description.texture_width || 64;
        const textureHeight = description.texture_height || 64;
        const bones = geometry.bones || [];

        if (bones.length === 0) {
            showMessage('<i class="fa-solid fa-cube"></i>No bones found in model');
            return;
        }

        // Create root model group
        currentModel = new THREE.Group();
        currentModel.name = 'bedrock_model';

        if (textureDataUrl) {
            currentTexture = textureDataUrl;
        }

        // Create material
        const material = createMaterial(textureDataUrl);

        // Build bone map for hierarchy lookup
        const boneMap = new Map();
        for (const bone of bones) {
            boneMap.set(bone.name, bone);
        }

        // Build bone hierarchy as Three.js groups
        const boneGroups = new Map();

        // First pass: create all bone groups
        for (const bone of bones) {
            const group = new THREE.Group();
            group.name = bone.name;
            boneGroups.set(bone.name, group);
        }

        // Second pass: set up hierarchy and transforms
        for (const bone of bones) {
            const group = boneGroups.get(bone.name);
            const pivot = bone.pivot || [0, 0, 0];

            if (bone.parent && boneMap.has(bone.parent)) {
                const parentBone = boneMap.get(bone.parent);
                const parentGroup = boneGroups.get(bone.parent);
                const parentPivot = parentBone.pivot || [0, 0, 0];

                // Position relative to parent (from BedrockModel.java)
                // X and Z are negated: -(parent.pivot.x - bone.pivot.x)
                group.position.set(
                    -(parentPivot[0] - pivot[0]),
                    parentPivot[1] - pivot[1],
                    -(parentPivot[2] - pivot[2])
                );

                parentGroup.add(group);
            } else {
                // Root bone - position at origin
                group.position.set(0, 0, 0);
                currentModel.add(group);
            }

            // Apply bone rotation (radians, no negation)
            if (bone.rotation) {
                group.rotation.order = 'ZYX';
                group.rotation.set(
                    THREE.MathUtils.degToRad(bone.rotation[0]),
                    THREE.MathUtils.degToRad(bone.rotation[1]),
                    THREE.MathUtils.degToRad(bone.rotation[2])
                );
            }

            // Add cubes to this bone
            if (bone.cubes && bone.cubes.length > 0) {
                for (const cube of bone.cubes) {
                    const mesh = createCubeMesh(cube, bone, material.clone(), textureWidth, textureHeight, boneGroups);
                    if (mesh) {
                        // If cube has its own rotation, it's already a group with correct transform
                        // Otherwise it's a mesh that goes directly into the bone group
                        if (cube.rotation && (cube.rotation[0] !== 0 || cube.rotation[1] !== 0 || cube.rotation[2] !== 0)) {
                            group.add(mesh);
                        } else {
                            group.add(mesh);
                        }
                    }
                }
            }
        }

        // Rotate the model 180 degrees around X axis to flip it right-side up
        currentModel.rotation.x = Math.PI;

        // Center the model horizontally
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        currentModel.position.x = -center.x;
        currentModel.position.z = -center.z;

        scene.add(currentModel);

        // Adjust camera
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.8;

        camera.position.set(0, center.y, distance);
        if (controls) {
            controls.target.set(0, center.y - currentModel.position.y, 0);
            controls.update();
        }
    }

    /**
     * Create material with optional texture
     * @param {string} textureDataUrl - Data URL of the texture
     * @param {boolean} flipY - Whether to flip the texture vertically (true for Bedrock, false for Java)
     */
    function createMaterial(textureDataUrl, flipY = true) {
        if (textureDataUrl) {
            const texture = new THREE.TextureLoader().load(textureDataUrl, () => {
                // Force re-render when texture loads
                if (renderer && scene && camera) {
                    renderer.render(scene, camera);
                }
            });
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = flipY;

            return new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.01,
                side: THREE.DoubleSide
            });
        } else {
            return new THREE.MeshLambertMaterial({
                color: 0x4ade80,
                wireframe: false,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide
            });
        }
    }

    /**
     * Create a cube mesh with correct Bedrock->Minecraft coordinate transforms
     */
    function createCubeMesh(cube, bone, material, texWidth, texHeight, boneGroups) {
        const origin = cube.origin || [0, 0, 0];
        const size = cube.size || [0, 0, 0];
        const inflate = cube.inflate || 0;
        const bonePivot = bone.pivot || [0, 0, 0];

        // Skip empty cubes
        if (size[0] === 0 && size[1] === 0 && size[2] === 0) {
            return null;
        }

        // Apply inflation to size
        const actualSize = [
            size[0] + inflate * 2,
            size[1] + inflate * 2,
            size[2] + inflate * 2
        ];

        // Adjust origin for inflation
        const adjustedOrigin = [
            origin[0] - inflate,
            origin[1] - inflate,
            origin[2] - inflate
        ];

        // Determine pivot point for this cube
        const cubePivot = cube.pivot || bonePivot;

        // Create geometry
        let geo;
        const isPlane = size[0] === 0 || size[1] === 0 || size[2] === 0;

        if (isPlane) {
            // Handle plane geometry
            if (size[0] === 0) {
                geo = new THREE.PlaneGeometry(Math.max(0.01, actualSize[2]), Math.max(0.01, actualSize[1]));
                geo.rotateY(Math.PI / 2);
            } else if (size[1] === 0) {
                geo = new THREE.PlaneGeometry(Math.max(0.01, actualSize[0]), Math.max(0.01, actualSize[2]));
                geo.rotateX(-Math.PI / 2);
            } else {
                geo = new THREE.PlaneGeometry(Math.max(0.01, actualSize[0]), Math.max(0.01, actualSize[1]));
            }
        } else {
            geo = new THREE.BoxGeometry(
                Math.max(0.01, actualSize[0]),
                Math.max(0.01, actualSize[1]),
                Math.max(0.01, actualSize[2])
            );

            // Apply UV mapping
            if (cube.uv !== undefined) {
                applyBoxUV(geo, cube.uv, size, texWidth, texHeight, cube.mirror);
            }
        }

        const mesh = new THREE.Mesh(geo, material);

        // Calculate cube position relative to pivot (from BedrockModel.java)
        // cuboid(origin.x - pivot.x, -(origin.y - pivot.y + size.y), origin.z - pivot.z, ...)
        // But Three.js box is centered, so we need to add half the size to x and z,
        // and the Y calculation already accounts for the flip

        const cubeX = adjustedOrigin[0] - cubePivot[0] + actualSize[0] / 2;
        const cubeY = -(adjustedOrigin[1] - cubePivot[1] + actualSize[1]) + actualSize[1] / 2;
        const cubeZ = adjustedOrigin[2] - cubePivot[2] + actualSize[2] / 2;

        // If cube has its own rotation
        if (cube.rotation && (cube.rotation[0] !== 0 || cube.rotation[1] !== 0 || cube.rotation[2] !== 0)) {
            // Create a group for the rotated cube
            const cubeGroup = new THREE.Group();

            // Position the group relative to bone pivot (from BedrockModel.java)
            // ModelTransform.of(-(bone.pivot.x - cube.pivot.x), bone.pivot.y - cube.pivot.y, -(bone.pivot.z - cube.pivot.z), ...)
            cubeGroup.position.set(
                -(bonePivot[0] - cubePivot[0]),
                bonePivot[1] - cubePivot[1],
                -(bonePivot[2] - cubePivot[2])
            );

            // Apply cube rotation (radians, no negation - same as bones)
            cubeGroup.rotation.order = 'ZYX';
            cubeGroup.rotation.set(
                THREE.MathUtils.degToRad(cube.rotation[0]),
                THREE.MathUtils.degToRad(cube.rotation[1]),
                THREE.MathUtils.degToRad(cube.rotation[2])
            );

            // Position mesh relative to cube pivot
            mesh.position.set(cubeX, cubeY, cubeZ);

            cubeGroup.add(mesh);
            return cubeGroup;
        } else {
            // No cube rotation - position directly relative to bone pivot
            // Need to transform from cube pivot space to bone pivot space
            const boneRelX = adjustedOrigin[0] - bonePivot[0] + actualSize[0] / 2;
            const boneRelY = -(adjustedOrigin[1] - bonePivot[1] + actualSize[1]) + actualSize[1] / 2;
            const boneRelZ = adjustedOrigin[2] - bonePivot[2] + actualSize[2] / 2;

            mesh.position.set(boneRelX, boneRelY, boneRelZ);
            return mesh;
        }
    }

    /**
     * Apply Bedrock box UV mapping
     *
     * Bedrock UV layout (standard box unwrap starting at uv[0], uv[1]):
     *
     *           +-------+-------+
     *           |  Top  |Bottom |   (each is w × d)
     *       +---+-------+-------+---+
     *       | L |  Front|  R   |Back|  (L/R are d × h, Front/Back are w × h)
     *       +---+-------+-------+---+
     *       ^
     *       uv[0], uv[1]
     *
     * Since the model is rotated 180° around X axis:
     * - Three.js +Y shows what was -Y (bottom becomes visible from top)
     * - Three.js -Y shows what was +Y (top becomes visible from bottom)
     * - Three.js +Z shows what was -Z (back becomes visible from front)
     * - Three.js -Z shows what was +Z (front becomes visible from back)
     */
    function applyBoxUV(geometry, uv, size, texWidth, texHeight, mirror = false) {
        const uvAttr = geometry.attributes.uv;
        if (!uvAttr) return;

        // UV origin (top-left of the UV region in texture space)
        const u0 = uv[0] / texWidth;
        const v0 = uv[1] / texHeight;

        // Dimensions in UV space
        const w = size[0] / texWidth;   // width (X)
        const h = size[1] / texHeight;  // height (Y)
        const d = size[2] / texWidth;   // depth (Z) for U axis
        const dv = size[2] / texHeight; // depth (Z) for V axis

        // Define UV regions for Bedrock layout
        // These are in Bedrock texture space (origin top-left, V increases downward)
        const uvRegions = {
            top:    { u: u0 + d,         v: v0,       w: w,  h: dv },
            bottom: { u: u0 + d + w,     v: v0,       w: w,  h: dv },
            left:   { u: u0,             v: v0 + dv,  w: d,  h: h  },
            front:  { u: u0 + d,         v: v0 + dv,  w: w,  h: h  },
            right:  { u: u0 + d + w,     v: v0 + dv,  w: d,  h: h  },
            back:   { u: u0 + d + w + d, v: v0 + dv,  w: w,  h: h  }
        };

        // Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
        // Due to 180° X rotation:
        // +X (right) -> still right but upside down
        // -X (left) -> still left but upside down
        // +Y (top) -> shows bottom (flipped)
        // -Y (bottom) -> shows top (flipped)
        // +Z (front) -> shows back (flipped)
        // -Z (back) -> shows front (flipped)

        const faceMapping = [
            { region: 'right',  flipU: mirror, flipV: false, rotate: false },  // +X
            { region: 'left',   flipU: !mirror, flipV: false, rotate: false },  // -X
            { region: 'bottom', flipU: false,  flipV: false, rotate: false },  // +Y shows bottom
            { region: 'top',    flipU: false,  flipV: false, rotate: false },  // -Y shows top
            { region: 'back',   flipU: !mirror, flipV: false, rotate: false },  // +Z shows back
            { region: 'front',  flipU: mirror,  flipV: false, rotate: false }   // -Z shows front
        ];

        for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
            const mapping = faceMapping[faceIdx];
            const region = uvRegions[mapping.region];
            const baseIdx = faceIdx * 4;

            // Convert from Bedrock (top-left origin, V down) to Three.js (bottom-left origin, V up)
            // In Bedrock: v0 is top, v0+h is bottom
            // In Three.js: we need to flip so v0 maps to 1-v0 (top) and v0+h maps to 1-(v0+h) (bottom)
            let u1 = region.u;
            let u2 = region.u + region.w;
            let v1 = 1 - region.v;                // top in Three.js space (was top in Bedrock)
            let v2 = 1 - (region.v + region.h);   // bottom in Three.js space (was bottom in Bedrock)

            // Apply flips
            if (mapping.flipU) {
                [u1, u2] = [u2, u1];
            }
            if (mapping.flipV) {
                [v1, v2] = [v2, v1];
            }

            // Three.js BoxGeometry vertex order per face:
            // Looking at the face from outside:
            // 2---3
            // |   |
            // 0---1
            // So: 0=bottom-left, 1=bottom-right, 2=top-left, 3=top-right

            uvAttr.setXY(baseIdx + 0, u1, v2);  // bottom-left
            uvAttr.setXY(baseIdx + 1, u2, v2);  // bottom-right
            uvAttr.setXY(baseIdx + 2, u1, v1);  // top-left
            uvAttr.setXY(baseIdx + 3, u2, v1);  // top-right
        }

        uvAttr.needsUpdate = true;
    }

    /**
     * Load and display a Java/Minecraft item model (.json)
     * These models use elements with from/to coordinates and per-face UV mapping
     */
    function loadJavaItemModel(modelJson, textureDataUrl = null) {
        if (!scene) {
            console.warn('ModelPreview: Scene not initialized');
            return;
        }

        // Remove existing model
        if (currentModel) {
            scene.remove(currentModel);
            disposeObject(currentModel);
            currentModel = null;
        }

        // Hide placeholder message
        if (container) {
            const msg = container.querySelector('.preview-message');
            if (msg) msg.style.display = 'none';
        }

        if (!modelJson) {
            showMessage('<i class="fa-solid fa-cube"></i>Upload a model to preview');
            return;
        }

        // This is a Java item model
        isJavaItemModel = true;

        // Store for display transform switching
        currentItemModelJson = modelJson;
        if (textureDataUrl) {
            currentTexture = textureDataUrl;
        }

        // Extract available display transforms
        availableDisplayTransforms = ['none'];
        if (modelJson.display) {
            const displayKeys = Object.keys(modelJson.display);
            availableDisplayTransforms = availableDisplayTransforms.concat(displayKeys);
        }

        // Get texture size (default 16x16 for item models)
        let texWidth = 16, texHeight = 16;
        if (modelJson.texture_size) {
            texWidth = modelJson.texture_size[0];
            texHeight = modelJson.texture_size[1];
        }

        const elements = modelJson.elements || [];
        if (elements.length === 0) {
            showMessage('<i class="fa-solid fa-cube"></i>No elements found in model');
            return;
        }

        // Create root model group
        currentModel = new THREE.Group();
        currentModel.name = 'java_item_model';

        // Create material with flipY=true (we handle V inversion in UV mapping)
        const material = createMaterial(currentTexture, true);

        // Process each element
        for (const element of elements) {
            const mesh = createJavaElementMesh(element, material.clone(), texWidth, texHeight);
            if (mesh) {
                currentModel.add(mesh);
            }
        }

        // Apply display transform (default to 'ground' if available, otherwise 'none')
        if (availableDisplayTransforms.includes('ground')) {
            currentDisplayTransform = 'ground';
        } else {
            currentDisplayTransform = 'none';
        }
        applyDisplayTransform(currentDisplayTransform);

        scene.add(currentModel);

        // Adjust camera
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.5;

        camera.position.set(0, center.y, distance);
        if (controls) {
            controls.target.set(center.x, center.y, center.z);
            controls.update();
        }

        // Update dropdown if it exists
        updateDisplayTransformDropdown();
    }

    /**
     * Create a mesh from a Java item model element
     */
    function createJavaElementMesh(element, material, texWidth, texHeight) {
        const from = element.from || [0, 0, 0];
        const to = element.to || [16, 16, 16];

        // Calculate size and center position
        const sizeX = to[0] - from[0];
        const sizeY = to[1] - from[1];
        const sizeZ = to[2] - from[2];

        // Skip empty elements
        if (sizeX === 0 && sizeY === 0 && sizeZ === 0) {
            return null;
        }

        // Center position (Minecraft origin is at corner, Three.js box is centered)
        const centerX = (from[0] + to[0]) / 2 - 8; // Center around 8,8,8 (Minecraft item center)
        const centerY = (from[1] + to[1]) / 2 - 8;
        const centerZ = (from[2] + to[2]) / 2 - 8;

        // Create geometry
        const geometry = new THREE.BoxGeometry(
            Math.max(0.01, sizeX),
            Math.max(0.01, sizeY),
            Math.max(0.01, sizeZ)
        );

        // Apply per-face UV mapping
        if (element.faces) {
            applyJavaFaceUV(geometry, element.faces, from, to, texWidth, texHeight);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(centerX, centerY, centerZ);

        // Handle element rotation
        if (element.rotation) {
            const rot = element.rotation;
            const origin = rot.origin || [8, 8, 8];
            const axis = rot.axis || 'y';
            const angle = rot.angle || 0;
            const rescale = rot.rescale || false;

            // Create a pivot group
            const pivotGroup = new THREE.Group();
            pivotGroup.position.set(origin[0] - 8, origin[1] - 8, origin[2] - 8);

            // Position mesh relative to pivot
            mesh.position.set(
                centerX - (origin[0] - 8),
                centerY - (origin[1] - 8),
                centerZ - (origin[2] - 8)
            );

            // Apply rotation
            const angleRad = THREE.MathUtils.degToRad(angle);
            switch (axis) {
                case 'x':
                    pivotGroup.rotation.x = angleRad;
                    break;
                case 'y':
                    pivotGroup.rotation.y = angleRad;
                    break;
                case 'z':
                    pivotGroup.rotation.z = angleRad;
                    break;
            }

            // Handle rescale (used for 22.5 and 45 degree rotations)
            if (rescale) {
                const scale = 1 / Math.cos(Math.abs(angleRad));
                switch (axis) {
                    case 'x':
                        mesh.scale.y *= scale;
                        mesh.scale.z *= scale;
                        break;
                    case 'y':
                        mesh.scale.x *= scale;
                        mesh.scale.z *= scale;
                        break;
                    case 'z':
                        mesh.scale.x *= scale;
                        mesh.scale.y *= scale;
                        break;
                }
            }

            pivotGroup.add(mesh);
            return pivotGroup;
        }

        return mesh;
    }

    /**
     * Apply per-face UV mapping for Java item models
     * Java format uses [u1, v1, u2, v2] pixel coordinates with optional rotation
     * Note: u2 can be < u1 (horizontal flip) and v2 can be < v1 (vertical flip)
     *
     * With flipY=true on the texture (default for TextureLoader):
     * - Image top (row 0) maps to Three.js V=1
     * - Image bottom maps to Three.js V=0
     *
     * Minecraft UV v=0 means top of texture, v=texHeight means bottom
     * So we need to invert: threeV = 1 - (minecraft_v / texHeight)
     * This makes minecraft v=0 → Three.js V=1 (image top) and
     *              minecraft v=texHeight → Three.js V=0 (image bottom)
     */
    function applyJavaFaceUV(geometry, faces, from, to, texWidth, texHeight) {
        const uvAttr = geometry.attributes.uv;
        if (!uvAttr) return;

        // Three.js BoxGeometry face order: +X (east), -X (west), +Y (up), -Y (down), +Z (south), -Z (north)
        const faceOrder = ['east', 'west', 'up', 'down', 'south', 'north'];

        for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
            const faceName = faceOrder[faceIdx];
            const face = faces[faceName];

            if (!face || !face.uv) {
                // No UV defined, use default (transparent or full texture)
                const baseIdx = faceIdx * 4;
                uvAttr.setXY(baseIdx + 0, 0, 0);
                uvAttr.setXY(baseIdx + 1, 0, 0);
                uvAttr.setXY(baseIdx + 2, 0, 0);
                uvAttr.setXY(baseIdx + 3, 0, 0);
                continue;
            }

            const uv = face.uv;
            const rotation = face.rotation || 0;

            // Convert pixel coordinates to UV (0-1 range)
            // Java UV: [u1, v1, u2, v2] where u1,v1 is top-left, u2,v2 is bottom-right
            // With flipY=true, we invert V: small minecraft v → high Three.js V
            let u1 = uv[0] / texWidth;
            let v1 = 1 - (uv[1] / texHeight);  // Minecraft top → high Three.js V
            let u2 = uv[2] / texWidth;
            let v2 = 1 - (uv[3] / texHeight);  // Minecraft bottom → low Three.js V

            // Three.js BoxGeometry vertex order per face (looking at face from outside):
            // 2---3  (top-left, top-right) - should have HIGH V values
            // |   |
            // 0---1  (bottom-left, bottom-right) - should have LOW V values
            //
            // After V inversion: v1 (was top, small pixel value) becomes HIGH, v2 (was bottom) becomes LOW
            let uvCoords = [
                [u1, v2], // 0: bottom-left (u1, low V)
                [u2, v2], // 1: bottom-right (u2, low V)
                [u1, v1], // 2: top-left (u1, high V)
                [u2, v1]  // 3: top-right (u2, high V)
            ];

            // Apply UV rotation (clockwise in Minecraft, specified in degrees: 0, 90, 180, 270)
            if (rotation !== 0) {
                const rotSteps = Math.floor(((rotation % 360) + 360) % 360 / 90);
                for (let r = 0; r < rotSteps; r++) {
                    // Rotate UV coordinates 90 degrees clockwise
                    uvCoords = [
                        uvCoords[2], // new bottom-left <- old top-left
                        uvCoords[0], // new bottom-right <- old bottom-left
                        uvCoords[3], // new top-left <- old top-right
                        uvCoords[1]  // new top-right <- old bottom-right
                    ];
                }
            }

            const baseIdx = faceIdx * 4;
            uvAttr.setXY(baseIdx + 0, uvCoords[0][0], uvCoords[0][1]);
            uvAttr.setXY(baseIdx + 1, uvCoords[1][0], uvCoords[1][1]);
            uvAttr.setXY(baseIdx + 2, uvCoords[2][0], uvCoords[2][1]);
            uvAttr.setXY(baseIdx + 3, uvCoords[3][0], uvCoords[3][1]);
        }

        uvAttr.needsUpdate = true;
    }

    /**
     * Apply a display transform to the current model
     */
    function applyDisplayTransform(transformName) {
        if (!currentModel || !currentItemModelJson) return;

        // Reset model transform
        currentModel.rotation.set(0, 0, 0);
        currentModel.position.set(0, 0, 0);
        currentModel.scale.set(1, 1, 1);

        if (transformName === 'none' || !currentItemModelJson.display || !currentItemModelJson.display[transformName]) {
            currentDisplayTransform = 'none';
            return;
        }

        const transform = currentItemModelJson.display[transformName];
        currentDisplayTransform = transformName;

        // Apply rotation (in degrees)
        if (transform.rotation) {
            currentModel.rotation.set(
                THREE.MathUtils.degToRad(transform.rotation[0]),
                THREE.MathUtils.degToRad(transform.rotation[1]),
                THREE.MathUtils.degToRad(transform.rotation[2])
            );
        }

        // Apply translation
        if (transform.translation) {
            currentModel.position.set(
                transform.translation[0],
                transform.translation[1],
                transform.translation[2]
            );
        }

        // Apply scale
        if (transform.scale) {
            currentModel.scale.set(
                transform.scale[0],
                transform.scale[1],
                transform.scale[2]
            );
        }
    }

    /**
     * Set the display transform and update the model
     */
    function setDisplayTransform(transformName) {
        if (!availableDisplayTransforms.includes(transformName)) {
            console.warn('Display transform not available:', transformName);
            return;
        }
        applyDisplayTransform(transformName);

        // Update dropdown selection
        const dropdown = document.getElementById('displayTransformSelect');
        if (dropdown) {
            dropdown.value = transformName;
        }
    }

    /**
     * Get available display transforms for the current model
     */
    function getAvailableDisplayTransforms() {
        return availableDisplayTransforms;
    }

    /**
     * Get the current display transform name
     */
    function getCurrentDisplayTransform() {
        return currentDisplayTransform;
    }

    /**
     * Update the display transform dropdown if it exists
     */
    function updateDisplayTransformDropdown() {
        const dropdown = document.getElementById('displayTransformSelect');
        if (!dropdown) return;

        dropdown.innerHTML = '';
        for (const transform of availableDisplayTransforms) {
            const option = document.createElement('option');
            option.value = transform;
            option.textContent = formatDisplayTransformName(transform);
            if (transform === currentDisplayTransform) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        }
    }

    /**
     * Format display transform name for display
     */
    function formatDisplayTransformName(name) {
        if (name === 'none') return 'None (Default)';
        return name.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Update texture on current model
     */
    function updateTexture(textureDataUrl) {
        if (!currentModel) return;

        currentTexture = textureDataUrl;

        const texture = new THREE.TextureLoader().load(textureDataUrl, () => {
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        });
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        // Always use flipY=true - UV mapping handles coordinate conversion
        texture.flipY = true;

        currentModel.traverse((child) => {
            if (child.isMesh) {
                const newMaterial = new THREE.MeshLambertMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.01,
                    side: THREE.DoubleSide
                });
                if (child.material) child.material.dispose();
                child.material = newMaterial;
            }
        });
    }

    function disposeObject(obj) {
        obj.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }

    function showMessage(html) {
        if (!container) return;

        let msgDiv = container.querySelector('.preview-message');
        if (!msgDiv) {
            msgDiv = document.createElement('div');
            msgDiv.className = 'preview-message';
            container.appendChild(msgDiv);
        }
        msgDiv.innerHTML = html;
        msgDiv.style.display = 'block';
    }

    function clear() {
        if (currentModel && scene) {
            scene.remove(currentModel);
            disposeObject(currentModel);
            currentModel = null;
        }
        currentTexture = null;
        currentItemModelJson = null;
        currentDisplayTransform = 'none';
        availableDisplayTransforms = [];
        isJavaItemModel = false;
        showMessage('<i class="fa-solid fa-cube"></i>Upload a model to preview');
    }

    function destroy() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (currentModel) {
            disposeObject(currentModel);
            currentModel = null;
        }
        if (renderer) {
            renderer.dispose();
            renderer = null;
        }
        if (container) {
            const canvas = container.querySelector('canvas');
            if (canvas) canvas.remove();
        }
        scene = null;
        camera = null;
        controls = null;
        currentTexture = null;
        currentItemModelJson = null;
        currentDisplayTransform = 'none';
        availableDisplayTransforms = [];
        isJavaItemModel = false;
    }

    function setAutoRotate(enabled) {
        autoRotate = enabled;
        if (controls) {
            controls.autoRotate = enabled;
        }
    }

    function getAutoRotate() {
        return autoRotate;
    }

    function resetCamera() {
        if (!currentModel || !camera || !controls) return;

        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.8;

        camera.position.set(0, center.y, distance);
        controls.target.set(0, center.y, 0);
        controls.update();
    }

    return {
        init,
        loadGeometry,
        loadJavaItemModel,
        updateTexture,
        showMessage,
        clear,
        destroy,
        setAutoRotate,
        getAutoRotate,
        resetCamera,
        setDisplayTransform,
        getAvailableDisplayTransforms,
        getCurrentDisplayTransform,
        isAvailable: () => typeof THREE !== 'undefined'
    };
})();

if (typeof window !== 'undefined') {
    window.ModelPreview = ModelPreview;
}

