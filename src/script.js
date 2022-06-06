import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
  import Stats from 'three/examples/jsm/libs/stats.module.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
  import { uperVertext, uperFragment } from './shader/uperLineShader';
  import { bloomVertext, bloomFragment } from './shader/bloomShader';
  var renderer,scene,camera,controls
  var scanConfig = {
    value: 1.0,
    start: 0,
    end: 0,
    during: 3,
  }
  /**
 * 场景内部分模型辉光效果
 */
const materials = {};
const darkMaterial = new THREE.MeshBasicMaterial({ color: '#000000' });
/**
 * 让模型产生辉光效果
 */
var finalComposer,bloomComposer;
// 区分辉光与非辉光层
const ENTIRE_SCENE = 0,
  BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);
const bloomParams = {
  exposure: 1,
  bloomThreshold: 0,
  bloomStrength: 1,
  bloomRadius: 0.2,
  scene: 'Scene with Glow',
};
  function init() {

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(5, 5, 5);
    camera.layers.enable(1);
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.setScalar(1000);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, .5));
    renderBloom();
    loadDRACO('./racingCar2-processed.glb').then(function(obj){
        scene.add(obj)
        renderEffect(obj)
    })
  }
  const renderBloom = function() {
    // 添加基本的渲染通道
    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = bloomParams.bloomThreshold;
    bloomPass.strength = bloomParams.bloomStrength;
    bloomPass.radius = bloomParams.bloomRadius;

    bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderPass);
    // 把通道加入到组合器
    bloomComposer.addPass(bloomPass);
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture },
        },
        vertexShader: bloomVertext,
        fragmentShader: bloomFragment,
        defines: {},
      }),
      'baseTexture'
    );
    finalPass.needsSwap = true;
    // 初始化实际效果合成器
    finalComposer = new EffectComposer(renderer);

    finalComposer.addPass(renderPass);
    finalComposer.addPass(finalPass);
  }
  const loadGLTF = async function(path) {
      var loader = new GLTFLoader();
      var obj = await loader.loadAsync(path);
      return obj.scene;
  }
  const loadDRACO = async function(path) {

      let loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('draco/');
      loader.setDRACOLoader(dracoLoader);
      const obj = await loader.loadAsync(path);
      return obj.scene;

  }
   function renderEffect(model) {
      let edgeGroup = new THREE.Group();
      model.traverse((obj) => {
          if(obj.name == '立方体') {
              // 将扫描框转为辉光材质
              obj.layers.toggle(BLOOM_SCENE);
            let shaderMaterial = new THREE.ShaderMaterial({
                transparent: true,
                side: THREE.DoubleSide,
                uniforms: {
                  height: scanConfig,
                  uFlowColor: {
                    value: new THREE.Vector4(0.0, 1.0, 1.0, 1.0),
                  },
                  uModelColor: {
                    value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0),
                  },
                },
                vertexShader: uperVertext,
                fragmentShader: uperFragment,
              })
              obj.material = shaderMaterial;
              let boundingBox = obj.geometry.boundingBox;
              // 初始化扫描配置,y轴上下需留出一定空间，防止把上下平面扫描出来
                scanConfig.start = boundingBox.min.y+0.1 || 0;
                scanConfig.end = boundingBox.max.y-0.1 || 0;
                scanConfig.value = scanConfig.start;
          }
        // 设置样式
        else 
        if(obj.type === 'Mesh') edgeGroup.add(_renderFrameMesh(obj));
      });
      scene.add(edgeGroup);
      // 重置变换
    function _renderFrameMesh(obj) {
       
      const edges = new THREE.EdgesGeometry(obj.geometry);
      let color = new THREE.Color(0.1, 0.3, 1);
      var lineBasematerial = new THREE.LineBasicMaterial({
        color: color,
        side: THREE.FrontSide,
        linecap: 'round', //ignored by WebGLRenderer
        linejoin: 'round', //ignored by WebGLRenderer
      });
      const line = new THREE.LineSegments(edges, lineBasematerial);
       // 将外框转为辉光材质
       line.layers.toggle(BLOOM_SCENE);
      return line;
    }
  }

  function calcHeight() {
    let length = scanConfig.end - scanConfig.start;
    // 扫光判断逻辑
    scanConfig.value += length / scanConfig.during / 60;
    if (scanConfig.value >= scanConfig.end) {
      scanConfig.value = scanConfig.start;
    }
  }
  function render() {
    renderer.render(scene, camera);
    calcHeight()
    controls.update()
    requestAnimationFrame(render);
}
  // 将材质转为黑色材质
 function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
      materials[obj.uuid] = obj.material;
      obj.material = darkMaterial;
    }
  }
  // 还原材质
  function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
      obj.material = materials[obj.uuid];
      delete materials[obj.uuid];
    }
  }
function bloomRender() {
    scene.traverse((obj) => darkenNonBloomed(obj));
    bloomComposer.render();
    scene.traverse((obj) => restoreMaterial(obj));
    finalComposer.render();
    requestAnimationFrame(() => {
        calcHeight()
        bloomRender();
    });
}
init()
// render()
bloomRender()