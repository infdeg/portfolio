import EmitterManager from '../managers/EmitterManager';
// import { getRandom, toRadian, clamp, round } from '../helpers/utils';
import SceneManager from '../managers/SceneManager';

import * as THREE from 'three';
import OrbitControls from '../vendors/OrbitControls';
import SimplexNoise from '../vendors/SimplexNoise';
import GPUComputationRenderer from '../vendors/GPUComputationRenderer';
import dat from 'dat-gui';

export default class IntroView {

	constructor(el) {

		this.el = el;

		this.ui = {

		};

		// bind

		this.init = this.init.bind(this);
		this.raf = this.raf.bind(this);
		this.resizeHandler = this.resizeHandler.bind(this);
		this.valuesChanger = this.valuesChanger.bind(this);
		this.initWater = this.initWater.bind(this);
		this.fillTexture = this.fillTexture.bind(this);
		this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this);
		this.onDocumentTouchStart = this.onDocumentTouchStart.bind(this);
		this.onDocumentTouchMove = this.onDocumentTouchMove.bind(this);
		this.smoothWater = this.smoothWater.bind(this);
		this.setMouseCoords = this.setMouseCoords.bind(this);

		this.init();

		this.events(true);

	}

	events(method) {

		// let evListener = method === false ? 'removeEventListener' : 'addEventListener';
		let onListener = method === false ? 'off' : 'on';

		EmitterManager[onListener]('resize', this.resizeHandler);
		EmitterManager[onListener]('raf', this.raf);
	}

	init() {

		// if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.hash = document.location.hash.substr( 1 );
		if ( this.hash ) this.hash = parseInt( this.hash, 0 );

		// Texture width for simulation
		this.WIDTH = this.hash || 128;
		// let NUM_TEXELS = WIDTH * WIDTH;

		// Water size in system units
		this.BOUNDS = 512;
		// let BOUNDS_HALF = BOUNDS * 0.5;

		let container;
		let controls;
		this.mouseMoved = false;
		this.mouseCoords = new THREE.Vector2();
		this.raycaster = new THREE.Raycaster();

		this.simplex = new SimplexNoise();

		document.getElementById( 'waterSize' ).innerText = `${this.WIDTH} x ${this.WIDTH}`;

		// function change(n) {
		// 	location.hash = n;
		// 	location.reload();
		// 	return false;
		// }


		let options = '';
		for ( let i = 4; i < 10; i++ ) {
			let j = Math.pow( 2, i );
			options += '<a href="#" onclick="return change(' + j + ')">' + j + 'x' + j + '</a> ';
		}

		document.getElementById('options').innerHTML = options;

		container = document.createElement( 'div' );
		document.body.appendChild( container );

		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
		this.camera.position.set( 0, 200, 350 );

		this.scene = new THREE.Scene();

		let sun = new THREE.DirectionalLight( 0xFFFFFF, 1.0 );
		sun.position.set( 300, 400, 175 );
		this.scene.add( sun );

		let sun2 = new THREE.DirectionalLight( 0xe8f0ff, 0.2 );
		sun2.position.set( -100, 350, -200 );
		this.scene.add( sun2 );

		SceneManager.renderer.setClearColor( 0x000000 );
		SceneManager.renderer.setPixelRatio( window.devicePixelRatio );

		controls = new OrbitControls( this.camera, SceneManager.renderer.domElement );


		// stats = new Stats();
		// container.appendChild( stats.dom );

		document.addEventListener( 'mousemove', this.onDocumentMouseMove, false );
		document.addEventListener( 'touchstart', this.onDocumentTouchStart, false );
		document.addEventListener( 'touchmove', this.onDocumentTouchMove, false );

		document.addEventListener( 'keydown', ( event ) => {

			// W Pressed: Toggle wireframe
			if ( event.keyCode === 87 ) {

				this.waterMesh.material.wireframe = !this.waterMesh.material.wireframe;
				this.waterMesh.material.needsUpdate = true;

			}

		} , false );


		let gui = new dat.GUI();

		this.effectController = {
			mouseSize: 20.0,
			viscosity: 0.03
		};

		gui.add( this.effectController, 'mouseSize', 1.0, 100.0, 1.0 ).onChange( this.valuesChanger );
		gui.add( this.effectController, 'viscosity', 0.0, 0.1, 0.001 ).onChange( this.valuesChanger );
		let buttonSmooth = {
			smoothWater: () => {
				this.smoothWater();
			}
		};
		gui.add( buttonSmooth, 'smoothWater' );


		this.initWater();

		this.valuesChanger();

		// ADD BOXES
		let numberBox = 2;

		for (let i = 0; i < numberBox; i++) {

			let geometry = new THREE.BoxGeometry( 100, 100, 100 );
			let material = new THREE.MeshBasicMaterial( {color: 0xFFFFFF} );
			let cube = new THREE.Mesh( geometry, material );
			cube.position.x = i * 200 - 100;
			cube.position.z = i * 200 - 100;

			this.scene.add( cube );

			const tl = new TimelineMax({repeat: -1});
			tl.fromTo(cube.position, 2, {y:-50 }, {y:50, ease:window.Linear.easeNone });
			tl.to(cube.position, 2, {y:-50, ease:window.Linear.easeNone });
			tl.fromTo(cube.position, 2, {y:-50 }, {y:50, ease:window.Linear.easeNone });
			tl.fromTo(cube.position, 7, {z:-200 }, {z:200, ease:window.Linear.easeNone }, 0);
		}
	}

	initWater() {

		let materialColor = 0xffffff;

		let geometry = new THREE.PlaneBufferGeometry( this.BOUNDS, this.BOUNDS, this.WIDTH - 1, this.WIDTH - 1 );

		// material: make a ShaderMaterial clone of MeshPhongMaterial, with customized vertex shader
		let material = new THREE.ShaderMaterial( {
			uniforms: THREE.UniformsUtils.merge( [
				THREE.ShaderLib[ 'phong' ].uniforms,
				{
					heightmap: { value: null }
				}
			] ),
			vertexShader: document.getElementById( 'waterVertexShader' ).textContent,
			fragmentShader: THREE.ShaderChunk[ 'meshphong_frag' ]

		} );

		material.lights = true;

		// Material attributes from MeshPhongMaterial
		material.color = new THREE.Color( materialColor );
		material.specular = new THREE.Color( 0x111111 );
		material.shininess = 50;

		// Sets the uniforms with the material values
		material.uniforms.diffuse.value = material.color;
		material.uniforms.specular.value = material.specular;
		material.uniforms.shininess.value = Math.max( material.shininess, 1e-4 );
		material.uniforms.opacity.value = material.opacity;

		// Defines
		material.defines.WIDTH = this.WIDTH.toFixed( 1 );
		material.defines.BOUNDS = this.BOUNDS.toFixed( 1 );

		this.waterUniforms = material.uniforms;

		this.waterMesh = new THREE.Mesh( geometry, material );
		this.waterMesh.rotation.x = -Math.PI / 2;
		this.waterMesh.matrixAutoUpdate = false;
		this.waterMesh.updateMatrix();

		this.scene.add( this.waterMesh );

		// Mesh just for mouse raycasting
		let geometryRay = new THREE.PlaneBufferGeometry( this.BOUNDS, this.BOUNDS, 1, 1 );
		this.meshRay = new THREE.Mesh( geometryRay, new THREE.MeshBasicMaterial( { color: 0xFFFFFF, visible: false } ) );
		this.meshRay.rotation.x = -Math.PI / 2;
		this.meshRay.matrixAutoUpdate = false;
		this.meshRay.updateMatrix();
		this.scene.add( this.meshRay );


		// Creates the gpu computation class and sets it up
		console.log(GPUComputationRenderer);

		this.gpuCompute = new GPUComputationRenderer( this.WIDTH, this.WIDTH, SceneManager.renderer );

		let heightmap0 = this.gpuCompute.createTexture();

		this.fillTexture( heightmap0 );

		this.heightmapVariable = this.gpuCompute.addVariable( 'heightmap', document.getElementById( 'heightmapFragmentShader' ).textContent, heightmap0 );

		this.gpuCompute.setVariableDependencies( this.heightmapVariable, [ this.heightmapVariable ] );

		this.heightmapVariable.material.uniforms.mousePos = { value: new THREE.Vector2( 10000, 10000 ) };
		this.heightmapVariable.material.uniforms.mouseSize = { value: 20.0 };
		this.heightmapVariable.material.uniforms.viscosityConstant = { value: 0.03 };
		this.heightmapVariable.material.defines.BOUNDS = this.BOUNDS.toFixed( 1 );

		let error = this.gpuCompute.init();
		if ( error !== null ) {
			console.error( error );
		}

		// Create compute shader to smooth the water surface and velocity
		this.smoothShader = this.gpuCompute.createShaderMaterial( document.getElementById( 'smoothFragmentShader' ).textContent, { texture: { value: null } } );

	}

	fillTexture( texture ) {

		let waterMaxHeight = 10;

		let noise = ( x, y, z ) => {
			let multR = waterMaxHeight;
			let mult = 0.025;
			let r = 0;
			for ( let i = 0; i < 15; i++ ) {
				r += multR * this.simplex.noise( x * mult, y * mult );
				multR *= 0.53 + 0.025 * i;
				mult *= 1.25;
			}
			return r;
		};

		let pixels = texture.image.data;

		let p = 0;
		for ( let j = 0; j < this.WIDTH; j++ ) {
			for ( let i = 0; i < this.WIDTH; i++ ) {

				let x = i * 128 / this.WIDTH;
				let y = j * 128 / this.WIDTH;

				pixels[ p + 0 ] = noise( x, y, 123.4 );
				pixels[ p + 1 ] = 0;
				pixels[ p + 2 ] = 0;
				pixels[ p + 3 ] = 1;

				p += 4;
			}
		}

	}

	valuesChanger() {

		this.heightmapVariable.material.uniforms.mouseSize.value = this.effectController.mouseSize;
		this.heightmapVariable.material.uniforms.viscosityConstant.value = this.effectController.viscosity;

	}

	smoothWater() {

		let currentRenderTarget = this.gpuCompute.getCurrentRenderTarget( this.heightmapVariable );
		let alternateRenderTarget = this.gpuCompute.getAlternateRenderTarget( this.heightmapVariable );

		for ( let i = 0; i < 10; i++ ) {

			this.smoothShader.uniforms.texture.value = currentRenderTarget.texture;
			this.gpuCompute.doRenderTarget( this.smoothShader, alternateRenderTarget );

			this.smoothShader.uniforms.texture.value = alternateRenderTarget.texture;
			this.gpuCompute.doRenderTarget( this.smoothShader, currentRenderTarget );

		}
	}

	setMouseCoords( x, y ) {

		this.mouseCoords.set( ( x / SceneManager.renderer.domElement.clientWidth ) * 2 - 1, - ( y / SceneManager.renderer.domElement.clientHeight ) * 2 + 1 );
		this.mouseMoved = true;

	}

	onDocumentMouseMove( event ) {

		this.setMouseCoords( event.clientX, event.clientY );

	}

	onDocumentTouchStart( event ) {

		if ( event.touches.length === 1 ) {

			event.preventDefault();

			this.setMouseCoords( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );


		}

	}

	onDocumentTouchMove( event ) {

		if ( event.touches.length === 1 ) {

			event.preventDefault();

			this.setMouseCoords( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );


		}

	}

	resizeHandler() {

		this.width = window.innerWidth * window.devicePixelRatio;
		this.height = window.innerHeight * window.devicePixelRatio;

		SceneManager.resizeHandler({
			camera: this.camera
		});

	}

	raf() {

		// Set uniforms: mouse interaction
		let uniforms = this.heightmapVariable.material.uniforms;

		if ( this.mouseMoved ) {

			this.raycaster.setFromCamera( this.mouseCoords, this.camera );

			let intersects = this.raycaster.intersectObject( this.meshRay );

			if ( intersects.length > 0 ) {
				let point = intersects[ 0 ].point;
				uniforms.mousePos.value.set( point.x, point.z );

			}
			else {
				uniforms.mousePos.value.set( 10000, 10000 );
			}

			this.mouseMoved = false;
		}
		else {
			uniforms.mousePos.value.set( 10000, 10000 );
		}

		// Do the gpu computation
		this.gpuCompute.compute();

		// Get compute output in custom uniform
		this.waterUniforms.heightmap.value = this.gpuCompute.getCurrentRenderTarget( this.heightmapVariable ).texture;

		// Render
		// renderer.render( scene, camera );

		// Render Scenes
		SceneManager.render({
			camera: this.camera,
			scene: this.scene,
			cssScene: null,
			effectController: null,
			composer: null
		});

	}

	destroy() {
		this.events(false);
	}
}
