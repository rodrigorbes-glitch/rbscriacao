import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const productsDir = path.join(publicDir, 'products');
const modelsDir = path.join(publicDir, 'models');
const socialDir = path.join(publicDir, 'social');

fs.mkdirSync(productsDir, { recursive: true });
fs.mkdirSync(modelsDir, { recursive: true });
fs.mkdirSync(socialDir, { recursive: true });

// 1. Generate a valid Binary glTF 2.0 (.glb) 3D model (Vaso Geométrico / Prisma 3D RBS)
function createValidGlb() {
  // Simple 3D pyramid/prism mesh in float32 (positions + normals)
  const positions = new Float32Array([
    // Base square
    -0.5, 0.0, -0.5,
     0.5, 0.0, -0.5,
     0.5, 0.0,  0.5,
    -0.5, 0.0,  0.5,
    // Top rim Twist
    -0.35, 1.2, -0.35,
     0.35, 1.2, -0.35,
     0.35, 1.2,  0.35,
    -0.35, 1.2,  0.35,
  ]);

  const indices = new Uint16Array([
    // Sides
    0, 1, 5,  0, 5, 4,
    1, 2, 6,  1, 6, 5,
    2, 3, 7,  2, 7, 6,
    3, 0, 4,  3, 4, 7,
    // Bottom
    0, 3, 2,  0, 2, 1,
  ]);

  const posBytes = Buffer.from(positions.buffer);
  const idxBytes = Buffer.from(indices.buffer);
  // Pad idxBytes to 4-byte boundary
  const idxPad = (4 - (idxBytes.length % 4)) % 4;
  const binBuffer = Buffer.concat([posBytes, idxBytes, Buffer.alloc(idxPad)]);

  const gltf = {
    asset: { version: "2.0", generator: "RBS Criacao 3D Engine" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Peca_3D_RBS_Criacao" }],
    materials: [
      {
        name: "PLA_Seda_Terracota_RBS",
        pbrMetallicRoughness: {
          baseColorFactor: [0.88, 0.36, 0.16, 1.0],
          metallicFactor: 0.25,
          roughnessFactor: 0.35,
        },
        doubleSided: true,
      },
    ],
    meshes: [
      {
        name: "Vaso_Voronoi_RBS",
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0,
          },
        ],
      },
    ],
    buffers: [{ byteLength: binBuffer.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: posBytes.length, byteLength: idxBytes.length, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 8,
        type: "VEC3",
        min: [-0.5, 0.0, -0.5],
        max: [0.5, 1.2, 0.5],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5123,
        count: indices.length,
        type: "SCALAR",
      },
    ],
  };

  let jsonStr = JSON.stringify(gltf);
  while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) {
    jsonStr += ' ';
  }
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // 'glTF'
  header.writeUInt32LE(2, 4); // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4); // 'BIN\0'

  const glb = Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binBuffer]);
  fs.writeFileSync(path.join(modelsDir, 'vaso-voronoi-rbs.glb'), glb);
}

createValidGlb();

