import * as THREE from "three";
export declare type TouchManagerErrorType = "Unknown" | "Never";
export declare class TouchManagerError extends Error {
    constructor(type: TouchManagerErrorType, msg: string);
}
declare type ListenerCollection = {
    start: TouchManagerEventHandler[];
    end: TouchManagerEventHandler[];
    cancel: TouchManagerEventHandler[];
    move: TouchManagerEventHandler[];
    tap: TouchManagerEventHandler[];
};
export declare type TouchActionType = keyof ListenerCollection;
declare type TouchManagerEventBase = {
    type: TouchActionType;
    touch: Touch;
    preventDefault: () => void;
    intersections: THREE.Intersection[];
};
export declare type TouchManagerEvent<T extends TouchActionType = TouchActionType> = T extends "start" ? TouchManagerEventBase & {
    intersection: THREE.Intersection;
} : T extends "end" ? TouchManagerEventBase & {
    intersection: THREE.Intersection;
} : T extends "cancel" ? TouchManagerEventBase : T extends "move" ? TouchManagerEventBase & {
    intersection: THREE.Intersection;
} : T extends "tap" ? TouchManagerEventBase & {
    intersection: THREE.Intersection;
} : TouchManagerEventBase;
declare type TouchManagerEventHandler<T extends TouchActionType = TouchActionType> = (event: TouchManagerEvent<T>) => any;
interface TouchManagerFor {
    addListener: <T extends TouchActionType>(action: T, handler: TouchManagerEventHandler<T>) => TouchManagerFor;
    removeListener: <T extends TouchActionType>(action: T, handler: TouchManagerEventHandler<T>) => TouchManagerFor;
    remove: () => void;
}
export declare class TouchManager {
    canvas: HTMLCanvasElement;
    protected camera: THREE.Camera;
    protected raycaster: THREE.Raycaster;
    protected isMouseDown: boolean;
    protected listenerCollections: Map<string, ListenerCollection>;
    protected targets: Set<THREE.Object3D<THREE.Event>>;
    protected touchStartTimestamps: Map<number, Map<string, number>>;
    static TAP_MAX_DURATION: number;
    constructor(canvas: HTMLCanvasElement, camera: THREE.Camera);
    protected getTapMaxDurationFor(_: string): number;
    protected ensureListenerCollectionExistsFor(targetUuid: string): void;
    protected getListenerCollection(targetUuid: string): ListenerCollection;
    protected addTarget(target: THREE.Object3D): void;
    protected removeTarget(target: THREE.Object3D): void;
    for(target: THREE.Object3D): TouchManagerFor;
    getTouchRelativeCoordinates(touch: Touch): [number, number];
    getTouchCoordinates(touch: Touch): [number, number];
    getTouchNormalizedCoordinates(touch: Touch): [number, number];
    protected dispatch(action: TouchActionType, touch: Touch): void;
    protected createTouchStartTimestamp(touchId: number, targetUuid: string): void;
    protected deleteTouchStartTimestamp(touchId: number, targetUuid: string): void;
    protected dispatchStartFor(targetUuid: string, event: TouchManagerEvent<"start">): void;
    protected dispatchEndFor(targetUuid: string, event: TouchManagerEvent<"end">): void;
    protected dispatchCancelFor(targetUuid: string, event: TouchManagerEvent<"cancel">): void;
    protected dispatchMoveFor(targetUuid: string, event: TouchManagerEvent<"move">): void;
    protected dispatchTapFor(targetUuid: string, event: TouchManagerEvent<"tap">): void;
    protected onMouseDown(event: MouseEvent): void;
    protected onMouseUp(event: MouseEvent): void;
    protected onMouseLeave(event: MouseEvent): void;
    protected onMouseMove(event: MouseEvent): void;
    protected onTouchesStart(event: TouchEvent): void;
    protected onTouchesEnd(event: TouchEvent): void;
    protected onTouchesCancel(event: TouchEvent): void;
    protected onTouchesMove(event: TouchEvent): void;
}
export {};
