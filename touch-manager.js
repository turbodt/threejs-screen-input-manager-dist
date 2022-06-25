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
exports.TouchManager = exports.TouchManagerError = void 0;
const THREE = __importStar(require("three"));
function mouseEventToTouch(event) {
    return Object.seal({
        identifier: -1,
        clientX: event.clientX,
        clientY: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
        screenX: event.screenX,
        screenY: event.screenY,
        target: event.target,
        altitudeAngle: -1,
        azimuthAngle: -1,
        force: -1,
        radiusX: -1,
        radiusY: -1,
        rotationAngle: -1,
        touchType: "direct",
    });
}
class TouchManagerError extends Error {
    constructor(type, msg) {
        super(`Touch Emitter ${type} Error: ${msg}\n`);
        Object.setPrototypeOf(this, TouchManagerError.prototype);
    }
}
exports.TouchManagerError = TouchManagerError;
const createListenerCollection = () => ({
    start: [],
    end: [],
    cancel: [],
    move: [],
    tap: [],
});
class TouchManager {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.isMouseDown = false;
        this.listenerCollections = new Map();
        this.targets = new Set();
        this.touchStartTimestamps = new Map();
        this.canvas.addEventListener("touchstart", this.onTouchesStart.bind(this), false);
        this.canvas.addEventListener("touchend", this.onTouchesEnd.bind(this), false);
        this.canvas.addEventListener("touchcancel", this.onTouchesCancel.bind(this), false);
        this.canvas.addEventListener("touchmove", this.onTouchesMove.bind(this), false);
        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this), false);
        this.canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this), false);
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    }
    getTapMaxDurationFor(_) {
        return TouchManager.TAP_MAX_DURATION;
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
        this.touchStartTimestamps.forEach((touchStartTimestamps) => touchStartTimestamps.delete(target.uuid));
        this.targets.delete(target);
    }
    for(target) {
        const retObj = {
            addListener: (action, handler) => {
                this.addTarget(target);
                const listenerCollection = this.getListenerCollection(target.uuid);
                listenerCollection[action].push(handler);
                return retObj;
            },
            removeListener: (action, handler) => {
                const listenerCollection = this.getListenerCollection(target.uuid);
                const index = listenerCollection[action].findIndex((f) => f === handler);
                if (index >= 0) {
                    listenerCollection[action].splice(index, 1);
                }
                return retObj;
            },
            remove: () => {
                this.removeTarget(target);
            },
        };
        return retObj;
    }
    getTouchRelativeCoordinates(touch) {
        const canvasRect = this.canvas.getBoundingClientRect();
        return [
            (touch.clientX - canvasRect.x) / canvasRect.width,
            (touch.clientY - canvasRect.y) / canvasRect.height,
        ];
    }
    getTouchCoordinates(touch) {
        const [rWidth, rHeight] = this.getTouchRelativeCoordinates(touch);
        return [this.canvas.width * rWidth, this.canvas.height * rHeight];
    }
    getTouchNormalizedCoordinates(touch) {
        const [rWidth, rHeight] = this.getTouchRelativeCoordinates(touch);
        return [2 * rWidth - 1, -2 * rHeight + 1];
    }
    dispatch(action, touch) {
        const [x, y] = this.getTouchNormalizedCoordinates(touch);
        this.raycaster.setFromCamera({ x, y }, this.camera);
        const intersections = this.raycaster.intersectObjects(Array.from(this.targets), false);
        const touchStartTimestamps = this.touchStartTimestamps.get(touch.identifier) || new Map();
        const dispatchTimestamp = Date.now();
        let defaultPrevented = false;
        const preventDefault = () => {
            defaultPrevented = true;
        };
        for (let i = 0; i < intersections.length && !defaultPrevented; i++) {
            const intersection = intersections[i];
            const uuid = intersection.object.uuid;
            if (action === "start") {
                const event = {
                    type: "start",
                    touch,
                    preventDefault,
                    intersections,
                    intersection,
                };
                this.dispatchStartFor(uuid, event);
            }
            else if (action === "end") {
                const startTimestamp = touchStartTimestamps.get(uuid);
                const event = {
                    type: "end",
                    touch,
                    preventDefault,
                    intersections,
                    intersection,
                };
                this.dispatchEndFor(uuid, event);
                if (dispatchTimestamp - startTimestamp <
                    this.getTapMaxDurationFor(uuid)) {
                    const eventTap = {
                        type: "tap",
                        touch,
                        preventDefault,
                        intersections,
                        intersection,
                    };
                    this.dispatchTapFor(uuid, eventTap);
                }
            }
            else if (action === "cancel") {
                const event = {
                    type: "cancel",
                    touch,
                    preventDefault,
                    intersections,
                };
                this.dispatchCancelFor(uuid, event);
            }
            else if (action === "move") {
                const touchStartTimestamp = touchStartTimestamps.get(uuid);
                if (touchStartTimestamp) {
                    const event = {
                        type: "move",
                        touch,
                        preventDefault,
                        intersections,
                        intersection,
                    };
                    this.dispatchMoveFor(uuid, event);
                }
                else {
                    const event = {
                        type: "start",
                        touch,
                        preventDefault,
                        intersections,
                        intersection,
                    };
                    this.dispatchStartFor(uuid, event);
                }
            }
        }
        if (action === "move") {
            const intersectionUuids = new Set(intersections.map(({ object }) => object.uuid));
            const pairsToCancel = Array.from(touchStartTimestamps).filter(([uuid]) => !intersectionUuids.has(uuid));
            const event = {
                type: "cancel",
                preventDefault,
                intersections,
                touch,
            };
            pairsToCancel.forEach(([uuid]) => this.dispatchCancelFor(uuid, event));
        }
    }
    createTouchStartTimestamp(touchId, targetUuid) {
        if (!this.touchStartTimestamps.has(touchId)) {
            this.touchStartTimestamps.set(touchId, new Map());
        }
        const m = this.touchStartTimestamps.get(touchId);
        m.set(targetUuid, Date.now());
    }
    deleteTouchStartTimestamp(touchId, targetUuid) {
        if (!this.touchStartTimestamps.has(touchId)) {
            throw new TouchManagerError("Never", "Deleting a touch start timestamp that does not exists.");
        }
        const m = this.touchStartTimestamps.get(touchId);
        m.delete(targetUuid);
        if (m.size === 0) {
            this.touchStartTimestamps.delete(touchId);
        }
    }
    dispatchStartFor(targetUuid, event) {
        this.createTouchStartTimestamp(event.touch.identifier, targetUuid);
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["start"].forEach((handler) => handler(event));
    }
    dispatchEndFor(targetUuid, event) {
        this.deleteTouchStartTimestamp(event.touch.identifier, targetUuid);
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["end"].forEach((handler) => handler(event));
    }
    dispatchCancelFor(targetUuid, event) {
        this.deleteTouchStartTimestamp(event.touch.identifier, targetUuid);
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["cancel"].forEach((handler) => handler(event));
    }
    dispatchMoveFor(targetUuid, event) {
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["move"].forEach((handler) => handler(event));
    }
    dispatchTapFor(targetUuid, event) {
        const listenerCollection = this.getListenerCollection(targetUuid);
        listenerCollection["tap"].forEach((handler) => handler(event));
    }
    onMouseDown(event) {
        event.preventDefault();
        this.isMouseDown = true;
        this.dispatch("start", mouseEventToTouch(event));
    }
    onMouseUp(event) {
        this.isMouseDown = false;
        event.preventDefault();
        this.dispatch("end", mouseEventToTouch(event));
    }
    onMouseLeave(event) {
        event.preventDefault();
        if (!this.isMouseDown) {
            return;
        }
        this.dispatch("cancel", mouseEventToTouch(event));
    }
    onMouseMove(event) {
        event.preventDefault();
        if (!this.isMouseDown) {
            return;
        }
        this.dispatch("move", mouseEventToTouch(event));
    }
    onTouchesStart(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            this.dispatch("start", event.changedTouches.item(i));
        }
    }
    onTouchesEnd(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            this.dispatch("end", event.changedTouches.item(i));
        }
    }
    onTouchesCancel(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            this.dispatch("cancel", event.changedTouches.item(i));
        }
    }
    onTouchesMove(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            this.dispatch("move", event.changedTouches.item(i));
        }
    }
}
exports.TouchManager = TouchManager;
TouchManager.TAP_MAX_DURATION = 600;
