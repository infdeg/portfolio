import ProjectView from '../views/ProjectView';
import PreloadManager from '../managers/PreloadManager';
import { getRandom, toRadian, clamp, round, oscillate } from '../helpers/utils';
import { loadJSON } from '../helpers/utils-three';
import Asteroid from '../shapes/Asteroid';

// THREE JS
import { ShaderMaterial, VideoTexture, RGBFormat, LinearFilter, WebGLRenderTarget, Raycaster, PerspectiveCamera, Scene, Mesh, Texture, TorusGeometry, PlaneGeometry, SphereGeometry, MeshLambertMaterial, PointLight, Color, MeshBasicMaterial, MeshPhongMaterial, Vector3, BoxGeometry, Object3D } from 'three';
import EffectComposer, { RenderPass, ShaderPass } from 'three-effectcomposer-es6';
import OrbitControls from '../vendors/OrbitControls';
import { CameraDolly } from '../vendors/three-camera-dolly-custom';
import { BrightnessShader } from '../shaders/BrightnessShader'; // VerticalTiltShiftShader shader


// POSTPROCESSING
// import { THREEx } from '../vendors/threex-glow'; // THREEx lib for Glow shader


export default class Blob extends ProjectView {

	constructor(obj) {

		super(obj);

		this.nbAst = 6;

		this.init();


		console.log('Blob view');

	}

	setAsteroids() {


		const props = {
			RADIUS: 5,
			SEGMENTS: 32,
			RINGS: 32,
			geometry: null,
			glow: this.glow
		};

		this.asteroids = [];
		this.asteroidsM = [];

		const geometry = new SphereGeometry(props.RADIUS, props.SEGMENTS, props.RINGS);

		// const material = new MeshLambertMaterial({ color: 0x4682b4 });

		const video = document.getElementById( 'video' );
		const tex = new VideoTexture( video );
		tex.minFilter = LinearFilter;
		tex.magFilter = LinearFilter;
		tex.format = RGBFormat;
		// const img = PreloadManager.getResult('texture-asteroid');
		// const tex = new Texture(img);
		tex.needsUpdate = true;

		this.brightness = new BrightnessShader();

		// this.brightness2 = new BrightnessShader();

		this.brightness.uniforms.tInput.value = tex;
		this.brightness.range = oscillate(1,1.5);
		this.brightness.time = 200;
		// this.brightness2.uniforms.tInput.value = tex;

		// const material = new MeshBasicMaterial({
		// 	color: 0xFFFFFF,
		// 	map: tex
		// });

		const material = new ShaderMaterial({
			uniforms: this.brightness.uniforms,
			vertexShader: this.brightness.vertexShader,
			fragmentShader: this.brightness.fragmentShader,
			transparent: true,
			// opacity: 0.5
		});


		// this.materialAst1 = new ShaderMaterial({
		// 	uniforms: this.brightness.uniforms,
		// 	vertexShader: this.brightness.vertexShader,
		// 	fragmentShader: this.brightness.fragmentShader,
		// 	transparent: true,
		// 	opacity: 0.5
		// });

		// this.materialAst2 = new ShaderMaterial({
		// 	uniforms: this.brightness2.uniforms,
		// 	vertexShader: this.brightness2.vertexShader,
		// 	fragmentShader: this.brightness2.fragmentShader,
		// 	transparent: true,
		// 	opacity: 0.5
		// });

		let pos;
		const posFixed = [
			{ x: 0, y: 0, z: 0, s: 6 },
			{ x: -50, y: 15, z: 20 },
			{ x: 40, y: -90, z: -80 },
			{ x: -40, y: 70, z: -50 },
			{ x: 60, y: 20, z: -40 },
			{ x: 80, y: -30, z: 10 },
			{ x: -40, y: -40, z: -100 },
		];


		for (let i = 0; i < posFixed.length - 1; i++) {

			const rot = {
				x: getRandom(-180, 180),
				y: getRandom(-180, 180),
				z: getRandom(-180, 180),
			};
			// Intra perimeter radius
			const ipRadius = 50;

			pos = posFixed[i];

			// if (pos.x < ipRadius && pos.x > -ipRadius && pos.y < ipRadius && pos.y > -ipRadius && pos.z < ipRadius && pos.z > -ipRadius) {
			// 	console.log(i, ' dans le périmetre !');
			// 	pos.x += ipRadius;
			// 	pos.y += ipRadius;
			// 	pos.z += ipRadius;

			// }

			//  force impulsion
			const force = {
				x: getRandom(-10, 10),
				y: getRandom(-10, 10),
				z: getRandom(-10, 10)
			};

			const scale = posFixed[i].s || getRandom(2,4.5);
			const speed = getRandom(300, 400); // more is slower
			const range = oscillate(10,15);
			const timeRotate = getRandom(15000, 17000);

			// let finalMat;

			// if (i % 2 === 0) {
			// 	finalMat = this.materialAst1;
			// } else {
			// 	finalMat = this.materialAst2;
			// }

			const asteroid = new Asteroid({
				geometry,
				material: material,
				pos,
				rot,
				force,
				scale,
				range,
				speed,
				timeRotate
			});

			asteroid.mesh.index = i;
			asteroid.initY = posFixed[i].y;
			asteroid.offset = getRandom(0,1000);

			this.asteroids.push(asteroid);
			this.asteroidsM.push(asteroid.mesh);

			// add mesh to the scene
			this.scene.add(asteroid.mesh);

		}
		// super.setAsteroids(this.models[0].geometry);

	}

