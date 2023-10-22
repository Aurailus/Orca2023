
import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.module.js';

let camera, scene, renderer, stats;

init();
animate();

async function init() {
	const container = document.createElement('div');
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.position.set(0, 1, 5);

	scene = new THREE.Scene();

	//

	const loader = new THREE.TextureLoader();
	const geometry = new THREE.BoxGeometry();

	// add box 1 - grey8 texture

	const texture1 = loader.load('tree.png');
	texture1.colorSpace = THREE.SRGBColorSpace;
	const material1 = new THREE.MeshPhongMaterial( { color: 0xffffff, map: texture1, transparent: true } );
	const mesh1 = new THREE.Mesh( geometry, material1 );
	mesh1.position.x = - 1;

	scene.add( mesh1 );

	const ambientLight = new THREE.AmbientLight( 0xffffff, 1.5 );
	scene.add( ambientLight );

	const light = new THREE.DirectionalLight( 0xffffff, 2.5 );
	light.position.set( 1, 1, 1 );
	scene.add( light );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.enableZoom = false;

	stats = new Stats();
	container.appendChild( stats.dom );

	window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}


function animate() {
	requestAnimationFrame( animate );

	render();
	stats.update();
}

function render() {
	renderer.render( scene, camera );
}