// 2. Generate studio-grade SVG product visuals (Main, Angle, Scale, Macro Layer Texture)
const productVisuals = [
  {
    slug: 'vaso-voronoi-organico',
    title: 'Vaso Voronoi Orgânico',
    material: 'PLA Seda Terracota • Camada 0.16mm',
    dims: '140 × 140 × 220 mm',
    accent1: '#EA580C',
    accent2: '#9A3412',
    bg: '#18181B',
    shape: 'vase',
  },
  {
    slug: 'luminaria-lua-litofania',
    title: 'Luminária Lua Litofania 3D',
    material: 'PLA Branco Difusor • Alta Definição',
    dims: '160 × 160 × 185 mm',
    accent1: '#F59E0B',
    accent2: '#B45309',
    bg: '#0F172A',
    shape: 'sphere',
  },
  {
    slug: 'suporte-headset-geometrico',
    title: 'Suporte Headset & Setup Low-Poly',
    material: 'PETG Carbon Tech • Estrutural',
    dims: '130 × 145 × 265 mm',
    accent1: '#38BDF8',
    accent2: '#0284C7',
    bg: '#090D16',
    shape: 'stand',
  },
  {
    slug: 'organizador-modular-gridfinity',
    title: 'Kit Organizador Modular de Mesa',
    material: 'PLA Fosco Grafite & Âmbar',
    dims: '240 × 160 × 65 mm',
    accent1: '#10B981',
    accent2: '#047857',
    bg: '#111827',
    shape: 'grid',
  },
  {
    slug: 'dragao-articulado-imperial',
    title: 'Dragão Articulado Print-in-Place',
    material: 'PLA Seda Dual-Color Cobre/Esmeralda',
    dims: '450 × 85 × 60 mm',
    accent1: '#A855F7',
    accent2: '#6B21A8',
    bg: '#13111C',
    shape: 'articulated',
  },
  {
    slug: 'chaveiro-nfc-corporativo-lote',
    title: 'Kit 50 Chaveiros 3D Relevos + NFC',
    material: 'PETG Dupla Cor • Personalizável',
    dims: '55 × 55 × 4.5 mm (un)',
    accent1: '#F97316',
    accent2: '#C2410C',
    bg: '#18181B',
    shape: 'badge',
  },
  {
    slug: 'escultura-busto-minimalista-resina',
    title: 'Escultura Minimalista Atelier 8K',
    material: 'Resina SLA Cinza Galeria • 0.05mm',
    dims: '110 × 110 × 210 mm',
    accent1: '#94A3B8',
    accent2: '#475569',
    bg: '#0F172A',
    shape: 'sculpture',
  },
  {
    slug: 'cachepot-autodrenante-costela-adao',
    title: 'Cachepot Autodrenante Geométrico',
    material: 'PETG Impermeável Verde Sálvia',
    dims: '165 × 165 × 150 mm',
    accent1: '#22C55E',
    accent2: '#15803D',
    bg: '#0C1912',
    shape: 'planter',
  },
];

