/**
 * Shared State Module for AIT Generator
 * Manages the pack stack, namespace, and cross-tool references
 */

const SharedState = (function() {
    'use strict';

    // State
    let state = {
        namespace: '',
        packStack: [],
        customCategories: [],
        customConsoles: [],
        customExteriors: []
    };

    // Event listeners
    const listeners = {
        namespaceChange: [],
        stackChange: [],
        categoryChange: [],
        consoleChange: [],
        exteriorChange: []
    };

    // Generate unique IDs for stack items
    let idCounter = 0;
    function generateId() {
        return `item_${Date.now()}_${idCounter++}`;
    }

    // Event emitter
    function emit(event, data) {
        if (listeners[event]) {
            listeners[event].forEach(callback => callback(data));
        }
    }

    // Public API
    return {
        // Namespace management
        getNamespace() {
            return state.namespace;
        },

        setNamespace(ns) {
            state.namespace = ns;
            emit('namespaceChange', ns);
            this.saveToLocalStorage();
        },

        onNamespaceChange(callback) {
            listeners.namespaceChange.push(callback);
        },

        // Stack management
        getStack() {
            return [...state.packStack];
        },

        addToStack(type, data, files = {}) {
            const item = {
                id: generateId(),
                type: type,
                data: data,
                files: files,
                createdAt: Date.now()
            };
            state.packStack.push(item);

            // Update custom references if applicable
            if (type === 'category') {
                state.customCategories.push({
                    id: `${state.namespace}:${data.id}`,
                    name: data.name
                });
                emit('categoryChange', state.customCategories);
            }
            if (type === 'console-model') {
                state.customConsoles.push({
                    id: `${state.namespace}:${data.id}`,
                    name: data.name || data.id
                });
                emit('consoleChange', state.customConsoles);
            }
            if (type === 'exterior-model') {
                state.customExteriors.push({
                    id: `${state.namespace}:${data.id}`,
                    name: data.name || data.id
                });
                emit('exteriorChange', state.customExteriors);
            }

            emit('stackChange', state.packStack);
            this.saveToLocalStorage();
            return item.id;
        },

        updateStackItem(id, data, files = null) {
            const index = state.packStack.findIndex(item => item.id === id);
            if (index !== -1) {
                state.packStack[index].data = { ...state.packStack[index].data, ...data };
                if (files) {
                    state.packStack[index].files = { ...state.packStack[index].files, ...files };
                }
                emit('stackChange', state.packStack);
                this.saveToLocalStorage();
            }
        },

        removeFromStack(id) {
            const item = state.packStack.find(i => i.id === id);
            if (item) {
                // Remove from custom references
                if (item.type === 'category') {
                    state.customCategories = state.customCategories.filter(
                        c => c.id !== `${state.namespace}:${item.data.id}`
                    );
                    emit('categoryChange', state.customCategories);
                }
                if (item.type === 'console-model') {
                    state.customConsoles = state.customConsoles.filter(
                        c => c.id !== `${state.namespace}:${item.data.id}`
                    );
                    emit('consoleChange', state.customConsoles);
                }
                if (item.type === 'exterior-model') {
                    state.customExteriors = state.customExteriors.filter(
                        c => c.id !== `${state.namespace}:${item.data.id}`
                    );
                    emit('exteriorChange', state.customExteriors);
                }
            }
            state.packStack = state.packStack.filter(item => item.id !== id);
            emit('stackChange', state.packStack);
            this.saveToLocalStorage();
        },

        clearStack() {
            state.packStack = [];
            state.customCategories = [];
            state.customConsoles = [];
            state.customExteriors = [];
            emit('stackChange', state.packStack);
            emit('categoryChange', state.customCategories);
            emit('consoleChange', state.customConsoles);
            emit('exteriorChange', state.customExteriors);
            this.saveToLocalStorage();
        },

        onStackChange(callback) {
            listeners.stackChange.push(callback);
        },

        // Custom categories
        getCustomCategories() {
            return [...state.customCategories];
        },

        onCategoryChange(callback) {
            listeners.categoryChange.push(callback);
        },

        // Custom consoles
        getCustomConsoles() {
            return [...state.customConsoles];
        },

        onConsoleChange(callback) {
            listeners.consoleChange.push(callback);
        },

        // Custom exteriors
        getCustomExteriors() {
            return [...state.customExteriors];
        },

        onExteriorChange(callback) {
            listeners.exteriorChange.push(callback);
        },

        // Get items by type
        getItemsByType(type) {
            return state.packStack.filter(item => item.type === type);
        },

        // Persistence
        saveToLocalStorage() {
            try {
                // We can't store File objects, so we only store metadata
                const saveData = {
                    namespace: state.namespace,
                    packStack: state.packStack.map(item => ({
                        ...item,
                        files: Object.keys(item.files).reduce((acc, key) => {
                            acc[key] = item.files[key] ? { name: item.files[key].name, size: item.files[key].size } : null;
                            return acc;
                        }, {})
                    })),
                    customCategories: state.customCategories,
                    customConsoles: state.customConsoles,
                    customExteriors: state.customExteriors
                };
                localStorage.setItem('aitGeneratorState', JSON.stringify(saveData));
            } catch (e) {
                console.warn('Could not save to localStorage:', e);
            }
        },

        loadFromLocalStorage() {
            try {
                const saved = localStorage.getItem('aitGeneratorState');
                if (saved) {
                    const data = JSON.parse(saved);
                    state.namespace = data.namespace || '';
                    state.customCategories = data.customCategories || [];
                    state.customConsoles = data.customConsoles || [];
                    state.customExteriors = data.customExteriors || [];
                    // Note: Files can't be restored from localStorage
                    // Stack items are loaded but files need to be re-uploaded
                }
            } catch (e) {
                console.warn('Could not load from localStorage:', e);
            }
        },

        // Initialize
        init() {
            this.loadFromLocalStorage();
            return this;
        }
    };
})();

// Initialize on load
if (typeof window !== 'undefined') {
    window.SharedState = SharedState.init();
}

