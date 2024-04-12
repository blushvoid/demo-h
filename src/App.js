import * as THREE from "three";
import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  usePlane,
  useCompoundBody,
  useSphere,
} from "@react-three/cannon";
import {
  Environment,
  Sphere,
  MeshDistortMaterial,
  Billboard,
} from "@react-three/drei";
import { LayerMaterial, Depth } from "lamina";
import { Bloom, EffectComposer } from "@react-three/postprocessing";


const emissiveOptions = ["#adadd9", "#d6a98d", "#de9c73", "#e8c4ae", "#ad917f"];


const sphereGeometry = new THREE.SphereGeometry(1, 10, 10);
const neurons = [...Array(100)].map(() => ({
  args: [0.07, 0.04, 0.08, 0.06, 0.12][Math.floor(Math.random() * 5)],
  mass: 1.5,
  angularDamping: 0.2,
  linearDamping: 0.95,
  emissive: emissiveOptions[Math.floor(Math.random() * emissiveOptions.length)],
}));

// const neuronMaterial = new THREE.MeshPhysicalMaterial({
//   color: "#1d1d2e",
//   emissive: emissive || "#adadd9",
//   emissiveIntensity: 1.6, 
//   toneMapped: false,
//   metalness: 0.9,
//   roughness: 0.1,
// });

function Neuron({
  vec = new THREE.Vector3(),
  updatePosition = () => {},
  color = "black",
  emissive,
  ...props
}) {
  const position = useRef([0, 0, 0]);
  const [ref, api] = useCompoundBody(() => ({
    ...props,
    shapes: [
      {
        type: "Box",
        position: [0, 0, 0 * props.args],
        rotation: [5, -10, 10],
        args: new THREE.Vector3().setScalar(props.args * 14).toArray(),
        mass: 1.5,
        angularDamping: 0.2,
        linearDamping: 0.95,
      },
      // { type: "Box", position: [0, 0, 0 * props.args], args: new THREE.Vector3().setScalar(props.args * 10).toArray() },
      // { type: "Sphere", position: [0, 0, 0 * props.args], args: new THREE.Vector3().setScalar(props.args * 2).toArray() },
    ],
  }));

  const material = new THREE.MeshPhysicalMaterial({
    color: "#1d1d2e",
    emissive: emissive || "#adadd9",
    emissiveIntensity: 1.6,
    toneMapped: false,
    metalness: 0.9,
    roughness: 0.1,
  });

  useEffect(
    () =>
      api.position.subscribe((v) => {
        position.current = v;
        updatePosition(v); // Report position back
      }),
    [api, updatePosition]
  );

  useFrame(() =>
    api.applyForce(
      vec
        .set(...position.current)
        .normalize()
        .multiplyScalar(-props.args * 20)
        .toArray(),
      [0, 0, 0]
    )
  );

  return (
    <group ref={ref} dispose={null}>
      <mesh
        scale={props.args}
        geometry={sphereGeometry}
        material={material}
      >
      </mesh>
    </group>
  );
}


const NeuronConnections = ({ neurons }) => {
  const centerPosition = [0, 0, 0];
  const [positions, setPositions] = useState([centerPosition]);
  const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
  const lineGeometry = useRef(new THREE.BufferGeometry());
  const minDistance = 2;
  let numConnected = 1;

  // Initialize positions and colors arrays
  const segments = neurons.length * neurons.length;
  const linePositions = useMemo(
    () => new Float32Array(segments * 3),
    [segments]
  );
  const lineColors = useMemo(() => new Float32Array(segments * 3), [segments]);

  // Update neuron positions
  const updateNeuronPosition = useCallback((index, position) => {
    setPositions((prev) => {
      const updated = [...prev];
      updated[index + 1] = position;
      return updated;
    });
  }, []);

  useFrame(() => {
    let vertexpos = 0;
    let colorpos = 0;
    numConnected = 0;
    const connectionsPerNeuron = new Array(positions.length).fill(0); // Track connections per neuron

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        // Skip if either neuron has reached max connections
        if (connectionsPerNeuron[i] >= 3 || connectionsPerNeuron[j] >= 3)
          continue;

        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDistance) {
          const alpha = 1.0 - dist / minDistance;

          linePositions[vertexpos++] = positions[i][0];
          linePositions[vertexpos++] = positions[i][1];
          linePositions[vertexpos++] = positions[i][2];

          linePositions[vertexpos++] = positions[j][0];
          linePositions[vertexpos++] = positions[j][1];
          linePositions[vertexpos++] = positions[j][2];

          for (let k = 0; k < 6; k++) {
            lineColors[colorpos++] = alpha;
          }

          numConnected++;
          connectionsPerNeuron[i]++; // Increment connection count for both neurons
          connectionsPerNeuron[j]++;
        }
      }
    }

    lineGeometry.current.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );
    lineGeometry.current.setAttribute(
      "color",
      new THREE.BufferAttribute(lineColors, 3)
    );
    lineGeometry.current.setDrawRange(0, numConnected * 2);
    lineGeometry.current.attributes.position.needsUpdate = true;
    lineGeometry.current.attributes.color.needsUpdate = true;
  });

  return (
    <>
      {neurons.map((props, i) => (
        <Neuron
          key={i}
          {...props}
          updatePosition={(pos) => updateNeuronPosition(i, pos)}
        />
      ))}
      <lineSegments geometry={lineGeometry.current} material={lineMaterial} />
    </>
  );
};