	setLight() {

		let paramsLight = [
			// { x: 70, y: 70, z: 0 },
			{ x: -100, y: 0, z: 0 },
			{ x: 100, y: 0, z: 0 },
			{ x: 0, y: 0, z: 170 },
			{ x: 0, y: -0, z: 0 }
		];

		// Check Ambient Light
		// scene.add( new THREE.AmbientLight( 0x00020 ) );

		for (let i = 0; i < paramsLight.length; i++) {

			// create a point light
			let pointLight = new PointLight(0xFFFFFF, 0.8, 600, 2);
			// set its position
			pointLight.position.set(paramsLight[i].x, paramsLight[i].y, paramsLight[i].z);
			// pointLight.power = 20;
			pointLight.visible = true;

			// add to the scene
			this.scene.add(pointLight);
		}
	}

	raf() {
		// update world
		// if (this.gravity === true) {
		// 	this.world.step();

		// 	// Symbol body
		// 	// this.symbol.mesh.position.copy(this.symbol.body.getPosition());
		// 	// this.symbol.mesh.quaternion.copy(this.symbol.body.getQuaternion());


		// Asteroids meshs
		this.asteroids.forEach( (el)=> {

			// Move top and bottom --> Levit effect
			// Start Number + Math.sin(this.time*2*Math.PI/PERIOD)*(SCALE/2) + (SCALE/2)
			el.mesh.position.y = el.initY + Math.sin((this.time + el.offset) * 2 * Math.PI / el.speed) * el.range.coef + el.range.add;
			// rotate

			// el.mesh.rotation.y = toRadian(el.initRotateY + Math.sin(this.time * 2 * Math.PI / el.timeRotate) * (360 / 2) + 360 / 2);
			// // el.mesh.rotation.x = toRadian(Math.sin(this.time * 2 * Math.PI / 400) * el.rotateRangeX ); // -30 to 30 deg rotation
			// el.mesh.rotation.z = toRadian(el.initRotateZ + Math.sin(this.time * 2 * Math.PI / el.timeRotate) * el.rotateRangeZ ); // -30 to 30 deg rotation

		});


		// console.log(this.symbol.glowMesh.insideMesh.material.uniforms['power'].value);
		this.brightness.uniforms['contrast'].value = Math.sin(this.time * 2 * Math.PI / this.brightness.time) * this.brightness.range.coef + this.brightness.range.add;

		// this.brightness2.uniforms['contrast'].value = (Math.cos(this.time / 40) + 1.2) * 3;

		super.raf();

	}

}
