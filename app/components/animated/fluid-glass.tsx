'use client';

import * as THREE from 'three';
import { useRef, useState, useEffect, useMemo, memo, ReactNode } from 'react';
import {
  Canvas,
  createPortal,
  invalidate,
  useFrame,
  useThree,
  ThreeElements,
} from '@react-three/fiber';
import {
  useFBO,
  useGLTF,
  Preload,
  Scroll,
  ScrollControls,
  MeshTransmissionMaterial,
  Text,
} from '@react-three/drei';
import { easing } from 'maath';
import { cn } from '@/lib/utils';

type Mode = 'lens' | 'bar' | 'cube';

interface NavItem {
  label: string;
  link: string;
}

type ModeProps = Record<string, unknown>;

/** Fallback FBO si le canvas DarkVeil n’est pas encore branché */
const BUFFER_BACKDROP = '#0a0b0e' as const;

/** Compromis netteté transmission / perf (trop bas = lentille « crado ») */
const FBO_RES_SCALE = 0.52;

/**
 * 2 = upload texture voile tous les 2 frames (moins de bande passante GPU).
 * Repasser à 1 si artefact visible sur la lentille.
 */
const VEIL_TEXTURE_FRAME_SKIP = 2;

/**
 * Amplitude du déplacement (curseur -1…+1). X = gauche/droite (zone latérale un peu plus large).
 */
const LENS_FOLLOW_RANGE_X = 1.06;
const LENS_FOLLOW_RANGE_Y = 0.68;

/** maath damp3 : smoothTime plus petit = suit le curseur plus vite */
const LENS_DAMP_SMOOTH = 0.08;

export type FluidGlassOverlaySlide = {
  /** Nom de l’argument (ex. Moins de friction) */
  title: string;
  /** Sous-titre associé */
  subtitle: string;
};

/** Texte scrollé **dans** la zone du canvas (dessus la lentille). */
export type FluidGlassOverlayScroll = {
  /** Un cran de scroll par entrée : titre d’argument + sous-titre à l’écran */
  slides: FluidGlassOverlaySlide[];
  titleFontClassName?: string;
  /** Hauteur d’un « cran » de scroll (alignée sur le conteneur parent). Ex. min(72vh,680px) */
  panelMinHeight?: string;
};

interface FluidGlassProps {
  mode?: Mode;
  className?: string;
  /** Si défini : scroll interne drei, une page par slide */
  overlayScroll?: FluidGlassOverlayScroll;
  lensProps?: ModeProps;
  barProps?: ModeProps;
  cubeProps?: ModeProps;
  /**
   * Canvas du DarkVeil (même frame que la section) : copié en texture pour le FBO
   * afin que la transmission échantillonne le vrai fond animé (liquid glass sur le voile).
   */
  backdropCanvas?: HTMLCanvasElement | null;
  /** Quand false (section hors viewport) : pas de texture live → grosse économie GPU */
  backdropActive?: boolean;
  /**
   * Quand false : `frameloop="never"` — plus de `useFrame` / rendu R3F (section hors viewport).
   * À combiner avec pause du DarkVeil côté parent.
   */
  renderActive?: boolean;
}

function ResumeR3FWhenActive({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) invalidate();
  }, [active]);
  return null;
}

function FluidGlassScrollPanels({ slides, titleFontClassName }: FluidGlassOverlayScroll) {
  /**
   * ScrollControls + Scroll html (drei) translate le bloc HTML avec `size.height` du canvas (px).
   * Si les panneaux utilisent min(76vh, 720px), la hauteur réelle ≠ hauteur du canvas → slides
   * désalignés / coupés. On aligne sur la hauteur pixel du renderer.
   */
  const canvasPx = useThree((s) => s.size.height);
  const panelH = Math.max(1, Math.round(canvasPx));

  const panelStyle = {
    minHeight: panelH,
    height: panelH,
    boxSizing: 'border-box' as const
  };

  return (
    <div
      className={cn(
        'pointer-events-auto mx-auto flex w-full max-w-3xl flex-col items-center',
        'px-5 text-center text-white sm:px-8'
      )}
    >
      {slides.map((slide, index) => (
        <section
          key={slide.title}
          className="flex w-full max-w-full flex-col items-center justify-center gap-4 py-6 text-center sm:gap-5 sm:py-8"
          style={panelStyle}
        >
          <p className="w-full max-w-full text-center text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400 sm:text-sm">
            {index + 1} / {slides.length}
          </p>
          <h3
            className={cn(
              titleFontClassName,
              'w-full max-w-full text-center text-balance text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl'
            )}
          >
            {slide.title}
          </h3>
          <p
            className={cn(
              titleFontClassName,
              'w-full max-w-2xl text-center text-pretty text-lg font-medium leading-relaxed text-zinc-200/95 sm:text-xl md:text-2xl lg:text-[1.55rem]'
            )}
          >
            {slide.subtitle}
          </p>
        </section>
      ))}
    </div>
  );
}

