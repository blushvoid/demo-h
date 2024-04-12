import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { extend } from "@react-three/fiber";


const GlowShaderMaterial = shaderMaterial(
    // Uniforms
    {
        color: new THREE.Color(0xb88a79),
        viewVector: new THREE.Vector3(),
      },
      // Vertex Shader
      `varying vec3 vNormal;
       varying vec3 vViewVector;
    
       void main() {
         vNormal = normalize(normalMatrix * normal);
         vViewVector = normalize(cameraPosition - modelViewMatrix * vec4(position, 1.0).xyz);
         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
       }`,
      // Fragment Shader
      `uniform vec3 color;
       varying vec3 vNormal;
       varying vec3 vViewVector;
    
       void main() {
         float intensity = pow(0.7 - dot(vNormal, vViewVector), 2.0);
         gl_FragColor = vec4(color, 1.0) * intensity;
       }`
    );

  extend({ GlowShaderMaterial });

  export default GlowShaderMaterial;

