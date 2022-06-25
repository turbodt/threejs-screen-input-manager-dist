"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MouseManager = exports.MouseManagerError = void 0;
const THREE = __importStar(require("three"));
const isMouseActionTypeIterable = (obj) => {
    if (obj == null || typeof obj === "string") {
        return false;
    }
    return typeof obj[Symbol.iterator] === "function";
};
class MouseManagerError extends Error {
    constructor(type, msg) {
        super(`Mouse Emitter ${type} Error: ${msg}\n`);
        Object.setPrototypeOf(this, MouseManagerError.prototype);
    }
}
exports.MouseManagerError = MouseManagerError;
const createListenerCollection = () => ({
    enter: [],
    leave: [],
    move: [],
});
class MouseManager {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.listenerCollections = new Map();
        this.targets = new Set();
        this.mouseEnterTimestamps = new Map();
        this.canvas.addEventListener("mouseenter", this.onMouseEnter.bind(this), false);
        this.canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this), false);
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    }
    getClickMaxDurationFor(_) {
        return MouseManager.TAP_MAX_DURATION;
    }
    ensureListenerCollectionExistsFor(targetUuid) {
        if (!this.listenerCollections.has(targetUuid)) {
            this.listenerCollections.set(targetUuid, createListenerCollection());
        }
    }
    getListenerCollection(targetUuid) {
        this.ensureListenerCollectionExistsFor(targetUuid);
        return this.listenerCollections.get(targetUuid);
    }
    addTarget(target) {
        this.ensureListenerCollectionExistsFor(target.uuid);
        this.targets.add(target);
    }
    removeTarget(target) {
        this.listenerCollections.delete(target.uuid);
        this.mouseEnterTimestamps.delete(target.uuid);
        this.targets.delete(target);
    }
    for(target) {
        const retObj = {
            addListener: (action, handler) => {
                const actions = isMouseActionTypeIterable(action) ? action : [action];
                for (const action of actions) {
                    this.addTarget(target);
                    const listenerCollection = this.getListenerCollection(target.uuid);
                    listenerCollection[action].push(handler);
                }
                return retObj;
            },
            removeListener: (action, handler) => {
                const listenerCollection = this.getListenerCollection(target.uuid);
                const actions = isMouseActionTypeIterable(action) ? action : [action];
                for (const action of actions) {
                    const index = listenerCollection[action].findIndex((f) => f === handler);
                    if (index >= 0) {
                        listenerCollection[action].splice(index, 1);
                    }
                }
                return retObj;
            },
            remove: () => {
                this.removeTarget(target);
            },
        };
        return retObj;
    }
    getMouseRelativeCoordinates(event) {
        const canvasRect = this.canvas.getBoundingClientRect();
        return [
            (event.clientX - canvasRect.x) / canvasRect.width,
            (event.clientY - canvasRect.y) / canvasRect.height,
        ];
    }
    getMouseCoordinates(event) {
        const [rWidth, rHeight] = this.getMouseRelativeCoordinates(event);
        return [this.canvas.width * rWidth, this.canvas.height * rHeight];
    }
    getMouseNormalizedCoordinates(event) {
        const [rWidth, rHeight] = this.getMouseRelativeCoordinates(event);
        return [2 * rWidth - 1, -2 * rHeight + 1];
    }
    dispatch(action, event) {
        const [x, y] = this.getMouseNormalizedCoordinates(event);
        this.raycaster.setFromCamera({ x, y }, this.camera);
        const intersections = this.raycaster.intersectObjects(Array.from(this.targets), false);
        let defaultPrevented = false;
        const preventDefault = () => {
            defaultPrevented = true;
        };
        for (let i = 0; i < intersections.length && !defaultPrevented; i++) {
            const intersection = intersections[i];
            const uuid = intersection.object.uuid;
            if (action === "enter") {
                const mouseEmitterEvent = Object.assign(Object.assign({}, event), { type: "enter", intersections,
                    intersection,
                    preventDefault });
                this.dispatchEnterFor(uuid, mouseEmitterEvent);
            }
            else if (action === "leave") {
                const mouseEmitterEvent = Object.assign(Object.assign({}, event), { type: "leave", preventDefault,
                    intersections });
                this.dispatchLeaveFor(uuid, mouseEmitterEvent);
            }
            else if (action === "move") {
                const mouseEnterTimestamp = this.mouseEnterTimestamps.get(uuid);
                if (mouseEnterTimestamp) {
                    const mouseEmitterEvent = Object.assign(Object.assign({}, event), { type: "move", intersections,
                        intersection,
                        preventDefault });
                    this.dispatchMoveFor(uuid, mouseEmitterEvent);
                }
                else {
                    const mouseEmitterEvent = Object.assign(Object.assign({}, event), { type: "enter", intersections,
                        intersection,
                        preventDefault });
                    this.dispatchEnterFor(uuid, mouseEmitterEvent);
                }
            }
        }
        if (action === "move") {
            const intersectionUuids = new Set(intersections.map(({ object }) => object.uuid));
            const pairsToLeave = Array.from(this.mouseEnterTimestamps).filter(([uuid]) => !intersectionUuids.has(uuid));
            pairsToLeave.forEach(([uuid]) => {
                const mouseEmitterEvent = Object.assign(Object.assign({}, event), { type: "leave", intersections,
                    preventDefault });
                this.dispatchLeaveFor(uuid, mouseEmitterEvent);
            });
        }
    }
    createMouseEnterTimestamp(targetUuid) {
        this.mouseEnterTimestamps.set(targetUuid, Date.now());
    }
    deleteMouseEnterTimestamp(targetUuid) {
        this.mouseEnterTimestamps.delete(targetUuid);
    }
    dispatchEnterFor(targetUuid, event) {
        this.createMouseEnterTimestamp(targetUuid);
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["enter"].forEach((handler) => handler(event));
    }
    dispatchLeaveFor(targetUuid, event) {
        this.deleteMouseEnterTimestamp(targetUuid);
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["leave"].forEach((handler) => handler(event));
    }
    dispatchMoveFor(targetUuid, event) {
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["move"].forEach((handler) => handler(event));
    }
    onMouseEnter(event) {
        event.preventDefault();
        this.dispatch("enter", event);
    }
    onMouseLeave(event) {
        event.preventDefault();
        this.dispatch("leave", event);
    }
    onMouseMove(event) {
        event.preventDefault();
        this.dispatch("move", event);
    }
}
exports.MouseManager = MouseManager;
MouseManager.TAP_MAX_DURATION = 600;
