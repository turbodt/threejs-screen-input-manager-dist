import * as THREE from "three";
export declare type MouseManagerErrorType = "Unknown" | "Never";
export declare class MouseManagerError extends Error {
    constructor(type: MouseManagerErrorType, msg: string);
}
declare type ListenerCollection = {
    enter: MouseManagerEventHandler[];
    leave: MouseManagerEventHandler[];
    move: MouseManagerEventHandler[];
};
export declare type MouseActionType = keyof ListenerCollection;
declare type MouseManagerEventBase = MouseEvent & {
    type: MouseActionType;
    preventDefault: () => void;
    intersections: THREE.Intersection[];
};
export declare type MouseManagerEvent<T extends MouseActionType = MouseActionType> = T extends "enter" ? MouseManagerEventBase & {
    intersection: THREE.Intersection;
} : T extends "leave" ? MouseManagerEventBase : T extends "move" ? MouseManagerEventBase & {
    intersection: THREE.Intersection;
} : MouseManagerEventBase;
declare type MouseManagerEventHandler<T extends MouseActionType = MouseActionType> = (event: MouseManagerEvent<T>) => any;
interface MouseManagerFor {
    addListener: <T extends MouseActionType>(action: T | Iterable<T>, handler: MouseManagerEventHandler<T>) => MouseManagerFor;
    removeListener: <T extends MouseActionType>(action: T | Iterable<T>, handler: MouseManagerEventHandler<T>) => MouseManagerFor;
    remove: () => void;
}
export declare class MouseManager {
    canvas: HTMLCanvasElement;
    protected camera: THREE.Camera;
    protected raycaster: THREE.Raycaster;
    protected listenerCollections: Map<string, ListenerCollection>;
    protected targets: Set<THREE.Object3D<THREE.Event>>;
    protected mouseEnterTimestamps: Map<string, number>;
    static TAP_MAX_DURATION: number;
    constructor(canvas: HTMLCanvasElement, camera: THREE.Camera);
    protected getClickMaxDurationFor(_: string): number;
    protected ensureListenerCollectionExistsFor(targetUuid: string): void;
    protected getListenerCollection(targetUuid: string): ListenerCollection;
    protected addTarget(target: THREE.Object3D): void;
    protected removeTarget(target: THREE.Object3D): void;
    for(target: THREE.Object3D): MouseManagerFor;
    getMouseRelativeCoordinates(event: MouseEvent): [number, number];
    getMouseCoordinates(event: MouseEvent): [number, number];
    getMouseNormalizedCoordinates(event: MouseEvent): [number, number];
    protected dispatch(action: MouseActionType, event: MouseEvent): void;
    protected createMouseEnterTimestamp(targetUuid: string): void;
    protected deleteMouseEnterTimestamp(targetUuid: string): void;
    protected dispatchEnterFor(targetUuid: string, event: MouseManagerEvent<"enter">): void;
    protected dispatchLeaveFor(targetUuid: string, event: MouseManagerEvent<"leave">): void;
    protected dispatchMoveFor(targetUuid: string, event: MouseManagerEvent<"move">): void;
    protected onMouseEnter(event: MouseEvent): void;
    protected onMouseLeave(event: MouseEvent): void;
    protected onMouseMove(event: MouseEvent): void;
}
export {};
