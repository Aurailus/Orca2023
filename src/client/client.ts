import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { h, render as preactRender } from 'preact';

import './Style.pcss'

import img_floor from '../../assets/floor.png';
import img_tree_1 from '../../assets/tree_1.png';
import img_tree_2 from '../../assets/tree_2.png';
import img_tree_3 from '../../assets/tree_3.png';
import img_rock_1 from '../../assets/rock_1.png';
import img_rock_2 from '../../assets/rock_2.png';
import img_rock_3 from '../../assets/rock_3.png';
import img_foliage_1 from '../../assets/foliage_1.png';
import img_foliage_2 from '../../assets/foliage_2.png';
import img_foliage_3 from '../../assets/foliage_3.png';
import img_char_1 from '../../assets/char_1_color.png';
import img_char_2 from '../../assets/char_2_color.png';
import img_char_3 from '../../assets/char_3_color.png';
import img_player from '../../assets/player_color.png';
import img_foliage_map from '../../assets/foliage_map.png';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let player: Player;
let clock = new THREE.Clock();
const dvorak = window.localStorage.getItem('dvorak') === 'true';

const useControls = false;

const CAMERA_OFFSET = new THREE.Vector3(0, 2/2.5, 1.0/2.5).multiplyScalar(2.5);
const CAMERA_LOOK_AT_OFFSET = new THREE.Vector3(0, -1.2, -1).normalize();

import DialogManager from './Dialogue';
const reactRoot = document.createElement('div');
document.body.appendChild(reactRoot);
preactRender(h(DialogManager, {
	messages: [ 'hello' ],
}), reactRoot);


class Player {
	position: THREE.Vector2;
	private velocity = new THREE.Vector2(0, 0);
	private baseScale: THREE.Vector2;
	private desiredScale: THREE.Vector2;
	private lifeTime = 0;
	private xScale = 1;


	private static readonly SCALE_FRICTION = 0.3;
	private static readonly BREATHE_INTENSITY = 0.0035;
	private static readonly BREATHE_SPEED = 0.25;
	private static readonly DRIFT_INTENSITY = 0.5;
	private static readonly DRIFT_SPEED = 0.5;

	private up: boolean = false;
	private down: boolean = false;
	private left: boolean = false;
	private right: boolean = false;

	constructor(origin: THREE.Vector2, private mesh: THREE.Mesh,
		private collidesAt: (pos: THREE.Vector2) => boolean) {
		this.position = origin;
		this.baseScale = new THREE.Vector2(mesh.scale.x, mesh.scale.y);
		this.desiredScale = this.baseScale.clone();

		window.addEventListener('keydown', e => {
			if (e.key === (dvorak ? ',' : 'w')) this.up = true;
			if (e.key === (dvorak ? 'a' : 'a')) this.left = true;
			if (e.key === (dvorak ? 'o' : 's')) this.down = true;
			if (e.key === (dvorak ? 'e' : 'd')) this.right = true;
		});

		window.addEventListener('keyup', e => {
			if (e.key === (dvorak ? ',' : 'w')) this.up = false;
			if (e.key === (dvorak ? 'a' : 'a')) this.left = false;
			if (e.key === (dvorak ? 'o' : 's')) this.down = false;
			if (e.key === (dvorak ? 'e' : 'd')) this.right = false;
		});
	}