function Collisions() {
  const viewport = useThree((state) => state.viewport);
  usePlane(() => ({ position: [0, 0, 0], rotation: [0, 0, 0] }));
  usePlane(() => ({ position: [0, 0, 12], rotation: [0, -Math.PI, 0] }));
  usePlane(() => ({ position: [0, -6, 0], rotation: [-Math.PI / 2, 0, 0] }));
  usePlane(() => ({ position: [0, 6, 0], rotation: [Math.PI / 2, 0, 0] }));
  const [, api] = useSphere(() => ({ type: "Kinematic", args: [2] }));
  return useFrame((state) =>
    api.position.set(
      (state.mouse.x * viewport.width) / 2,
      (state.mouse.y * viewport.height) / 2,
      2.5
    )
  );
}

const Glow = ({ scale = 0.5, near = 0, color, far = 1.4 }) => (
  <Billboard>
    <mesh>
      <circleGeometry args={[2 * scale, 16]} />
      <LayerMaterial
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.DstAlphaFactor}
      >
        <Depth
          colorA={color}
          colorB="black"
          alpha={1}
          mode="normal"
          near={near * scale}
          far={far * scale}
          origin={[0, 0, 0]}
        />
        <Depth
          colorA={color}
          colorB="black"
          alpha={0.5}
          mode="add"
          near={-40 * scale}
          far={far * 1.2 * scale}
          origin={[0, 0, 0]}
        />
        <Depth
          colorA={color}
          colorB="black"
          alpha={1}
          mode="add"
          near={-15 * scale}
          far={far * 0.7 * scale}
          origin={[0, 0, 0]}
        />
        <Depth
          colorA={color}
          colorB="black"
          alpha={1}
          mode="add"
          near={-10 * scale}
          far={far * 0.68 * scale}
          origin={[0, 0, 0]}
        />
      </LayerMaterial>
    </mesh>
  </Billboard>
);

const Center = ({
  size = 0.7,
  amount = 18,
  color = "#adadd9",
  emissive,
  glow,
  ...props
}) => (
  <mesh {...props}>
    <Sphere args={[size, amount, amount]}>
      <MeshDistortMaterial
        speed={1.5}
        factor={2}
        color={color}
        emissive="#adadd9"
        metalness={0.9}
        roughness={0.1}
      />
      <Glow scale={size * 1.2} near={-25} color={glow || emissive || color} />
    </Sphere>
  </mesh>
);

const App = () => (
  <Canvas
    dpr={1.5}
    gl={{ alpha: true, stencil: true, depth: true, antialias: true }}
    camera={{ position: [0, 0, 20], fov: 20, near: 10, far: 40 }}
    onCreated={(state) => (state.gl.toneMappingExposure = 1.5)}
  >
    <Suspense>
    <spotLight position={[0, 10, -15]} penumbra={1} angle={0} color="white" />
    <spotLight position={[2, -10, -30]} penumbra={1} angle={0} color="red" />

    {/* <directionalLight position={[0, 5, -4]} intensity={4} /> */}
    <Environment
      // files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_02_1k.hdr"
      files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/rosendal_park_sunset_puresky_1k.hdr"
      background={true}
      blur={6}
      environmentIntensity={0.4}
      environmentRotation={[0, Math.PI / 1.5, 0]}
    />

    <EffectComposer>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.6}
        intensity={1.5}
      />
      <Physics gravity={[0, 0, 0]} iterations={1} broadphase="SAP">
        <Center />
        <Collisions />
        {
          neurons.map((props, i) => <Neuron key={i} {...props} />) /* prettier-ignore */
        }
        <NeuronConnections neurons={neurons} />
      </Physics>
    </EffectComposer>
    
    </Suspense>
  </Canvas>
);

export default App;