export default function FluidGlass({
  mode = 'lens',
  className,
  overlayScroll,
  lensProps = {},
  barProps = {},
  cubeProps = {},
  backdropCanvas = null,
  backdropActive = true,
  renderActive = true,
}: FluidGlassProps) {
  const Wrapper = mode === 'bar' ? Bar : mode === 'cube' ? Cube : Lens;
  const rawOverrides = mode === 'bar' ? barProps : mode === 'cube' ? cubeProps : lensProps;

  const {
    navItems = [
      { label: 'Home', link: '' },
      { label: 'About', link: '' },
      { label: 'Contact', link: '' }
    ],
    ...modeProps
  } = rawOverrides;

  const withInternalScroll =
    Boolean(overlayScroll?.slides?.length) && mode !== 'bar';
  const overlayPageCount = overlayScroll?.slides.length ?? 1;

  return (
    <div
      className={cn(
        'fluid-glass-scroll-hide h-full min-h-0 w-full bg-transparent',
        className
      )}
    >
      <Canvas
        frameloop={renderActive ? 'always' : 'never'}
        camera={{ position: [0, 0, 20], fov: 15 }}
        dpr={[1, 1.2]}
        gl={{
          alpha: true,
          /** true : meilleure composition avec le DarkVeil CSS derrière le canvas */
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          antialias: true,
          /** default : moins agressif que high-performance, souvent plus fluide avec le reste de la page */
          powerPreference: 'default',
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }}
        className="relative z-0 h-full min-h-0 w-full rounded-[inherit] touch-none bg-transparent"
        style={{
          height: '100%',
          width: '100%',
          pointerEvents: withInternalScroll ? 'none' : undefined,
          background: 'transparent',
        }}
      >
        <ResumeR3FWhenActive active={renderActive} />
        {/* Pas de HDRI Environment (très coûteux) — suffisant pour la lentille */}
        <ambientLight intensity={0.42} />
        <directionalLight position={[6, 10, 8]} intensity={0.55} />
        {withInternalScroll ? (
          <ScrollControls
            damping={0.32}
            pages={overlayPageCount}
            distance={1}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              zIndex: 10
            }}
          >
            <Wrapper
              modeProps={modeProps}
              backdropCanvas={backdropCanvas}
              backdropActive={backdropActive}
            >
              <group />
            </Wrapper>
            <Scroll
              html
              style={{
                width: '100%',
                maxWidth: '100%',
                left: 0,
                right: 0,
                zIndex: 20,
                pointerEvents: 'auto'
              }}
            >
              <FluidGlassScrollPanels {...overlayScroll!} />
            </Scroll>
            <Preload />
          </ScrollControls>
        ) : (
          <>
            {mode === 'bar' && <NavItems items={navItems as NavItem[]} />}
            <Wrapper
              modeProps={modeProps}
              backdropCanvas={backdropCanvas}
              backdropActive={backdropActive}
            >
              <group />
            </Wrapper>
            <Preload />
          </>
        )}
      </Canvas>
    </div>
  );
}

type MeshProps = ThreeElements['mesh'];