	update(dt: number) {
		const MOVE_SPEED = 1.2;
		const FRICTION = 0.88;


		this.lifeTime += dt;

		if (this.velocity.x < 0) this.xScale = -1;
		else if (this.velocity.x > 0) this.xScale = 1;

		const scale = this.desiredScale.clone();
		scale.x = scale.x - Player.BREATHE_INTENSITY + Math.sin(this.lifeTime / Player.BREATHE_SPEED) * Player.BREATHE_INTENSITY * 2;
		scale.y = scale.y - Player.BREATHE_INTENSITY + Math.sin((this.lifeTime - Player.BREATHE_SPEED / 2) / Player.BREATHE_SPEED) * Player.BREATHE_INTENSITY * 2;

		this.mesh.scale.lerp(
			new THREE.Vector3(scale.x * this.xScale, scale.y, 1),
			Player.SCALE_FRICTION
		);

		// console.log(this.position);

		const dirY = this.up ? this.down ? 0 : -1 : this.down ? 1 : 0;
		const dirX = this.left ? this.right ? 0 : -1 : this.right ? 1 : 0;

		const dirVec = new THREE.Vector2(dirX, dirY).normalize();

		this.velocity = this.velocity.clone().multiplyScalar(FRICTION)
			.add(dirVec.multiplyScalar(MOVE_SPEED).multiplyScalar(1 - FRICTION));

		let startPosition = this.position.clone();
		let desiredPosition = this.position.clone().add(new THREE.Vector2(0, this.velocity.clone().multiplyScalar(dt).y));

		const MOVE_STEPS = 10;
		for (let i = 0; i < MOVE_STEPS; i++) {
			const step = i / MOVE_STEPS;
			const stepPosition = startPosition.clone().lerp(desiredPosition, step);
			if (this.collidesAt(stepPosition)) {
				this.velocity.y = 0;
				break;
			}
			this.position.copy(stepPosition);
		}

		startPosition = this.position.clone();
		desiredPosition = this.position.clone().add(new THREE.Vector2(this.velocity.clone().multiplyScalar(dt).x, 0));

		for (let i = 0; i < MOVE_STEPS; i++) {
			const step = i / MOVE_STEPS;
			const stepPosition = startPosition.clone().lerp(desiredPosition, step);
			if (this.collidesAt(stepPosition)) {
				this.velocity.x = 0;
				break;
			}
			this.position.copy(stepPosition);
		}

		const offset = Player.DRIFT_INTENSITY * Math.sin(this.lifeTime / Player.DRIFT_SPEED) * dt;
		this.mesh.position.set(this.position.x, 0, this.position.y + offset);

		const newCamPos = new THREE.Vector3(this.position.x, 0, this.position.y).add(CAMERA_OFFSET);
		camera.position.set(newCamPos.x, newCamPos.y, newCamPos.z);
		camera.lookAt(new THREE.Vector3(this.position.x, 0, this.position.y).add(CAMERA_LOOK_AT_OFFSET));
	}
}

class Interactable {
	private baseScale: THREE.Vector2;
	private desiredScale: THREE.Vector2;
	private lifeTime = 0;
	private xScale = 1;

	private static readonly SCALE_FRICTION = 0.3;
	private static readonly BREATHE_INTENSITY = 0.0018;
	private static readonly BREATHE_SPEED = 0.4;

	constructor(origin: THREE.Vector2, private mesh: THREE.Mesh) {
		mesh.position.set(origin.x, 0, origin.y);
		this.baseScale = new THREE.Vector2(mesh.scale.x, mesh.scale.y);
		this.desiredScale = this.baseScale.clone();
	}

	update(dt: number, playerPos: THREE.Vector2) {
		this.lifeTime += dt;

		if (playerPos.x < this.mesh.position.x) this.xScale = -1;
		else this.xScale = 1;

		const scale = this.desiredScale.clone();
		scale.x = scale.x - Interactable.BREATHE_INTENSITY + Math.sin(this.lifeTime / Interactable.BREATHE_SPEED) * Interactable.BREATHE_INTENSITY * 2;
		scale.y = scale.y - Interactable.BREATHE_INTENSITY + Math.sin((this.lifeTime - Interactable.BREATHE_SPEED / 2) / Interactable.BREATHE_SPEED) * Interactable.BREATHE_INTENSITY * 2;

		this.mesh.scale.lerp(
			new THREE.Vector3(scale.x * this.xScale, scale.y, 1),
			Interactable.SCALE_FRICTION
		);
	}

	onInteract() {
		console.warn('UNIMPLEMENTED INTERACT FOR INTERACTABLE');
	}
}

type DecorationSpec = [
	THREE.Material,
	number, // base scale
	number  // scale variance
];

interface LayerInfo {
	collisionThreshold: number;
	collisionUp: number;
	numDecorationTests: number;
	decorationMultiplier: number;
	decorations: DecorationSpec[];
}

/**
 * Be sure to provide a fresh geometry instance, as this function will mutate it,
 * by rotating and scaling it by the properties provided. If a new geometry instance isn't provided the
 * modifications will affect all instances of the geometry.
 */

function createDecor(material: THREE.Material, geometry: THREE.BufferGeometry, scale: THREE.Vector2 | number, origin: THREE.Vector3 = new THREE.Vector3()) {
	let scaleVec = typeof scale === 'number' ? new THREE.Vector2(scale, scale) : scale;
	scaleVec.x *= (material as any).map.source.data.width / (material as any).map.source.data.height;
	const mesh = new THREE.Mesh(geometry, material);
	geometry.translate(origin.x, origin.y, origin.z);
	mesh.scale.set(scaleVec.x, scaleVec.y, 1);
	mesh.rotateX(-38 * Math.PI / 180);
	// scene.add(mesh);
	return mesh;
}

const loader = new THREE.TextureLoader();

function loadTextureAsync(src: string) {
	return new Promise<THREE.Texture>(res => loader.load(src, r => res(r)));
}

const interactables: Interactable[] = [];

