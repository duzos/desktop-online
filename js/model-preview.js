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
     */
    function createMaterial(textureDataUrl) {
        if (textureDataUrl) {
            const texture = new THREE.TextureLoader().load(textureDataUrl);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;

            return new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1,
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
            { region: 'right',  flipU: mirror, flipV: true,  rotate: false },  // +X
            { region: 'left',   flipU: !mirror, flipV: true,  rotate: false },  // -X
            { region: 'bottom', flipU: false,  flipV: true, rotate: false },  // +Y shows bottom
            { region: 'top',    flipU: false,  flipV: true, rotate: false },  // -Y shows top
            { region: 'back',   flipU: !mirror, flipV: true,  rotate: false },  // +Z shows back
            { region: 'front',  flipU: mirror,  flipV: true,  rotate: false }   // -Z shows front
        ];

        for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
            const mapping = faceMapping[faceIdx];
            const region = uvRegions[mapping.region];
            const baseIdx = faceIdx * 4;

            // Convert from Bedrock (top-left origin, V down) to Three.js (bottom-left origin, V up)
            let u1 = region.u;
            let u2 = region.u + region.w;
            let v1 = 1 - (region.v + region.h);  // bottom in Three.js space
            let v2 = 1 - region.v;                // top in Three.js space

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

            uvAttr.setXY(baseIdx + 0, u1, v1);  // bottom-left
            uvAttr.setXY(baseIdx + 1, u2, v1);  // bottom-right
            uvAttr.setXY(baseIdx + 2, u1, v2);  // top-left
            uvAttr.setXY(baseIdx + 3, u2, v2);  // top-right
        }

        uvAttr.needsUpdate = true;
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

        currentModel.traverse((child) => {
            if (child.isMesh) {
                const newMaterial = new THREE.MeshLambertMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.1,
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
        updateTexture,
        showMessage,
        clear,
        destroy,
        setAutoRotate,
        getAutoRotate,
        resetCamera,
        isAvailable: () => typeof THREE !== 'undefined'
    };
})();

if (typeof window !== 'undefined') {
    window.ModelPreview = ModelPreview;
}

