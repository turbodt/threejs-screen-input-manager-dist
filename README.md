# THREEJS Screen Input Manager

## Instalation

```bash
npm install threejs-screen-input-manager
```

## Summary

This package provides a touch and a mouse manager to handle touch and mouse events over THREEJS objects.

## Details

This package exposes two objects: `TouchManager` and `MouseManager`. Both managers behave similarly: They capture touch or mouse events and transform them to the corresponding events over the registered THREEJS objects.

The way the work is the following: Given a _canvas_ and a _camera_, when a touch or a mouse event on the _canvas_ is captured, a ray from the _camera_ is captured with `THREEJS.Raycaster`. Then, they compute the intersection with all the registered THREEJS objects and calcule and dispatch the corresponding events for each one.

The functionality of both is basic but should be enought to save some boilerplate code.

### TouchManager

Manage events `start`, `end`, `cancel`, `move` and `tap`, fired as the name suggest.

#### Cancel Event

```
{
  type: "cancel",
  preventDefault: () => void,
  touch: Touch,
  intersections: THREE.Intersection[]
}
```

- `type` is the name of the event.
- `preventDefault` prevent to dispatch the events to THREEJS objects behind the current one in the ray
- `touch` is the original (o mouse transformed) touch on the _canvas_.
- `intersections` is the returned `THREE.Intersection[]` by the `THREE.Raycaster.intersectObjects` method.

#### Start, End, Move and Tap events

Same as previous, with the additional member `intersection`, which is the `THREE.Intersection` of the current object.

#### Methods

- `constructor(canvas: HTMLCanvasElement, camera: THREE.Camera)`
- `.for(target: THREE.Object3D)` Returns an object to register or remove events. See Examples
- `getTouchCoordinates(touch: Touch)` Given a touch, get the coordinates.
- `getTouchRelativeCoordinates(touch: Touch)` Given a touch, get the relative coordinates (i.e.: coordinates in range [0, 1]).
- `getTouchNormalizedCoordinates(touch: Touch)` Given a touch, get the normalized coordinates (i.e.: coordinates in range [-1, 1]).

_Important:_ This manager capture `mousedown`, `mouseup` and `move` events and transform them as `Touch` objects with `Touch.identifier = -1`. So, for example, a `tap` event is also fired on click.

### MouseManager

Manage events `enter`, `leave` and `move`, fired as the name suggest. For `click` event use `TouchManager`'s event `tap`.

#### Leave Event

```
MouseEvent & {
  type: "cancel",
  preventDefault: () => void,
  intersections: THREE.Intersection[]
}
```

- `type` is the name of the event.
- `preventDefault` prevent to dispatch the events to THREEJS objects behind the current one in the ray.
- `intersections` is the returned `THREE.Intersection[]` by the `THREE.Raycaster.intersectObjects` method.

#### Enter and Move events

Same as previous, with the additional member `intersection`, which is the `THREE.Intersection` of the current object.

#### Methods

- `constructor(canvas: HTMLCanvasElement, camera: THREE.Camera)`
- `.for(target: THREE.Object3D)` Returns an object to register or remove events. See Example.
- `getMouseCoordinates(event: MouseEvent)` Given a mouse event, get the coordinates.
- `getMouseRelativeCoordinates(event: MouseEvent)` Given a mouse event, get the relative coordinates (i.e.: coordinates in range [0, 1]).
- `getMouseNormalizedCoordinates(event: MouseEvent)` Given a mouse event, get the normalized coordinates (i.e.: coordinates in range [-1, 1]).

## Example

```typescript
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  MouseManager,
  MouseManagerEvent,
  TouchManager
} from "threejs-screen-input-manager";

window.addEventListener("load", () => {
  console.clear();

  const canvas = document.querySelector(
    "#renderer-canvas"
  ) as HTMLCanvasElement;
  const ratio = canvas.clientWidth / canvas.clientHeight;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = dpr * canvas.clientWidth;
  canvas.height = dpr * canvas.clientHeight;

  // Set renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(dpr);

  // Set scene
  const scene = new THREE.Scene();

  // Set camera
  const camera = new THREE.PerspectiveCamera(45, ratio, 0.1, 1000);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  // Set managers
  const touchManager = new TouchManager(canvas, camera);
  const mouseManager = new MouseManager(canvas, camera);

  // Set controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableZoom = false;
  // controls.enabled = false;
  controls.update();

  // Set lights
  scene.add(new THREE.AmbientLight(0x404040));
  const light1 = new THREE.PointLight(0xffffff, 0.8, 100);
  light1.position.set(1, 1, 2);
  scene.add(light1);

  // Set Meshes
  const meshes = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff].map(
    (color, index, arr): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.25, 20, 1),
        new THREE.MeshPhongMaterial({
          color,
          shininess: 0.9
        })
      );
      mesh.translateX(2 * (index - (arr.length - 1) / 2));
      mesh.rotateX(Math.PI / 2);
      scene.add(mesh);
      return mesh;
    }
  );

  // Define utils
  const setCursor = ({ intersections }: MouseManagerEvent) => {
    if (intersections.length > 0) {
      touchManager.canvas.style.cursor = "pointer";
    } else {
      touchManager.canvas.style.cursor = "inherit";
    }
  };

  // Register events
  meshes.forEach((mesh, index) => {
    touchManager.for(mesh).addListener("tap", event => {
      event.preventDefault();
      console.log(`Tap (or click) on ${index + 1}th button.`);
    });

    mouseManager
      .for(mesh)
      .addListener("enter", setCursor)
      .addListener("leave", setCursor);
  });

  // Event for first button
  touchManager.for(meshes[0] as THREE.Object3D).addListener("tap", () => {
    console.log("Removed all button's touch event listeners");
    touchManager.for(meshes[0] as THREE.Object3D).remove();
  });

  // Event for second button
  touchManager.for(meshes[1] as THREE.Object3D).addListener("tap", () => {
    console.log("Camera moved to side");
    camera.position.set(10, 0, 0);
    camera.lookAt(0, 0, 0);
  });

  // Events for third button
  touchManager
    .for(meshes[2] as THREE.Object3D)
    .addListener("start", console.log)
    .addListener("end", console.log)
    .addListener("cancel", console.log)
    .addListener("move", console.log)
    .addListener("tap", () => {
      console.log("Camera moved to front");
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
    });

  // Event for fourth button
  touchManager.for(meshes[3] as THREE.Object3D).addListener("tap", () => {
    console.log("Disable controls");
    controls.enabled = false;
    controls.update();
  });

  // Event for fith button
  touchManager.for(meshes[4] as THREE.Object3D).addListener("tap", () => {
    console.log("Enable controls");
    controls.enabled = true;
    controls.update();
  });

  // animate
  const animate = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
});
```