/** Quad dans la scène du FBO : texture du canvas DarkVeil (upload GPU throttlé). */
function BufferVeilBackdrop({ canvas }: { canvas: HTMLCanvasElement }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const frameTick = useRef(0);
  const { gl } = useThree();
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    const maxA = gl.capabilities.getMaxAnisotropy?.() ?? 1;
    t.anisotropy = Math.min(8, maxA);
    return t;
  }, [canvas, gl]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((state) => {
    frameTick.current += 1;
    if (frameTick.current % VEIL_TEXTURE_FRAME_SKIP === 0) {
      // Upload GPU du canvas HTML (coûteux — throttlé)
      // eslint-disable-next-line react-hooks/immutability -- propriété mutable prévue par Three
      texture.needsUpdate = true;
    }
    /* Plan au niveau z=0 : même profondeur que le fond du FBO (évite bandes / zones sans texture) */
    const v = state.viewport.getCurrentViewport(state.camera, [0, 0, 0]);
    if (meshRef.current) {
      const pad = 1.03;
      meshRef.current.scale.set(v.width * pad, v.height * pad, 1);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={-2}>
      <planeGeometry />
      <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

interface ModeWrapperProps extends MeshProps {
  children?: ReactNode;
  glb: string;
  geometryKey: string;
  lockToBottom?: boolean;
  followPointer?: boolean;
  modeProps?: ModeProps;
  backdropCanvas?: HTMLCanvasElement | null;
  backdropActive?: boolean;
}

const ModeWrapper = memo(function ModeWrapper({
  children,
  glb,
  geometryKey,
  lockToBottom = false,
  followPointer = true,
  modeProps = {},
  backdropCanvas,
  backdropActive = true,
  ...props
}: ModeWrapperProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const pointerNorm = useRef({ x: 0, y: 0 });
  const { nodes } = useGLTF(glb);
  const { size, gl } = useThree();

  /**
   * `window` (et pas le canvas) : avec ScrollControls + overlay scroll, le canvas est en
   * `pointer-events: none` pour laisser passer le scroll HTML — aucun `pointermove` sur le canvas.
   */
  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const rawX = (e.clientX - r.left) / Math.max(1, r.width);
      const rawY = (e.clientY - r.top) / Math.max(1, r.height);
      pointerNorm.current.x = Math.max(-1, Math.min(1, rawX * 2 - 1));
      pointerNorm.current.y = Math.max(-1, Math.min(1, -(rawY * 2 - 1)));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [gl]);
  const bufW = Math.max(1, Math.floor(size.width * FBO_RES_SCALE));
  const bufH = Math.max(1, Math.floor(size.height * FBO_RES_SCALE));
  /** Pas de MSAA sur le FBO : le resolve multi-échantillons peut provoquer des flashs / scintillement */
  const buffer = useFBO(bufW, bufH);
  const [scene] = useState<THREE.Scene>(() => new THREE.Scene());
  const geoWidthRef = useRef<number>(1);

  useEffect(() => {
    /* Three.js : fond du FBO (voir BufferVeilBackdrop ou fallback couleur) */
    /* eslint-disable react-hooks/immutability -- THREE.Scene.background */
    if (backdropCanvas && backdropActive) {
      scene.background = null;
    } else {
      scene.background = new THREE.Color(BUFFER_BACKDROP);
    }
    /* eslint-enable react-hooks/immutability */
  }, [scene, backdropCanvas, backdropActive]);

  useEffect(() => {
    const geo = (nodes[geometryKey] as THREE.Mesh)?.geometry;
    geo.computeBoundingBox();
    geoWidthRef.current = geo.boundingBox!.max.x - geo.boundingBox!.min.x || 1;
  }, [nodes, geometryKey]);

  useFrame((state, delta) => {
    const { gl, viewport, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const px = pointerNorm.current.x;
    const py = pointerNorm.current.y;

    const destX = followPointer ? px * LENS_FOLLOW_RANGE_X : 0;
    const destY = lockToBottom ? -v.height / 2 + 0.2 : followPointer ? py * LENS_FOLLOW_RANGE_Y : 0;
    easing.damp3(ref.current.position, [destX, destY, 15], LENS_DAMP_SMOOTH, delta);

    if ((modeProps as { scale?: number }).scale == null) {
      const maxWorld = v.width * 0.9;
      const desired = maxWorld / geoWidthRef.current;
      ref.current.scale.setScalar(Math.min(0.15, desired));
    }

    /* FBO : fond = texture du canvas DarkVeil (ou fallback BUFFER_BACKDROP). */
    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
  });

  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extraMat } = modeProps as {
    scale?: number;
    ior?: number;
    thickness?: number;
    anisotropy?: number;
    chromaticAberration?: number;
    [key: string]: unknown;
  };

  return (
    <>
      {backdropCanvas && backdropActive
        ? createPortal(<BufferVeilBackdrop canvas={backdropCanvas} />, scene)
        : null}
      {createPortal(children, scene)}
      <mesh
        ref={ref}
        scale={scale ?? 0.15}
        rotation-x={Math.PI / 2}
        geometry={(nodes[geometryKey] as THREE.Mesh)?.geometry}
        {...props}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={ior ?? 1.15}
          thickness={thickness ?? 5}
          anisotropy={anisotropy ?? 0.02}
          chromaticAberration={chromaticAberration ?? 0.06}
          color="#ffffff"
          roughness={0.075}
          metalness={0}
          distortion={0}
          temporalDistortion={0}
          {...(typeof extraMat === 'object' && extraMat !== null ? extraMat : {})}
        />
      </mesh>
    </>
  );
});

function Lens({
  modeProps,
  backdropCanvas,
  backdropActive,
  ...p
}: {
  modeProps?: ModeProps;
  backdropCanvas?: HTMLCanvasElement | null;
  backdropActive?: boolean;
} & MeshProps) {
  return (
    <ModeWrapper
      glb="/assets/3d/lens.glb"
      geometryKey="Cylinder"
      followPointer
      modeProps={modeProps}
      backdropCanvas={backdropCanvas}
      backdropActive={backdropActive}
      {...p}
    />
  );
}

function Cube({
  modeProps,
  backdropCanvas,
  backdropActive,
  ...p
}: {
  modeProps?: ModeProps;
  backdropCanvas?: HTMLCanvasElement | null;
  backdropActive?: boolean;
} & MeshProps) {
  return (
    <ModeWrapper
      glb="/assets/3d/cube.glb"
      geometryKey="Cube"
      followPointer
      modeProps={modeProps}
      backdropCanvas={backdropCanvas}
      backdropActive={backdropActive}
      {...p}
    />
  );
}

function Bar({
  modeProps = {},
  backdropCanvas,
  backdropActive,
  ...p
}: {
  modeProps?: ModeProps;
  backdropCanvas?: HTMLCanvasElement | null;
  backdropActive?: boolean;
} & MeshProps) {
  const defaultMat = {
    transmission: 1,
    roughness: 0,
    thickness: 10,
    ior: 1.15,
    color: '#ffffff',
    attenuationColor: '#ffffff',
    attenuationDistance: 0.25
  };

  return (
    <ModeWrapper
      glb="/assets/3d/bar.glb"
      geometryKey="Cube"
      lockToBottom
      followPointer={false}
      modeProps={{ ...defaultMat, ...modeProps }}
      backdropCanvas={backdropCanvas}
      backdropActive={backdropActive}
      {...p}
    />
  );
}

function NavItems({ items }: { items: NavItem[] }) {
  const group = useRef<THREE.Group>(null!);
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.2, fontSize: 0.035 },
    tablet: { max: 1023, spacing: 0.24, fontSize: 0.045 },
    desktop: { max: Infinity, spacing: 0.3, fontSize: 0.045 }
  };
  const getDevice = () => {
    const w = window.innerWidth;
    return w <= DEVICE.mobile.max ? 'mobile' : w <= DEVICE.tablet.max ? 'tablet' : 'desktop';
  };

  const [device, setDevice] = useState<keyof typeof DEVICE>(getDevice());

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { spacing, fontSize } = DEVICE[device];

  useFrame(() => {
    if (!group.current) return;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);

    group.current.children.forEach((child, i) => {
      child.position.x = (i - (items.length - 1) / 2) * spacing;
    });
  });

  const handleNavigate = (link: string) => {
    if (!link) return;
    if (link.startsWith('#')) {
      // eslint-disable-next-line react-hooks/immutability -- navigation utilisateur
      window.location.hash = link;
    } else {
      // eslint-disable-next-line react-hooks/immutability -- navigation utilisateur
      window.location.href = link;
    }
  };

  return (
    <group ref={group} renderOrder={10}>
      {items.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          renderOrder={10}
          onClick={e => {
            e.stopPropagation();
            handleNavigate(link);
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
          {label}
        </Text>
      ))}
    </group>
  );
}