async function init() {
	scene = new THREE.Scene();

	const planeGeometry = new THREE.PlaneGeometry();
	const planeOffset = new THREE.Vector3(0, 0.5, 0);


	const WORLD_CELL_SIZE = 0.125;
	const WORLD_INFO: LayerInfo[] = [
		{
			collisionThreshold: 0.01,
			collisionUp: 7,
			numDecorationTests: 1,
			decorationMultiplier: 0.5,
			decorations: ([
				[ await loadTextureAsync(img_tree_1), 1.55, 0.15 ],
				[ await loadTextureAsync(img_tree_2), 1.2, 0.05 ],
				[ await loadTextureAsync(img_tree_2), 1.2, 0.05 ],
				[ await loadTextureAsync(img_tree_2), 1.2, 0.05 ],
				[ await loadTextureAsync(img_tree_3), 1.25, 0.05 ],
				[ await loadTextureAsync(img_tree_3), 1.25, 0.05 ],
				[ await loadTextureAsync(img_tree_3), 1.25, 0.05 ],
				[ await loadTextureAsync(img_tree_3), 1.25, 0.05 ],
				[ await loadTextureAsync(img_tree_3), 1.25, 0.05 ],
				[ await loadTextureAsync(img_tree_3), 1.25, 0.05 ]
			] as [ THREE.Texture, number, number ][])
				.map(([ tex, scale, variance ]) =>
				([ new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.9 }), scale, variance ])) as
				[ THREE.Material, number, number ][]
		},
		{
			collisionThreshold: 1,
			collisionUp: 0,
			numDecorationTests: 1,
			decorationMultiplier: 0.3,
			decorations: ([
				// [ await loadTextureAsync(img_foliage_1), 1.55, 0.15 ],
				// [ await loadTextureAsync(img_foliage_2), 1.2, 0.05 ],
				// [ await loadTextureAsync(img_foliage_3), 1.25, 0.05 ],
				[ await loadTextureAsync(img_foliage_1), 0.17, 0.05 ],
				[ await loadTextureAsync(img_foliage_2), 0.17, 0.05 ],
				[ await loadTextureAsync(img_foliage_3), 0.28, 0.05 ],
			] as [ THREE.Texture, number, number ][])
				.map(([ tex, scale, variance ]) =>
				([ new THREE.MeshBasicMaterial({ map: tex, transparent: true }), scale, variance ])) as
				[ THREE.Material, number, number ][]
		},
		{
			collisionThreshold: 1,
			collisionUp: 0,
			numDecorationTests: 1,
			decorationMultiplier: 0.5,
			decorations: ([
				[ await loadTextureAsync(img_rock_1), 0.35, 0.08 ],
				[ await loadTextureAsync(img_rock_2), 0.12, 0.08 ],
				[ await loadTextureAsync(img_rock_2), 0.12, 0.08 ],
				[ await loadTextureAsync(img_rock_2), 0.12, 0.08 ],
				[ await loadTextureAsync(img_rock_2), 0.12, 0.08 ],
				[ await loadTextureAsync(img_rock_2), 0.12, 0.08 ],
				[ await loadTextureAsync(img_rock_2), 0.12, 0.08 ],
				[ await loadTextureAsync(img_rock_3), 0.35, 0.08 ],
				[ await loadTextureAsync(img_rock_3), 0.35, 0.08 ],
			] as [ THREE.Texture, number, number ][])
				.map(([ tex, scale, variance ]) =>
				([ new THREE.MeshBasicMaterial({ map: tex, transparent: true }), scale, variance ])) as
				[ THREE.Material, number, number ][]
		}
	]

	const img = document.createElement('img');
	img.src = img_foliage_map;
	await new Promise(r => img.addEventListener('load', r));
	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(img, 0, 0);
	const imgData = ctx.getImageData(0, 0, img.width, img.height);
	const data = imgData.data;
	const mapSize = img.width;

	const collisionMap: boolean[] = [];
	let allDecorations: THREE.Mesh[] = [];

	for (let i = 0; i < mapSize * mapSize; i += 1) {
		const basePosX = ((i % mapSize) - (mapSize / 2)) * WORLD_CELL_SIZE;
		const basePosY = ((Math.floor(i / mapSize)) - (mapSize / 2)) * WORLD_CELL_SIZE;

		collisionMap[i] = false;

		for (let j = 0; j < WORLD_INFO.length; j++) {
			const layer = WORLD_INFO[j];

			const dataVal = data[i * 4 + j];
			const threshold = dataVal / 255;

			if (threshold > layer.collisionThreshold) {
				for (let k = 0; k < layer.collisionUp; k++) {
					let pos = i - k * mapSize;
					if (pos < 0) continue;
					collisionMap[pos] = true;
				}
			}

			for (let k = 0; k < layer.numDecorationTests; k++) {
				if (Math.random() > threshold * layer.decorationMultiplier) continue;

				const [ material, baseScale, scaleVariance ] =
					layer.decorations[Math.floor(Math.random() * layer.decorations.length)];

				const tree = createDecor(
					material,
					planeGeometry.clone(),
					(baseScale - scaleVariance + Math.random() * scaleVariance * 2),
					planeOffset
				);

				if (Math.random() > 0.5) tree.scale.x *= -1;

				tree.position.set(
					basePosX + Math.random() * WORLD_CELL_SIZE,
					0,
					basePosY + Math.random() * WORLD_CELL_SIZE,
					// Math.random() * treePosVariance - treePosVariance / 2,
					// 0,
					// Math.random() * treePosVariance - treePosVariance / 2,
				);

				allDecorations.push(tree)
			}
		}
	}

	allDecorations.sort((a, b) => b.position.z - a.position.z);
	allDecorations.forEach(d => scene.add(d));

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	if (useControls) {
		controls = new OrbitControls(camera, renderer.domElement)
		controls.target.set(0, 0.5, 0);
		camera.position.set(0, 1, 2);
		camera.lookAt(0, 0.5, 0);
	}

	const playerTexture = await loadTextureAsync(img_player);
	const playerMaterial = new THREE.MeshBasicMaterial({ map: playerTexture, alphaTest: 0.9 });
	const playerMesh = createDecor(playerMaterial, planeGeometry.clone(), 0.25, new THREE.Vector3(0, 1.5, 0));
	scene.add(playerMesh);
	player = new Player(new THREE.Vector2(0, 0), playerMesh, (pos) => {
		const tileX1 = Math.floor((pos.x - 0.25) / WORLD_CELL_SIZE) + mapSize / 2;
		const tileX2 = Math.floor((pos.x + 0.25) / WORLD_CELL_SIZE) + mapSize / 2;
		const tileY1 = Math.floor((pos.y) / WORLD_CELL_SIZE) + mapSize / 2;
		const ind1 = tileX1 + tileY1 * mapSize;
		const ind2 = tileX2 + tileY1 * mapSize;
		// console.log(tileX, tileY, ind);
		// const ind = Math.floor((pos.x / WORLD_CELL_SIZE) - mapSize / 2 + ((pos.y / WORLD_CELL_SIZE) - mapSize / 2) * mapSize);
		if (Math.min(ind1, ind2) < 0 || Math.max(ind1, ind2) >= collisionMap.length) {
			console.warn('out of bounds!');
			return true;
		}
		return collisionMap[ind1] || collisionMap[ind2];
	});

	const char1 = createDecor(await loadTextureAsync(img_char_1).then((tex) =>
	new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.9 })), planeGeometry.clone(), 0.55, planeOffset);
	const interactable1 = new Interactable(new THREE.Vector2(19.5, 8.6), char1);
	scene.add(char1);
	interactables.push(interactable1);

	const char2 = createDecor(await loadTextureAsync(img_char_2).then((tex) =>
	new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.9 })), planeGeometry.clone(), 0.40, planeOffset);
	const interactable2 = new Interactable(new THREE.Vector2(-12.4, -6.2), char2);
	scene.add(char2);
	interactables.push(interactable2);

	const char3 = createDecor(await loadTextureAsync(img_char_3).then((tex) =>
	new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.9 })), planeGeometry.clone(), 0.55, planeOffset);
	const interactable3 = new Interactable(new THREE.Vector2(-27.2, 2.24), char3);
	scene.add(char3);
	interactables.push(interactable3);

	const floorTexture = await new Promise<THREE.Texture>(r => new THREE.TextureLoader().load(img_floor, (res => r(res))));
	floorTexture.wrapS = THREE.RepeatWrapping;
	floorTexture.wrapT = THREE.RepeatWrapping;
	floorTexture.repeat.set(300, 300);

	const material2 = new THREE.MeshBasicMaterial({
		map: floorTexture,
		// transparent: true,
		alphaTest: 0.5,
	});

	const floorGeometry = new THREE.PlaneGeometry(1000,
		1000 * floorTexture.source.data.height / floorTexture.source.data.width);

	const floorMesh = new THREE.Mesh(floorGeometry, material2);
	floorMesh.rotateX(-Math.PI / 2);
	scene.add(floorMesh);

	window.addEventListener('resize', onWindowResize, false)
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
		render()
	}

	update()
}

function update() {
	requestAnimationFrame(update)

	// cube.rotation.x += 0.01
	// cube.rotation.y += 0.01

	const dt = clock.getDelta();

	interactables.forEach(i => i.update(dt, player.position));

	if (useControls) {
		controls.update()
	}
	else {
		player.update(dt);
	}

	render()
}

function render() {
	renderer.render(scene, camera)
}

init();