for (const item of productVisuals) {
  // Main studio view
  const mainSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
    <defs>
      <radialGradient id="studioBg" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#27272A"/>
        <stop offset="100%" stop-color="${item.bg}"/>
      </radialGradient>
      <linearGradient id="partGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${item.accent1}"/>
        <stop offset="100%" stop-color="${item.accent2}"/>
      </linearGradient>
      <pattern id="layers" width="800" height="6" patternUnits="userSpaceOnUse">
        <line x1="0" y1="3" x2="800" y2="3" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="800" fill="url(#studioBg)"/>
    <ellipse cx="400" cy="640" rx="210" ry="38" fill="rgba(0,0,0,0.55)"/>
    <!-- 3D Printed Object Silhouette with Layer Texture -->
    <g transform="translate(400, 380)">
      <path d="M-110,-190 C-150,-80 -165,80 -120,220 L120,220 C165,80 150,-80 110,-190 Z" fill="url(#partGrad)" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
      <path d="M-110,-190 C-150,-80 -165,80 -120,220 L120,220 C165,80 150,-80 110,-190 Z" fill="url(#layers)"/>
      <ellipse cx="0" cy="-190" rx="110" ry="24" fill="${item.accent2}" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <!-- Geometric Voronoi Ribs -->
      <path d="M-85,-120 L0,-40 L85,-120 M-110,10 L0,95 L110,10 M0,-166 L0,220" stroke="rgba(255,255,255,0.25)" stroke-width="4" fill="none"/>
    </g>
    <!-- Studio Technical Badge -->
    <rect x="44" y="44" width="280" height="42" rx="21" fill="rgba(24,24,27,0.85)" stroke="rgba(255,255,255,0.15)"/>
    <text x="68" y="70" fill="#FAFAFA" font-family="system-ui, sans-serif" font-size="15" font-weight="600">RBS CRIAÇÃO • MANUFATURA 3D</text>
    <rect x="44" y="690" width="712" height="68" rx="16" fill="rgba(15,23,42,0.82)" stroke="rgba(255,255,255,0.12)"/>
    <text x="72" y="720" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="20" font-weight="700">${item.title}</text>
    <text x="72" y="744" fill="#94A3B8" font-family="monospace" font-size="14">${item.material}  |  Dimensões: ${item.dims}</text>
  </svg>`;

  // Macro layer detail view
  const macroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
    <defs>
      <linearGradient id="macroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${item.accent1}"/>
        <stop offset="100%" stop-color="${item.accent2}"/>
      </linearGradient>
      <pattern id="macroLayers" width="800" height="18" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="800" height="14" fill="url(#macroGrad)"/>
        <rect x="0" y="14" width="800" height="4" fill="rgba(0,0,0,0.35)"/>
        <line x1="0" y1="3" x2="800" y2="3" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
      </pattern>
    </defs>
    <rect width="800" height="800" fill="url(#macroLayers)"/>
    <circle cx="400" cy="400" r="310" fill="none" stroke="#FAFAFA" stroke-width="6" stroke-dasharray="14 10"/>
    <rect x="60" y="620" width="680" height="120" rx="18" fill="rgba(9,9,11,0.9)" stroke="rgba(255,255,255,0.2)"/>
    <text x="95" y="665" fill="#F97316" font-family="monospace" font-size="16" font-weight="700">INSPEÇÃO MACRO DE CAMADA FDM/SLA (ZOOM 8X)</text>
    <text x="95" y="695" fill="#FAFAFA" font-family="system-ui, sans-serif" font-size="18" font-weight="600">${item.title} — Textura Real de Filamento</text>
    <text x="95" y="720" fill="#A1A1AA" font-family="system-ui, sans-serif" font-size="14">Linhas uniformes calibradas por Input Shaping • Tolerância ±0,3 mm</text>
  </svg>`;

  // Scale reference view
  const scaleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
    <rect width="800" height="800" fill="#18181B"/>
    <!-- Technical Grid -->
    <g stroke="rgba(255,255,255,0.07)" stroke-width="1">
      <line x1="100" y1="0" x2="100" y2="800"/><line x1="200" y1="0" x2="200" y2="800"/><line x1="300" y1="0" x2="300" y2="800"/>
      <line x1="400" y1="0" x2="400" y2="800"/><line x1="500" y1="0" x2="500" y2="800"/><line x1="600" y1="0" x2="600" y2="800"/><line x1="700" y1="0" x2="700" y2="800"/>
      <line x1="0" y1="100" x2="800" y2="100"/><line x1="0" y1="200" x2="800" y2="200"/><line x1="0" y1="300" x2="800" y2="300"/>
      <line x1="0" y1="400" x2="800" y2="400"/><line x1="0" y1="500" x2="800" y2="500"/><line x1="0" y1="600" x2="800" y2="600"/>
    </g>
    <!-- Object silhouette -->
    <rect x="260" y="180" width="240" height="420" rx="28" fill="${item.accent1}" fill-opacity="0.85" stroke="#FAFAFA" stroke-width="3"/>
    <!-- Dimension arrows -->
    <line x1="540" y1="180" x2="540" y2="600" stroke="#F97316" stroke-width="3"/>
    <line x1="525" y1="180" x2="555" y2="180" stroke="#F97316" stroke-width="3"/>
    <line x1="525" y1="600" x2="555" y2="600" stroke="#F97316" stroke-width="3"/>
    <text x="565" y="395" fill="#F97316" font-family="monospace" font-size="18" font-weight="700">${item.dims}</text>
    <line x1="260" y1="640" x2="500" y2="640" stroke="#38BDF8" stroke-width="3"/>
    <text x="305" y="670" fill="#38BDF8" font-family="monospace" font-size="16" font-weight="700">Escala Real na Bancada</text>
    <text x="60" y="70" fill="#FAFAFA" font-family="monospace" font-size="18" font-weight="700">GABARITO DIMENSIONAL • ${item.title.toUpperCase()}</text>
  </svg>`;

  fs.writeFileSync(path.join(productsDir, `${item.slug}-1.svg`), mainSvg);
  fs.writeFileSync(path.join(productsDir, `${item.slug}-macro.svg`), macroSvg);
  fs.writeFileSync(path.join(productsDir, `${item.slug}-escala.svg`), scaleSvg);
}

console.log('Generated valid 3D GLB model and studio SVG product galleries.');
