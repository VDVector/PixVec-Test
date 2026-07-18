let fs = null, path = null, os = null; 
try { 
    if (typeof require !== 'undefined') { 
        fs = require('fs'); 
        path = require('path'); 
        os = require('os'); 
    } 
} catch(e) {}

function getAppDir() { 
    if (!os || !path || !fs) return ''; 
    const appDir = path.join(os.homedir(), 'PiXVec_Data'); 
    if (!fs.existsSync(appDir)) fs.mkdirSync(appDir); 
    return appDir; 
}

// Variables de estado global
let width = 64, height = 64, colorMode = 'RGB', currentTool = 'pencil', currentColor = '#000000', globalAlpha = 1.0, brushSize = 1;
let gridMode = 'none', undoStack = [], redoStack = []; 
const MAX_HISTORY = 30;
let activeEffectName = '';
let layers = [], activeLayerIndex = 0, layerCounter = 0, selectionMask = null, hasSelection = false;
let zoom = 1, panX = 0, panY = 0, isPanning = false, isDrawing = false, startX = 0, startY = 0, lastX = 0, lastY = 0;

let symOn = false, symDir = 'V', symX = 32, symY = 32, isDraggingSym = false, isRectSelecting = false, isLassoing = false, lassoPoints = [], dashOffset = 0;
let isTransforming = false, tfType = 'raster', tfCanvas = document.createElement('canvas'), tfX = 0, tfY = 0, tfW = 0, tfH = 0, tfAngle = 0;
let tfActiveHandle = null, tfStartX = 0, tfStartY = 0, tfInitX = 0, tfInitY = 0, tfInitW = 0, tfInitH = 0, tfInitAngle = 0, clipboardCanvas = null;

let pixelPerfectOn = false;
let isoAssistOn = false;
let strokeBackupCanvas = document.createElement('canvas');
let strokePoints = [];

let isLightingActive = false;
let lightingBaseData = null;
let lightingNormals = null;
let volumetricLights = [];
let activeLightRef = null;
let isLightDragging = false;

let effectBackupData = null; 
let tiledModeOn = false;

// Referencias a Canvases y Elementos DOM
const displayCanvas = document.getElementById('main-canvas');
const bgCanvas = document.getElementById('bg-canvas');
const selectionCanvas = document.getElementById('selection-canvas');
const previewCanvas = document.getElementById('preview-canvas');
const uiCanvas = document.getElementById('ui-canvas');

const displayCtx = displayCanvas.getContext('2d', { willReadFrequently: true });
const selectionCtx = selectionCanvas.getContext('2d');
const previewCtx = previewCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');

const wrapper = document.getElementById('canvas-wrapper');
const workspace = document.getElementById('workspace');

let palette = ['#000000','#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86'];
let selectedPaletteIndex = 0, installedPluginsList = [];

// Diccionario de Traducción Extendido (ES/EN)
const translations = {
    es: {
        title: "PiXVec - Editor Profesional de Pixel Art",
        symmetry: "Simetría",
        vertical: "Vertical",
        horizontal: "Horizontal",
        undo: "Deshacer (Ctrl + Z)",
        redo: "Rehacer (Ctrl + X)",
        new: "Nuevo",
        load: "Cargar .pixvec",
        export: "Exportar ▾",
        plugins: "Plugins ▾",
        effects: "Efectos ▾",
        saveNative: "Guardar (.pixvec)",
        exportPNG: "Exportar PNG...",
        exportJPG: "Exportar JPG...",
        importPlugin: "Importar Plugin (.js)",
        managePlugins: "Gestionar Plugins",
        autosave: "Autoguardado",
        grid: "Mostrar Rejilla (#)",
        zoomOut: "Alejar (-)",
        zoomIn: "Ampliar (+)",
        fullscreen: "Pantalla Completa",
        cancel: "Cancelar",
        apply: "Aplicar",
        transform: "Transformar",
        size: "Tamaño",
        pixelPerfect: "PixelPerfect",
        colorTexture: "Color y Textura",
        basic: "Básico",
        advanced: "Avanzado",
        opacity: "Opacidad",
        replaceColor: "Reemplazar Color",
        harmony: "Armonía Cromática",
        dither: "Tramado (Dither)",
        gradientMode: "Modo Degradado",
        layers: "Capas",
        blend: "Fusión",
        normal: "Normal",
        multiply: "Multiplicar",
        screen: "Trama",
        overlay: "Superponer",
        newLayer: "Nueva Capa",
        duplicate: "Duplicar",
        mergeDown: "Unir Abajo",
        delete: "Eliminar",
        effectsTitle: "Acabados",
        effectsGeo: "Geometría y Luces",
        effectsList: {
            mirror: "Espejo...",
            outline: "Delineado Automático...",
            dither: "Dithering Retro...",
            rotate: "Rotar...",
            brightness: "Potenciar Brillo...",
            cleanOrphans: "Limpiar Huérfanos...",
            shadow: "Sombra Proyectada...",
            noise: "Ruido Analógico...",
            simplify: "Simplificar Colores...",
            glitch: "Desplazamiento Glitch...",
            vol3d: "Volumen 3D Dinámico...",
            volLight: "Iluminación Volumétrica..."
        },
        modals: {
            newCanvas: "Nuevo Lienzo",
            width: "Ancho (px)",
            height: "Alto (px)",
            colorSpace: "Espacio de Color",
            create: "Crear",
            exportImg: "Exportar Imagen",
            scalePixels: "Escalar Píxeles",
            pluginManager: "Gestor de Plugins",
            restartWarning: "Reinicio requerido.",
            close: "Cerrar",
            volumeSettings: "Ajustes de Volumen 3D",
            depth: "Profundidad",
            intensity: "Intensidad",
            volLightTitle: "Iluminación Volumétrica",
            addWarmSpot: "+ Foco Cálido",
            addDirectional: "+ Direccional",
            addNeonLight: "+ Luz Neón",
            elevation: "Elevación (Z)",
            fixLights: "Fijar Luces",
            clear: "Limpiar",
            layerHidden: "La capa actual está oculta."
        },
        effectParams: {
            axis: "Eje",
            horizontal: "Horizontal",
            vertical: "Vertical",
            color: "Color",
            thickness: "Grosor (px)",
            intensity: "Intensidad",
            angle: "Ángulo",
            amount: "Cantidad de Brillo",
            neighbors: "Vecinos mínimos",
            opacity: "Opacidad",
            colors: "Nivel de Simplificación"
        },
        tools: {
            pencil: "Lápiz (P)",
            eraser: "Borrador (E)",
            line: "Línea Recta (L)",
            rect: "Rectángulo (U)",
            circle: "Círculo (C)",
            bucket: "Cubo de Relleno (B o F)",
            picker: "Gotero / Seleccionar Color (I)",
            magic: "Selección Inteligente (W)",
            rectSelect: "Selección Cuadrada",
            lassoSelect: "Selección Lazo",
            gradient: "Degradado (G)",
            hand: "Mano / Mover (Mantener Espacio)"
        },
        pestañas: {
            color: "Pintura",
            layers: "Capas",
            tools: "Pro Tools"
        }
    },
    en: {
        title: "PiXVec - Professional Pixel Art Editor",
        symmetry: "Symmetry",
        vertical: "Vertical",
        horizontal: "Horizontal",
        undo: "Undo (Ctrl + Z)",
        redo: "Redo (Ctrl + X)",
        new: "New",
        load: "Load .pixvec",
        export: "Export ▾",
        plugins: "Plugins ▾",
        effects: "Effects ▾",
        saveNative: "Save (.pixvec)",
        exportPNG: "Export PNG...",
        exportJPG: "Export JPG...",
        importPlugin: "Import Plugin (.js)",
        managePlugins: "Manage Plugins",
        autosave: "Autosave",
        grid: "Show Grid (#)",
        zoomOut: "Zoom Out (-)",
        zoomIn: "Zoom In (+)",
        fullscreen: "Fullscreen",
        cancel: "Cancel",
        apply: "Apply",
        transform: "Transform",
        size: "Size",
        pixelPerfect: "PixelPerfect",
        colorTexture: "Color & Texture",
        basic: "Basic",
        advanced: "Advanced",
        opacity: "Opacity",
        replaceColor: "Replace Color",
        harmony: "Color Harmony",
        dither: "Dithering Pattern",
        gradientMode: "Gradient Mode",
        layers: "Layers",
        blend: "Blend",
        normal: "Normal",
        multiply: "Multiply",
        screen: "Screen",
        overlay: "Overlay",
        newLayer: "New Layer",
        duplicate: "Duplicate",
        mergeDown: "Merge Down",
        delete: "Delete",
        effectsTitle: "Post-Processing",
        effectsGeo: "Geometry & Lights",
        effectsList: {
            mirror: "Mirror...",
            outline: "Automatic Outline...",
            dither: "Retro Dithering...",
            rotate: "Rotate...",
            brightness: "Boost Brightness...",
            cleanOrphans: "Clean Orphans...",
            shadow: "Drop Shadow...",
            noise: "Analog Noise...",
            simplify: "Simplify Colors...",
            glitch: "Glitch Shift...",
            vol3d: "Dynamic 3D Volume...",
            volLight: "Volumetric Lighting..."
        },
        modals: {
            newCanvas: "New Canvas",
            width: "Width (px)",
            height: "Height (px)",
            colorSpace: "Color Space",
            create: "Create",
            exportImg: "Export Image",
            scalePixels: "Scale Pixels",
            pluginManager: "Plugin Manager",
            restartWarning: "Restart required.",
            close: "Close",
            volumeSettings: "3D Volume Settings",
            depth: "Depth",
            intensity: "Intensity",
            volLightTitle: "Volumetric Lighting",
            addWarmSpot: "+ Warm Spot",
            addDirectional: "+ Directional",
            addNeonLight: "+ Neon Light",
            elevation: "Elevation (Z)",
            fixLights: "Fix Lights",
            clear: "Clear",
            layerHidden: "The current layer is hidden."
        },
        effectParams: {
            axis: "Axis",
            horizontal: "Horizontal",
            vertical: "Vertical",
            color: "Color",
            thickness: "Thickness (px)",
            intensity: "Intensity",
            angle: "Angle",
            amount: "Brightness Amount",
            neighbors: "Min Neighbors",
            opacity: "Opacity",
            colors: "Simplification Step"
        },
        tools: {
            pencil: "Pencil (P)",
            eraser: "Eraser (E)",
            line: "Straight Line (L)",
            rect: "Rectangle (U)",
            circle: "Circle (C)",
            bucket: "Paint Bucket (B or F)",
            picker: "Color Picker (I)",
            magic: "Magic Wand (W)",
            rectSelect: "Marquee Selection",
            lassoSelect: "Lasso Selection",
            gradient: "Gradient (G)",
            hand: "Hand / Pan (Hold Space)"
        },
        pestañas: {
            color: "Painting",
            layers: "Layers",
            tools: "Pro Tools"
        }
    }
};

let currentLanguage = 'es';

function toggleLanguage() {
    currentLanguage = (currentLanguage === 'es') ? 'en' : 'es';
    document.getElementById('btn-lang').innerText = currentLanguage.toUpperCase();
    applyLanguage();
}

function applyLanguage() {
    const tr = translations[currentLanguage];
    document.title = tr.title;
    
    document.getElementById('tab-color').innerText = tr.pestañas.color;
    document.getElementById('tab-layers').innerText = tr.pestañas.layers;
    document.getElementById('tab-tools').innerText = tr.pestañas.tools;

    document.getElementById('btn-sym').title = tr.symmetry;
    document.getElementById('btn-undo').title = tr.undo;
    document.getElementById('btn-redo').title = tr.redo;
    document.getElementById('btn-grid').title = tr.grid;
    
    document.getElementById('btn-new').innerText = tr.new;
    document.getElementById('btn-load').innerText = tr.load;
    document.getElementById('btn-export-trigger').innerText = tr.export;
    document.getElementById('btn-plugins-trigger').innerText = tr.plugins;
    document.getElementById('btn-effects-trigger').innerText = tr.effects;
    
    document.getElementById('btn-save-native').innerText = tr.saveNative;
    document.getElementById('btn-export-png').innerText = tr.exportPNG;
    document.getElementById('btn-export-jpg').innerText = tr.exportJPG;
    document.getElementById('btn-import-plugin').innerText = tr.importPlugin;
    document.getElementById('btn-manage-plugins').innerText = tr.managePlugins;
    
    document.getElementById('btn-sym-v').innerText = tr.vertical;
    document.getElementById('btn-sym-h').innerText = tr.horizontal;
    document.getElementById('btn-sym-off').innerText = currentLanguage === 'es' ? 'Desactivar' : 'Disable';
    
    document.getElementById('label-eff-acabados').innerText = tr.effectsTitle;
    document.getElementById('btn-eff-mirror').innerText = tr.effectsList.mirror;
    document.getElementById('btn-eff-outline').innerText = tr.effectsList.outline;
    document.getElementById('btn-eff-retro').innerText = tr.effectsList.dither;
    document.getElementById('btn-eff-rotate').innerText = tr.effectsList.rotate;
    document.getElementById('btn-eff-brightness').innerText = tr.effectsList.brightness;
    document.getElementById('btn-eff-orphans').innerText = tr.effectsList.cleanOrphans;
    document.getElementById('btn-eff-shadow').innerText = tr.effectsList.shadow;
    document.getElementById('btn-eff-noise').innerText = tr.effectsList.noise;
    document.getElementById('btn-eff-simplify').innerText = tr.effectsList.simplify;
    document.getElementById('btn-eff-glitch').innerText = tr.effectsList.glitch;
    
    document.getElementById('label-eff-geometria').innerText = tr.effectsGeo;
    document.getElementById('btn-eff-vol3d').innerText = tr.effectsList.vol3d;
    document.getElementById('btn-eff-light').innerText = tr.effectsList.volLight;
    
    document.getElementById('btn-color-basic').innerText = tr.basic;
    document.getElementById('btn-color-adv').innerText = tr.advanced;
    document.getElementById('label-opacity').innerText = tr.opacity;
    document.getElementById('btn-replace-color').innerText = tr.replaceColor;
    document.getElementById('label-harmony').innerText = tr.harmony;
    document.getElementById('label-dither').innerText = tr.dither;
    document.getElementById('label-gradient-mode').innerText = tr.gradientMode;
    
    document.getElementById('label-layers').innerText = tr.layers;
    document.getElementById('label-blend').innerText = tr.blend;
    document.getElementById('label-opac').innerText = tr.opacity;
    
    document.getElementById('label-size').innerText = tr.size;
    updatePixelPerfectButtonLabel();
    updateIsoAssistButtonLabel();
    
    document.getElementById('label-autosave').innerText = tr.autosave;
    
    document.getElementById('btn-cancel-sel').innerText = tr.cancel;
    document.getElementById('btn-modify-sel').innerText = tr.transform;
    document.getElementById('btn-commit-tf').innerText = tr.apply;
    
    document.getElementById('modal-title-new').innerText = tr.modals.newCanvas;
    document.getElementById('modal-label-width').innerText = tr.modals.width;
    document.getElementById('modal-label-height').innerText = tr.modals.height;
    document.getElementById('modal-label-colorspace').innerText = tr.modals.colorSpace;
    document.getElementById('modal-btn-cancel-new').innerText = tr.cancel;
    document.getElementById('modal-btn-create-new').innerText = tr.modals.create;
    
    document.getElementById('modal-title-export').innerText = tr.modals.exportImg;
    document.getElementById('modal-label-scale').innerText = tr.modals.scalePixels;
    document.getElementById('modal-btn-cancel-exp').innerText = tr.cancel;
    document.getElementById('modal-btn-confirm-exp').innerText = tr.apply;
    
    document.getElementById('modal-title-plugins').innerText = tr.modals.pluginManager;
    document.getElementById('plugin-restart-warning').innerText = tr.modals.restartWarning;
    document.getElementById('modal-btn-close-plugins').innerText = tr.modals.close;
    
    document.getElementById('modal-title-vol3d').innerText = tr.modals.volumeSettings;
    document.getElementById('modal-label-depth').innerText = tr.modals.depth;
    document.getElementById('modal-label-intensity-vol3d').innerText = tr.modals.intensity;
    document.getElementById('modal-btn-cancel-vol3d').innerText = tr.cancel;
    document.getElementById('modal-btn-apply-vol3d').innerText = tr.apply;
    
    document.getElementById('modal-title-lights').innerText = tr.modals.volLightTitle;
    document.getElementById('modal-btn-warmspot').innerText = tr.modals.addWarmSpot;
    document.getElementById('modal-btn-directional').innerText = tr.modals.addDirectional;
    document.getElementById('modal-btn-neon').innerText = tr.modals.addNeonLight;
    document.getElementById('modal-label-intensity-lights').innerText = tr.modals.intensity;
    document.getElementById('modal-label-elevation-lights').innerText = tr.modals.elevation;
    document.getElementById('modal-btn-fix-lights').innerText = tr.modals.fixLights;
    document.getElementById('modal-btn-clear-lights').innerText = tr.modals.clear;
    
    document.getElementById('btn-effect-cancel').innerText = tr.cancel;
    document.getElementById('btn-effect-apply').innerText = tr.apply;

    document.getElementById('label-title-shading').innerText = currentLanguage === 'es' ? "Pincel Sombreador" : "Shading Brush";
    document.getElementById('label-desc-shading').innerText = currentLanguage === 'es' ? "Pinta directamente brillos (+) o sombras (-)." : "Paint highlights (+) or shadows (-) directly.";
    document.getElementById('label-title-ref').innerText = currentLanguage === 'es' ? "Imagen de Referencia" : "Reference Image";

    document.querySelectorAll('.tool-btn').forEach(btn => {
        const t = btn.dataset.tool;
        if (t && tr.tools[t]) btn.title = tr.tools[t];
    });
    updateStatusTool();
}

function switchRightTab(tabName) {
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    
    document.getElementById('panel-color').classList.add('hidden');
    document.getElementById('panel-layers').classList.add('hidden');
    document.getElementById('panel-tools').classList.add('hidden');
    
    document.getElementById('panel-' + tabName).classList.remove('hidden');
}

function updateStatusTool() {
    const tr = translations[currentLanguage];
    const statusTool = document.getElementById('status-tool');
    if (statusTool && tr.tools[currentTool]) {
        statusTool.innerText = tr.tools[currentTool];
    }
}

function toggleDropdown(event, id) {
    event.stopPropagation();
    const el = document.getElementById(id);
    const isAlreadyOpen = !el.classList.contains('hidden');
    closeAllDropdowns();
    if (!isAlreadyOpen) {
        el.classList.remove('hidden');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(el => {
        el.classList.add('hidden');
    });
}

window.addEventListener('click', () => { closeAllDropdowns(); });

document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.addEventListener('click', (e) => { e.stopPropagation(); });
});

function resizeUI() { uiCanvas.width=workspace.clientWidth; uiCanvas.height=workspace.clientHeight; } window.addEventListener('resize', resizeUI);
function loadPluginConfig() { if(!fs||!path||!os) return {}; try { const p=path.join(getAppDir(), 'plugins.json'); if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }catch(e){} return {}; }
function savePluginConfig(config) { if(!fs||!path||!os) return; try { fs.writeFileSync(path.join(getAppDir(), 'plugins.json'), JSON.stringify(config)); }catch(e){} }

function initPlugins() { window.PiXVecAPI={ addToolButton:(h)=>document.getElementById('tools-container').insertAdjacentHTML('beforeend', h), getLayers:()=>layers, getActiveLayer:()=>layers[activeLayerIndex], renderComposite:renderComposite, getDimensions:()=>({width, height}), showMessage:showMessage, drawPoint:(x,y,c,s,e)=>{if(layers[activeLayerIndex])drawPoint(layers[activeLayerIndex].ctx,x,y,c,s,e,false);}, drawLine:(x0,y0,x1,y1,c,s,e)=>{if(layers[activeLayerIndex])drawLine(layers[activeLayerIndex].ctx,x0,y0,x1,y1,c,s,e,false);}, drawRectOutline:(x0,y0,x1,y1,c,s,e)=>{if(layers[activeLayerIndex])drawRectOutline(layers[activeLayerIndex].ctx,x0,y0,x1,y1,c,s,e,false);}, drawCircle:(xc,yc,r,c,s,e)=>{if(layers[activeLayerIndex])drawCircle(layers[activeLayerIndex].ctx,xc,yc,r,c,s,e,false);}, getSymmetry:()=>({isOn:symOn,dir:symDir,x:symX,y:symY}) }; installedPluginsList=[]; let config=loadPluginConfig(); if(fs&&path&&os){ try { const dir=path.join(getAppDir(), 'plugins'); if(!fs.existsSync(dir)) fs.mkdirSync(dir); fs.readdirSync(dir).forEach(file=>{ if(file.endsWith('.js')){ const isActive=config[file]!==false; installedPluginsList.push({filename:file, active:isActive}); if(isActive) try { require(path.join(dir, file)); }catch(e){} } }); }catch(err){} } }
function openPluginManager() { renderPluginList(); document.getElementById('modal-plugins').classList.remove('hidden'); }
function renderPluginList() { const c=document.getElementById('plugins-list-container'); c.innerHTML=''; if(installedPluginsList.length===0) return; installedPluginsList.forEach((p, i)=>{ const d=document.createElement('div'); d.className='flex justify-between items-center bg-black p-3 rounded-lg border border-zinc-700 mb-2'; const t=document.createElement('button'); t.innerText=p.active?'ACTIVO':'INACTIVO'; t.className=`text-[10px] px-2 py-1 rounded font-bold w-20 ${p.active?'bg-green-600 text-white':'bg-zinc-700 text-zinc-350'}`; t.onclick=()=>togglePlugin(i); const n=document.createElement('span'); n.innerText=p.filename; n.className='text-sm font-mono text-zinc-200 flex-1 mx-3 truncate'; const x=document.createElement('button'); x.innerHTML='X'; x.className='text-zinc-500 hover:text-red-500 p-1 bg-zinc-800 rounded font-bold px-3'; x.onclick=()=>requestDeletePlugin(i); d.appendChild(t); d.appendChild(n); d.appendChild(x); c.appendChild(d); }); }
function togglePlugin(i) { installedPluginsList[i].active=!installedPluginsList[i].active; let config=loadPluginConfig(); config[installedPluginsList[i].filename]=installedPluginsList[i].active; savePluginConfig(config); renderPluginList(); document.getElementById('plugin-restart-warning').classList.remove('hidden'); }
let pluginToDeleteIndex=-1; function requestDeletePlugin(i) { pluginToDeleteIndex=i; document.getElementById('confirm-text').innerText=`Eliminar plugin ${installedPluginsList[i].filename}?`; document.getElementById('confirm-btn-yes').onclick=executeDeletePlugin; document.getElementById('modal-confirm').classList.remove('hidden'); }
function executeDeletePlugin() { closeModal('modal-confirm'); if(pluginToDeleteIndex>-1 && fs && path && os){ const fn=installedPluginsList[pluginToDeleteIndex].filename; try { const fp=path.join(getAppDir(), 'plugins', fn); if(fs.existsSync(fp)) fs.unlinkSync(fp); let cfg=loadPluginConfig(); delete cfg[fn]; savePluginConfig(cfg); installedPluginsList.splice(pluginToDeleteIndex, 1); renderPluginList(); document.getElementById('plugin-restart-warning').classList.remove('hidden'); }catch(e){} } }

function toggleColorMode(mode) {
    const btnBasic = document.getElementById('btn-color-basic');
    const btnAdv = document.getElementById('btn-color-adv');
    const advOpts = document.getElementById('advanced-color-options');
    
    if (mode === 'basic') {
        btnBasic.className = 'flex-1 text-[9px] uppercase font-bold py-1.5 rounded-lg bg-zinc-800 text-white shadow transition-all';
        btnAdv.className = 'flex-1 text-[9px] uppercase font-bold py-1.5 rounded-lg text-zinc-500 hover:text-white transition-all';
        advOpts.classList.add('hidden');
        advOpts.classList.remove('flex');
    } else {
        btnBasic.className = 'flex-1 text-[9px] uppercase font-bold py-1.5 rounded-lg text-zinc-500 hover:text-white transition-all';
        btnAdv.className = 'flex-1 text-[9px] uppercase font-bold py-1.5 rounded-lg bg-zinc-800 text-white shadow transition-all';
        advOpts.classList.remove('hidden');
        advOpts.classList.add('flex');
    }
}

function init() { 
    resizeUI(); 
    renderPalette(); 
    initPlugins(); 
    startAutoSave(); 
    generateHarmony(); 
    makeElementDraggable(document.getElementById('effect-settings-content'), document.getElementById('effect-settings-title'));
    makeElementDraggable(document.getElementById('native-vol-content'), document.getElementById('modal-title-vol3d'));
    makeElementDraggable(document.getElementById('native-light-content'), document.getElementById('modal-title-lights'));
    
    // Listeners del nuevo Tinte de Capas
    document.getElementById('layer-tint-color')?.addEventListener('input', (e) => {
        if (layers[activeLayerIndex]) {
            layers[activeLayerIndex].tintColor = e.target.value;
            renderComposite();
        }
    });
    document.getElementById('layer-tint-factor')?.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        document.getElementById('layer-tint-factor-display').innerText = Math.round(val * 100) + '%';
        if (layers[activeLayerIndex]) {
            layers[activeLayerIndex].tintFactor = val;
            renderComposite();
        }
    });

    workspace.focus(); 
    requestAnimationFrame(animLoop); 
}

function animLoop() { 
    dashOffset++; 
    if(uiCanvas.width!==workspace.clientWidth || uiCanvas.height!==workspace.clientHeight) { 
        uiCanvas.width=workspace.clientWidth; 
        uiCanvas.height=workspace.clientHeight; 
    } 
    drawOverlays(); 
    requestAnimationFrame(animLoop); 
}

function setSymmetryMode(dir) { 
    if (dir === 'off') {
        symOn = false;
        document.getElementById('btn-sym').classList.remove('text-blue-400');
    } else {
        symOn = true;
        symDir = dir;
        document.getElementById('btn-sym').classList.add('text-blue-400');
    }
    closeAllDropdowns();
}

function getBoundsMask(w, h, data) { let minX=w, minY=h, maxX=-1, maxY=-1; for(let y=0; y<h; y++) for(let x=0; x<w; x++) if(data[y*w+x]){ if(x<minX) minX=x; if(x>maxX) maxX=x; if(y<minY) minY=y; if(y>maxY) maxY=y; } if(maxX<0) return null; return {x:minX, y:minY, w:maxX-minX+1, h:maxY-minY+1}; }

function initTransform(tempCanvas, extractFromMask=false, shapeType='raster') {
    if(extractFromMask && selectionMask) {
        let b=getBoundsMask(width, height, selectionMask); if(!b) return;
        tfCanvas.width=b.w; tfCanvas.height=b.h; let tCtx=tfCanvas.getContext('2d'), actCtx=layers[activeLayerIndex].ctx; tCtx.imageSmoothingEnabled=false;
        let sData=actCtx.getImageData(b.x, b.y, b.w, b.h), tData=tCtx.createImageData(b.w, b.h);
        for(let y=0; y<b.h; y++){ for(let x=0; x<b.w; x++){ if(selectionMask[((b.y+y)*width+(b.x+x))]) { let idx=(y*b.w+x)*4; tData.data[idx]=sData.data[idx]; tData.data[idx+1]=sData.data[idx+1]; tData.data[idx+2]=sData.data[idx+2]; tData.data[idx+3]=sData.data[idx+3]; sData.data[idx+3]=0; } } }
        tCtx.putImageData(tData, 0, 0); actCtx.putImageData(sData, b.x, b.y); tfX=b.x; tfY=b.y; tfW=b.w; tfH=b.h; tfType='raster'; selectionCtx.clearRect(0,0,width,height); renderComposite();
    } else {
        let d=tempCanvas.getContext('2d').getImageData(0,0,width,height).data, m=new Uint8Array(width*height); for(let i=0; i<width*height; i++) m[i]=d[i*4+3]>0?1:0;
        let b=getBoundsMask(width, height, m); if(!b) return;
        tfCanvas.width=b.w; tfCanvas.height=b.h; tfCanvas.getContext('2d').imageSmoothingEnabled=false; tfCanvas.getContext('2d').drawImage(tempCanvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        tfX=b.x; tfY=b.y; tfW=b.w; tfH=b.h; tfType=shapeType;
    }
    tfAngle=0; isTransforming=true; document.getElementById('btn-modify-sel').classList.add('hidden'); document.getElementById('btn-commit-tf').classList.remove('hidden'); document.getElementById('selection-toolbar').classList.remove('hidden');
}

function customDrawImage(ctx, srcCanvas, cx, cy, w, h, angle, alpha) {
    if(Math.abs(w)<0.1||Math.abs(h)<0.1) return; let sw=srcCanvas.width, swsh=srcCanvas.height, srcCtx=srcCanvas.getContext('2d'), srcData=srcCtx.getImageData(0,0,sw,swsh).data, c=Math.cos(angle), s=Math.sin(angle), hw=w/2, hh=h/2;
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    let corners = [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]];
    corners.forEach(pt => { let rx=pt[0]*c-pt[1]*s+cx, ry=pt[0]*s+pt[1]*c+cy; if(rx<minX) minX=rx; if(rx>maxX) maxX=rx; if(ry<minY) minY=ry; if(ry>maxY) maxY=ry; });
    minX=Math.max(0,Math.floor(minX)); maxX=Math.min(width-1,Math.ceil(maxX)); minY=Math.max(0,Math.floor(minY)); maxY=Math.min(height-1,Math.ceil(maxY));
    for(let y=minY; y<=maxY; y++){
        for(let x=minX; x<=maxX; x++){
            let tx=x-cx+0.5, ty=y-cy+0.5, rx=tx*c+ty*s, ry=-tx*s+ty*c, u=(rx+hw)/w, v=(ry+hh)/h, sx=Math.floor(u*sw), sy=Math.floor(v*swsh);
            if(sx>=0 && sx<sw && sy>=0 && sy<swsh){ let idx=(sy*sw+sx)*4, a=srcData[idx+3]; if(a>0){ ctx.fillStyle=`rgba(${srcData[idx]},${srcData[idx+1]},${srcData[idx+2]},${(a/255)*alpha})`; ctx.fillRect(x,y,1,1); } }
        }
    }
}

function commitTransform() {
    if(!isTransforming) return; saveState(); let ctx=layers[activeLayerIndex].ctx; ctx.save();
    let absW = Math.abs(tfW), absH = Math.abs(tfH);
    if(absW < 0.1) tfW = tfW < 0 ? -0.1 : 0.1;
    if(absH < 0.1) tfH = tfH < 0 ? -0.1 : 0.1;
    if(tfType==='raster') { customDrawImage(ctx, tfCanvas, tfX+tfW/2, tfY+tfH/2, tfW, tfH, tfAngle, 1.0); } 
    ctx.restore(); isTransforming=false; document.getElementById('btn-commit-tf').classList.add('hidden'); if(!hasSelection) document.getElementById('selection-toolbar').classList.add('hidden'); renderComposite(); updateActiveLayerPreview();
}

function transformHitTest(rawX, rawY) {
    let cx = tfX+tfW/2, cy = tfY+tfH/2, c = Math.cos(-tfAngle), s = Math.sin(-tfAngle);
    let lx = c*(rawX-cx) - s*(rawY-cy) + cx, ly = s*(rawX-cx) + c*(rawY-cy) + cy;
    let hs = 14/zoom, hw = Math.abs(tfW)/2, hh = Math.abs(tfH)/2;
    if(Math.abs(lx-(cx-hw))<hs && Math.abs(ly-(cy-hh))<hs) return 'tl';
    if(Math.abs(lx-(cx+hw))<hs && Math.abs(ly-(cy-hh))<hs) return 'tr';
    if(Math.abs(lx-(cx-hw))<hs && Math.abs(ly-(cy+hh))<hs) return 'bl';
    if(Math.abs(lx-(cx+hw))<hs && Math.abs(ly-(cy+hh))<hs) return 'br';
    if(Math.abs(lx-cx)<hs && Math.abs(ly-(cy-hh))<hs) return 'tc';
    if(Math.abs(lx-cx)<hs && Math.abs(ly-(cy+hh))<hs) return 'bc';
    if(Math.abs(lx-(cx-hw))<hs && Math.abs(ly-cy)<hs) return 'ml';
    if(Math.abs(lx-(cx+hw))<hs && Math.abs(ly-cy)<hs) return 'mr';
    if(Math.abs(lx-cx)<hs && Math.abs(ly-(cy-hh-25/zoom))<hs) return 'rot';
    if(lx>=cx-hw && lx<=cx+hw && ly>=cy-hh && ly<=cy+hh) return 'move';
    return null;
}

// Lógica Isométrica Auxiliar
function snapToIsometric(x0, y0, x1, y1) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    if (dx === 0 && dy === 0) return { x: x1, y: y1 };
    
    let angle = Math.atan2(dy, dx);
    let targets = [
        0,
        26.565 * Math.PI / 180,  // Proporción 2:1 derecha-abajo
        90 * Math.PI / 180,
        153.435 * Math.PI / 180, // Proporción 2:1 izquierda-abajo
        Math.PI,
        -153.435 * Math.PI / 180,// Proporción 2:1 izquierda-arriba
        -90 * Math.PI / 180,
        -26.565 * Math.PI / 180  // Proporción 2:1 derecha-arriba
    ];
    
    let bestAngle = targets[0];
    let minDist = Math.abs(angle - targets[0]);
    for (let i = 1; i < targets.length; i++) {
        let diff = Math.abs(angle - targets[i]);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < minDist) {
            minDist = diff;
            bestAngle = targets[i];
        }
    }
    
    let length = Math.hypot(dx, dy);
    let snappedX = x0 + Math.round(Math.cos(bestAngle) * length);
    let snappedY = y0 + Math.round(Math.sin(bestAngle) * length);
    return { x: snappedX, y: snappedY };
}

function drawOverlays() {
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height); 
    previewCtx.clearRect(0, 0, width, height); 
    uiCtx.save(); 
    uiCtx.translate(panX, panY); 
    uiCtx.scale(zoom, zoom);

    if (tiledModeOn) {
        uiCtx.save();
        uiCtx.globalAlpha = 0.45;
        for (let tx = -1; tx <= 1; tx++) {
            for (let ty = -1; ty <= 1; ty++) {
                if (tx === 0 && ty === 0) continue;
                uiCtx.drawImage(displayCanvas, tx * width, ty * height);
            }
        }
        uiCtx.restore();
    }

    if (gridMode !== 'none') {
        uiCtx.save();
        uiCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        uiCtx.lineWidth = 0.5 / zoom;
        if (gridMode === 'square') {
            uiCtx.beginPath();
            for (let x = 0; x <= width; x++) {
                uiCtx.moveTo(x, 0); uiCtx.lineTo(x, height);
            }
            for (let y = 0; y <= height; y++) {
                uiCtx.moveTo(0, y); uiCtx.lineTo(width, y);
            }
            uiCtx.stroke();
        } else if (gridMode === 'isometric') {
            uiCtx.beginPath();
            let cellW = 8;
            for (let x = -height * 2; x < width; x += cellW) {
                uiCtx.moveTo(x, 0); uiCtx.lineTo(x + height * 2, height);
            }
            for (let x = -height * 2; x < width; x += cellW) {
                uiCtx.moveTo(x, height); uiCtx.lineTo(x + height * 2, 0);
            }
            uiCtx.stroke();
        }
        uiCtx.restore();
    }

    // Renderizador de Guías de Perspectiva Pro (Novedad Pro Tools 1)
    let perspectiveOn = document.getElementById('chk-perspective-guides')?.checked;
    if (perspectiveOn) {
        let vx = parseFloat(document.getElementById('perspective-vx').value) || width / 2;
        let vy = parseFloat(document.getElementById('perspective-vy').value) || height / 2;
        let density = parseInt(document.getElementById('perspective-density').value) || 12;
        
        uiCtx.save();
        uiCtx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
        uiCtx.lineWidth = 0.5 / zoom;
        
        let steps = density * 2;
        for (let i = 0; i < steps; i++) {
            let angle = (i * Math.PI) / density;
            let len = Math.max(width, height) * 4;
            let targetX = vx + Math.cos(angle) * len;
            let targetY = vy + Math.sin(angle) * len;
            uiCtx.beginPath();
            uiCtx.moveTo(vx, vy);
            uiCtx.lineTo(targetX, targetY);
            uiCtx.stroke();
        }
        uiCtx.strokeStyle = '#3b82f6';
        uiCtx.beginPath();
        uiCtx.arc(vx, vy, 3 / zoom, 0, Math.PI * 2);
        uiCtx.stroke();
        uiCtx.restore();
    }

    let dMA=(d)=>{ uiCtx.save(); uiCtx.lineWidth=1/zoom; uiCtx.setLineDash([5/zoom, 5/zoom]); uiCtx.lineDashOffset=-dashOffset/(zoom/1.5); uiCtx.strokeStyle='#ffffff'; d(); uiCtx.lineDashOffset=-(dashOffset/(zoom/1.5))+(5/zoom); uiCtx.strokeStyle='#000000'; d(); uiCtx.restore(); };
    if(symOn) { uiCtx.strokeStyle='#3b82f6'; uiCtx.lineWidth=1/zoom; uiCtx.beginPath(); if(symDir==='V'){ uiCtx.moveTo(symX, 0); uiCtx.lineTo(symX, height); } else { uiCtx.moveTo(0, symY); uiCtx.lineTo(width, symY); } uiCtx.stroke(); }
    if(isRectSelecting) { let rx=Math.min(startX, lastX), ry=Math.min(startY, lastY), rw=Math.abs(startX-lastX), rh=Math.abs(startY-lastY); dMA(()=>uiCtx.strokeRect(rx, ry, rw, rh)); }
    if(isLassoing && lassoPoints.length>0) { dMA(()=>{ uiCtx.beginPath(); uiCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y); for(let i=1; i<lassoPoints.length; i++) uiCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y); uiCtx.stroke(); }); }
    if(hasSelection && selectionMask && !isTransforming) { dMA(() => { uiCtx.beginPath(); for(let y=0; y<height; y++){ for(let x=0; x<width; x++){ if(selectionMask[y*width+x]) { if(x===0 || !selectionMask[y*width+(x-1)]) { uiCtx.moveTo(x,y); uiCtx.lineTo(x,y+1); } if(x===width-1 || !selectionMask[y*width+(x+1)]) { uiCtx.moveTo(x+1,y); uiCtx.lineTo(x+1,y+1); } if(y===0 || !selectionMask[(y-1)*width+x]) { uiCtx.moveTo(x,y); uiCtx.lineTo(x+1,y); } if(y===height-1 || !selectionMask[(y+1)*width+x]) { uiCtx.moveTo(x,y+1); uiCtx.lineTo(x+1,y+1); } } } } uiCtx.stroke(); }); }
    if(isDrawing && currentTool==='gradient') { uiCtx.save(); uiCtx.strokeStyle='#ffffff'; uiCtx.lineWidth=1/zoom; uiCtx.beginPath(); uiCtx.moveTo(startX, startY); uiCtx.lineTo(lastX, lastY); uiCtx.stroke(); uiCtx.restore(); }
    if(isDrawing && currentTool==='line') { drawLine(previewCtx, startX, startY, lastX, lastY, currentColor, brushSize, false, false); }
    if(isDrawing && currentTool==='rect') { drawRectOutline(previewCtx, startX, startY, lastX, lastY, currentColor, brushSize, false, false); }
    if(isDrawing && currentTool==='circle') { let r = Math.round(Math.hypot(lastX-startX, lastY-startY)); drawCircle(previewCtx, startX, startY, r, currentColor, brushSize, false, false); }
    if(isTransforming) {
        if(tfType==='raster') { customDrawImage(previewCtx, tfCanvas, tfX+tfW/2, tfY+tfH/2, tfW, tfH, tfAngle, 1.0); } 
        uiCtx.save(); uiCtx.translate(tfX+tfW/2, tfY+tfH/2); uiCtx.rotate(tfAngle); uiCtx.lineWidth=1.5/zoom; uiCtx.strokeStyle='#000000'; uiCtx.strokeRect(-Math.abs(tfW)/2, -Math.abs(tfH)/2, Math.abs(tfW), Math.abs(tfH)); uiCtx.strokeStyle='#ffffff'; uiCtx.strokeRect(-Math.abs(tfW)/2-1/zoom, -Math.abs(tfH)/2-1/zoom, Math.abs(tfW)+2/zoom, Math.abs(tfH)+2/zoom); 
        let hs=7/zoom; uiCtx.fillStyle='#ffffff'; uiCtx.strokeStyle='#000000'; let aw=Math.abs(tfW)/2, ah=Math.abs(tfH)/2; let pts=[[-aw,-ah],[0,-ah],[aw,-ah],[-aw,0],[aw,0],[-aw,ah],[0,ah],[aw,ah]]; pts.forEach(p=>{ uiCtx.fillRect(p[0]-hs, p[1]-hs, hs*2, hs*2); uiCtx.strokeRect(p[0]-hs, p[1]-hs, hs*2, hs*2); }); 
        uiCtx.beginPath(); uiCtx.moveTo(0, -ah); uiCtx.lineTo(0, -ah-25/zoom); uiCtx.stroke(); 
        uiCtx.beginPath(); uiCtx.arc(0, -ah-25/zoom, hs+2/zoom, 0, Math.PI*2); uiCtx.fill(); uiCtx.stroke(); 
        uiCtx.restore();
    }
    if (isLightingActive) {
        uiCtx.save();
        volumetricLights.forEach(l => {
            uiCtx.beginPath();
            uiCtx.arc(l.x, l.y, 8 / zoom, 0, Math.PI * 2);
            uiCtx.fillStyle = `rgb(${l.color[0]}, ${l.color[1]}, ${l.color[2]})`;
            uiCtx.fill();
            uiCtx.lineWidth = l === activeLightRef ? 3 / zoom : 1 / zoom;
            uiCtx.strokeStyle = l === activeLightRef ? '#ffffff' : '#000000';
            uiCtx.stroke();
        });
        uiCtx.restore();
    }
    uiCtx.restore();
}

function createLayer(name) { 
    const c = document.createElement('canvas'); 
    c.width = width; 
    c.height = height; 
    return { 
        id: layerCounter++, 
        name: name, 
        canvas: c, 
        ctx: c.getContext('2d', { willReadFrequently: true }), 
        visible: true, 
        opacity: 1.0, 
        blendMode: 'source-over',
        tintColor: '#3b82f6',
        tintFactor: 0.0
    }; 
}

function addLayer() { saveState(); layers.push(createLayer(currentLanguage === 'es' ? `Capa ${layerCounter}` : `Layer ${layerCounter}`)); activeLayerIndex = layers.length - 1; renderLayersList(); renderComposite(); }
function deleteActiveLayer() { if(layers.length <= 1) return; saveState(); layers.splice(activeLayerIndex, 1); activeLayerIndex = Math.max(0, activeLayerIndex - 1); renderLayersList(); renderComposite(); }
function duplicateLayer() { saveState(); let source = layers[activeLayerIndex], nl = createLayer(source.name + (currentLanguage === 'es' ? " copia" : " copy")); nl.opacity = source.opacity; nl.blendMode = source.blendMode; nl.tintColor = source.tintColor || '#3b82f6'; nl.tintFactor = source.tintFactor || 0.0; nl.ctx.drawImage(source.canvas, 0, 0); layers.splice(activeLayerIndex + 1, 0, nl); activeLayerIndex++; renderLayersList(); renderComposite(); }
function mergeLayerDown() { if(activeLayerIndex > 0) { saveState(); let target = layers[activeLayerIndex-1], source = layers[activeLayerIndex]; target.ctx.globalAlpha = source.opacity; target.ctx.globalCompositeOperation = source.blendMode; target.ctx.drawImage(source.canvas, 0, 0); target.ctx.globalAlpha = 1.0; target.ctx.globalCompositeOperation = 'source-over'; layers.splice(activeLayerIndex, 1); activeLayerIndex--; renderLayersList(); renderComposite(); updateActiveLayerPreview(); } }
function toggleLayerVisibility(index) { layers[index].visible = !layers[index].visible; renderLayersList(); renderComposite(); }
function setActiveLayer(index) { activeLayerIndex = index; renderLayersList(); }
function updateLayerProps() { if(!layers[activeLayerIndex]) return; saveState(); layers[activeLayerIndex].blendMode = document.getElementById('layer-blend').value; layers[activeLayerIndex].opacity = parseFloat(document.getElementById('layer-opacity').value); renderComposite(); }
function moveLayer(index, dir) { if (index + dir < 0 || index + dir >= layers.length) return; saveState(); const temp = layers[index]; layers[index] = layers[index + dir]; layers[index + dir] = temp; if (activeLayerIndex === index) activeLayerIndex = index + dir; else if (activeLayerIndex === index + dir) activeLayerIndex = index; renderLayersList(); renderComposite(); }

function renderLayersList() { 
    const container = document.getElementById('layers-list'); 
    container.innerHTML = ''; 
    if(layers[activeLayerIndex]) { 
        document.getElementById('layer-blend').value = layers[activeLayerIndex].blendMode; 
        document.getElementById('layer-opacity').value = layers[activeLayerIndex].opacity; 
        
        let tCol = document.getElementById('layer-tint-color');
        let tFac = document.getElementById('layer-tint-factor');
        let tDisp = document.getElementById('layer-tint-factor-display');
        if (tCol) tCol.value = layers[activeLayerIndex].tintColor || '#3b82f6';
        if (tFac) tFac.value = layers[activeLayerIndex].tintFactor || 0.0;
        if (tDisp) tDisp.innerText = Math.round((layers[activeLayerIndex].tintFactor || 0.0) * 100) + '%';
    } 
    layers.forEach((layer, index) => { 
        const div = document.createElement('div'); 
        div.className = `layer-item flex items-center p-2 rounded-xl cursor-pointer border ${index === activeLayerIndex ? 'active' : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900'}`; 
        const visBtn = document.createElement('button'); 
        visBtn.innerHTML = layer.visible ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11-8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'; 
        visBtn.className = `p-1 mr-2 rounded ${layer.visible ? 'text-blue-400' : 'text-zinc-600'} hover:bg-zinc-800 shrink-0`; 
        visBtn.onclick = (e) => { e.stopPropagation(); toggleLayerVisibility(index); }; 
        const thumb = document.createElement('canvas'); 
        thumb.id = `layer-preview-${layer.id}`; 
        thumb.width = 32; 
        thumb.height = 32; 
        thumb.className = 'w-6 h-6 rounded bg-zinc-850 shrink-0 border border-zinc-700 mr-2'; 
        thumb.style.imageRendering = 'pixelated'; 
        const pCtx = thumb.getContext('2d'); 
        pCtx.imageSmoothingEnabled = false; 
        const scale = Math.min(32/width, 32/height), dw = width*scale, dh = height*scale, dx = (32-dw)/2, dy = (32-dh)/2; 
        pCtx.drawImage(layer.canvas, 0, 0, width, height, dx, dy, dw, dh); 
        const nameContainer = document.createElement('div'); 
        nameContainer.className = 'flex-1 overflow-hidden flex items-center'; 
        const nameSpan = document.createElement('span'); 
        nameSpan.className = 'text-xs font-bold text-zinc-200 flex-1 truncate cursor-text'; 
        nameSpan.innerText = layer.name; 
        nameSpan.ondblclick = (e) => { 
            e.stopPropagation(); 
            const input = document.createElement('input'); 
            input.type = 'text'; 
            input.value = layer.name; 
            input.className = 'w-full text-[10px] font-bold text-black px-1 rounded outline-none'; 
            nameContainer.replaceChild(input, nameSpan); 
            input.focus(); 
            input.select(); 
            const saveName = () => { if(input.value.trim() !== '') layer.name = input.value.trim(); renderLayersList(); }; 
            input.onblur = saveName; 
            input.onkeydown = (ev) => { if(ev.key === 'Enter') saveName(); }; 
        }; 
        nameContainer.appendChild(nameSpan); 
        const arrowsContainer = document.createElement('div'); 
        arrowsContainer.className = 'flex flex-col ml-2 shrink-0 border-l border-zinc-800 pl-2 justify-center gap-[2px]'; 
        const btnUp = document.createElement('button'); 
        btnUp.innerHTML = '▲'; 
        btnUp.className = `leading-none text-[10px] ${index===layers.length-1?'text-zinc-700 cursor-not-allowed':'text-zinc-400 hover:text-blue-400'}`; 
        btnUp.disabled = index===layers.length-1; 
        btnUp.onclick = (e) => { e.stopPropagation(); moveLayer(index, 1); }; 
        const btnDown = document.createElement('button'); 
        btnDown.innerHTML = '▼'; 
        btnDown.className = `leading-none text-[10px] ${index===0?'text-zinc-700 cursor-not-allowed':'text-zinc-400 hover:text-blue-400'}`; 
        btnDown.disabled = index===0; 
        btnDown.onclick = (e) => { e.stopPropagation(); moveLayer(index, -1); }; 
        arrowsContainer.appendChild(btnUp); 
        arrowsContainer.appendChild(btnDown); 
        div.onclick = () => setActiveLayer(index); 
        div.appendChild(visBtn); 
        div.appendChild(thumb); 
        div.appendChild(nameContainer); 
        div.appendChild(arrowsContainer); 
        container.appendChild(div); 
    }); 
}

function updateActiveLayerPreview() { if(!layers[activeLayerIndex]) return; const thumb = document.getElementById(`layer-preview-${layers[activeLayerIndex].id}`); if(thumb) { const pCtx = thumb.getContext('2d'); pCtx.clearRect(0,0,32,32); pCtx.imageSmoothingEnabled = false; const scale = Math.min(32/width, 32/height), dw = width*scale, dh = height*scale, dx = (32-dw)/2, dy = (32-dh)/2; pCtx.drawImage(layers[activeLayerIndex].canvas, 0, 0, width, height, dx, dy, dw, dh); } }

function renderComposite() { 
    displayCtx.clearRect(0, 0, width, height); 
    
    layers.forEach(layer => { 
        if(layer.visible) { 
            displayCtx.globalAlpha = layer.opacity; 
            displayCtx.globalCompositeOperation = layer.blendMode; 
            
            // Renderizado de Tinte No Destructivo (Novedad Capas)
            if (layer.tintFactor && layer.tintFactor > 0) {
                let tempC = document.createElement('canvas');
                tempC.width = width;
                tempC.height = height;
                let tempCtx = tempC.getContext('2d');
                tempCtx.drawImage(layer.canvas, 0, 0);
                
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = layer.tintColor || '#3b82f6';
                tempCtx.globalAlpha = layer.tintFactor;
                tempCtx.fillRect(0, 0, width, height);
                
                displayCtx.drawImage(tempC, 0, 0);
            } else {
                displayCtx.drawImage(layer.canvas, 0, 0);
            }
        } 
    }); 
    displayCtx.globalAlpha = 1.0; 
    displayCtx.globalCompositeOperation = 'source-over'; 
}

// Métodos Destructivos de Procesamiento de Capa (Novedad Capas)
function applyLayerGrayscale() {
    let layer = layers[activeLayerIndex];
    if (!layer) return;
    saveState();
    let ctx = layer.ctx;
    let imgData = ctx.getImageData(0, 0, width, height);
    let data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
            let v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = v;
            data[i+1] = v;
            data[i+2] = v;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    renderComposite();
    updateActiveLayerPreview();
}

function applyLayerInvert() {
    let layer = layers[activeLayerIndex];
    if (!layer) return;
    saveState();
    let ctx = layer.ctx;
    let imgData = ctx.getImageData(0, 0, width, height);
    let data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
            data[i] = 255 - data[i];
            data[i+1] = 255 - data[i+1];
            data[i+2] = 255 - data[i+2];
        }
    }
    ctx.putImageData(imgData, 0, 0);
    renderComposite();
    updateActiveLayerPreview();
}

function toggleGrid() { 
    const btnEl = document.getElementById('btn-grid'); 
    if(gridMode === 'none') { 
        gridMode = 'square'; 
        btnEl.classList.add('text-blue-400');
        btnEl.title = currentLanguage === 'es' ? "Rejilla: Cuadrada" : "Grid: Square";
    } else if(gridMode === 'square') { 
        gridMode = 'isometric'; 
        btnEl.classList.add('text-green-400');
        btnEl.classList.remove('text-blue-400');
        btnEl.title = currentLanguage === 'es' ? "Rejilla: Isométrica" : "Grid: Isometric";
    } else { 
        gridMode = 'none'; 
        btnEl.classList.remove('text-blue-400', 'text-green-400');
        btnEl.title = currentLanguage === 'es' ? "Mostrar Rejilla (#)" : "Show Grid (#)";
    } 
}

function togglePixelPerfect() {
    pixelPerfectOn = !pixelPerfectOn;
    const btn = document.getElementById('btn-pixelperfect');
    if(pixelPerfectOn) {
        btn.classList.add('text-blue-400', 'border-blue-800');
    } else {
        btn.classList.remove('text-blue-400', 'border-blue-800');
    }
    updatePixelPerfectButtonLabel();
}

function updatePixelPerfectButtonLabel() {
    const btn = document.getElementById('btn-pixelperfect');
    if (btn) {
        btn.innerText = `Pixel: ${pixelPerfectOn ? 'ON' : 'OFF'}`;
    }
}

function toggleIsoAssist() {
    isoAssistOn = !isoAssistOn;
    const btn = document.getElementById('btn-isoassist');
    if (isoAssistOn) {
        btn.classList.add('text-green-400', 'border-green-800');
    } else {
        btn.classList.remove('text-green-400', 'border-green-800');
    }
    updateIsoAssistButtonLabel();
}

function updateIsoAssistButtonLabel() {
    const btn = document.getElementById('btn-isoassist');
    if (btn) {
        btn.innerText = `Iso: ${isoAssistOn ? 'ON' : 'OFF'}`;
    }
}

function toggleTiledMode() {
    tiledModeOn = !tiledModeOn;
    const btn = document.getElementById('btn-tiled-mode');
    if (tiledModeOn) {
        btn.classList.add('text-blue-400');
    } else {
        btn.classList.remove('text-blue-400');
    }
}

function exportSVG() {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">\n`;
    const compCanvas = document.createElement('canvas');
    compCanvas.width = width;
    compCanvas.height = height;
    const compCtx = compCanvas.getContext('2d');
    
    layers.forEach(l => {
        if(l.visible) {
            compCtx.globalAlpha = l.opacity;
            compCtx.globalCompositeOperation = l.blendMode;
            compCtx.drawImage(l.canvas, 0, 0);
        }
    });
    
    const imgData = compCtx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let i = (y * width + x) * 4;
            let a = imgData[i + 3];
            if (a > 0) {
                let hex = "#" + ((1 << 24) + (imgData[i] << 16) + (imgData[i + 1] << 8) + imgData[i + 2]).toString(16).slice(1);
                let alpha = (a / 255).toFixed(2);
                svg += `  <rect x="${x}" y="${y}" width="1" height="1" fill="${hex}" fill-opacity="${alpha}" />\n`;
            }
        }
    }
    svg += `</svg>`;
    
    const b = new Blob([svg], {type: "image/svg+xml"});
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = `vectorart_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(u);
}

function exportPaletteCSS() {
    let css = `:root {\n`;
    palette.forEach((color, i) => {
        css += `  --pixvec-color-${i}: ${color};\n`;
    });
    css += `}\n`;
    
    const b = new Blob([css], {type: "text/css"});
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = `palette_${Date.now()}.css`;
    a.click();
    URL.revokeObjectURL(u);
}

document.getElementById('ref-image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = document.getElementById('ref-image-element');
        img.src = event.target.result;
        img.classList.remove('hidden');
        updateRefParams();
    };
    reader.readAsDataURL(file);
});

function clearReferenceImage() {
    const img = document.getElementById('ref-image-element');
    img.src = '';
    img.classList.add('hidden');
    document.getElementById('ref-image-upload').value = '';
}

function updateRefParams() {
    const img = document.getElementById('ref-image-element');
    const opacity = document.getElementById('ref-opacity').value;
    const scale = document.getElementById('ref-scale').value;
    
    img.style.opacity = opacity;
    img.style.transform = `scale(${scale})`;
    
    document.getElementById('ref-opac-disp').innerText = Math.round(opacity * 100) + '%';
    document.getElementById('ref-scale-disp').innerText = scale + 'x';
}

function analyzePalette() {
    const activeCtx = layers[activeLayerIndex].ctx;
    const imgData = activeCtx.getImageData(0, 0, width, height).data;
    let uniqueColors = new Set();
    for (let i = 0; i < imgData.length; i += 4) {
        if (imgData[i+3] > 0) {
            let hex = "#" + ((1 << 24) + (imgData[i] << 16) + (imgData[i+1] << 8) + imgData[i+2]).toString(16).slice(1);
            uniqueColors.add(hex);
        }
    }
    
    let colorArray = Array.from(uniqueColors);
    let tooClose = [];
    for (let i = 0; i < colorArray.length; i++) {
        for (let j = i + 1; j < colorArray.length; j++) {
            let rgb1 = hexToRgb(colorArray[i]);
            let rgb2 = hexToRgb(colorArray[j]);
            let dist = Math.sqrt(Math.pow(rgb1.r-rgb2.r, 2) + Math.pow(rgb1.g-rgb2.g, 2) + Math.pow(rgb1.b-rgb2.b, 2));
            if (dist < 18) {
                tooClose.push([colorArray[i], colorArray[j]]);
            }
        }
    }
    
    if (tooClose.length > 0) {
        let msg = currentLanguage === 'es' ? 
            `¡Análisis Completo! Se han detectado ${tooClose.length} pares de colores muy parecidos que podrían ensuciar tu Pixel Art. Te recomendamos unificar tonos para un acabado limpio.` :
            `Analysis Complete! Detected ${tooClose.length} pairs of color tones that are extremely close and might muddy your Pixel Art. We recommend merging them.`;
        showMessage(msg);
    } else {
        showMessage(currentLanguage === 'es' ? "¡Felicidades! Tu paleta de colores activa es completamente limpia y consistente." : "Great! Your active palette is highly optimized and clean.");
    }
}

function applySilhouetteInline() {
    saveState();
    const layer = layers[activeLayerIndex];
    const ctx = layer.ctx;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const result = new Uint8ClampedArray(data);
    const intensity = parseInt(document.getElementById('inline-intensity').value) || -25;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let i = (y * width + x) * 4;
            if (data[i + 3] > 0) {
                let isEdge = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        let nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            if (data[(ny * width + nx) * 4 + 3] === 0) {
                                isEdge = true; break;
                            }
                        } else {
                            isEdge = true; break;
                        }
                    }
                    if (isEdge) break;
                }
                if (isEdge) {
                    result[i] = Math.max(0, Math.min(255, data[i] + intensity));
                    result[i + 1] = Math.max(0, Math.min(255, data[i + 1] + intensity));
                    result[i + 2] = Math.max(0, Math.min(255, data[i + 2] + intensity));
                }
            }
        }
    }
    ctx.putImageData(new ImageData(result, width, height), 0, 0);
    renderComposite();
    updateActiveLayerPreview();
}

// Algoritmo de Limpieza Anti-Jaggies de Capa Completa (Novedad Pro Tools 2)
function applyCleanDoubles() {
    let layer = layers[activeLayerIndex];
    if (!layer) return;
    saveState();
    let ctx = layer.ctx;
    let imgData = ctx.getImageData(0, 0, width, height);
    let data = imgData.data;
    let temp = new Uint8ClampedArray(data);
    
    let getAlpha = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        return temp[((y * width) + x) * 4 + 3];
    };
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            if (temp[idx + 3] > 0) {
                let n  = getAlpha(x, y - 1) > 0;
                let s  = getAlpha(x, y + 1) > 0;
                let e  = getAlpha(x + 1, y) > 0;
                let w  = getAlpha(x - 1, y) > 0;
                
                let nw = getAlpha(x - 1, y - 1) > 0;
                let ne = getAlpha(x + 1, y - 1) > 0;
                let sw = getAlpha(x - 1, y + 1) > 0;
                let se = getAlpha(x + 1, y + 1) > 0;
                
                // Reconocer esquinas diagonales dobles redundantes en la línea
                if (n && e && !ne && !w && !s) { data[idx + 3] = 0; }
                else if (n && w && !nw && !e && !s) { data[idx + 3] = 0; }
                else if (s && e && !se && !w && !n) { data[idx + 3] = 0; }
                else if (s && w && !sw && !e && !n) { data[idx + 3] = 0; }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
    renderComposite();
    updateActiveLayerPreview();
}

function hexToHsl(hex) {
    let rgb = hexToRgb(hex);
    let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateHarmony() {
    const type = document.getElementById('harmony-type').value;
    const hsl = hexToHsl(currentColor);
    let colors = [];
    if (type === 'complementary') {
        colors = [
            hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 20)),
            hslToHex(hsl.h, hsl.s, hsl.l),
            hslToHex(hsl.h, hsl.s, Math.min(90, hsl.l + 20)),
            hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 180) % 360, hsl.s, Math.min(90, hsl.l + 20))
        ];
    } else if (type === 'analogous') {
        colors = [
            hslToHex((hsl.h + 300) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l),
            hslToHex(hsl.h, hsl.s, hsl.l),
            hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 60) % 360, hsl.s, hsl.l)
        ];
    } else if (type === 'triadic') {
        colors = [
            hslToHex(hsl.h, hsl.s, hsl.l),
            hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 120) % 360, hsl.s, Math.min(90, hsl.l + 20)),
            hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 240) % 360, hsl.s, Math.min(90, hsl.l + 20))
        ];
    } else if (type === 'monochromatic') {
        colors = [
            hslToHex(hsl.h, Math.max(10, hsl.s - 20), Math.max(15, hsl.l - 25)),
            hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 12)),
            hslToHex(hsl.h, hsl.s, hsl.l),
            hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 12)),
            hslToHex(hsl.h, Math.max(10, hsl.s - 20), Math.min(95, hsl.l + 25))
        ];
    }
    const grid = document.getElementById('harmony-grid');
    grid.innerHTML = '';
    colors.forEach(col => {
        const sw = document.createElement('button');
        sw.className = 'w-8 h-6 rounded border border-zinc-700 hover:scale-110 transition-transform cursor-pointer shrink-0';
        sw.style.backgroundColor = col;
        sw.title = col.toUpperCase();
        sw.onclick = () => { currentColor = col; updateColorUI(); };
        grid.appendChild(sw);
    });
}

function getBresenhamPoints(x0, y0, x1, y1) {
    let pts = [];
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    while(true) {
        pts.push({x: x0, y: y0});
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return pts;
}

function saveState() { 
    if (undoStack.length >= MAX_HISTORY) undoStack.shift(); 
    const state = layers.map(l => ({ 
        name: l.name, 
        visible: l.visible, 
        opacity: l.opacity, 
        blendMode: l.blendMode, 
        tintColor: l.tintColor,
        tintFactor: l.tintFactor,
        imgData: l.ctx.getImageData(0, 0, width, height) 
    })); 
    undoStack.push({ state, activeIdx: activeLayerIndex }); 
    redoStack = []; 
    updateHistoryUI(); 
}

function loadState(historyItem) { 
    layers = historyItem.state.map((s, i) => { 
        const l = createLayer(s.name); 
        l.id = i; 
        l.visible = s.visible; 
        l.opacity = s.opacity; 
        l.blendMode = s.blendMode; 
        l.tintColor = s.tintColor || '#3b82f6';
        l.tintFactor = s.tintFactor !== undefined ? s.tintFactor : 0.0;
        l.ctx.putImageData(s.imgData, 0, 0); 
        return l; 
    }); 
    activeLayerIndex = historyItem.activeIdx; 
    layerCounter = layers.length; 
    renderLayersList(); 
    renderComposite(); 
}

function undo() { 
    if (undoStack.length === 0) return; 
    redoStack.push({ 
        state: layers.map(l => ({ 
            name: l.name, 
            visible: l.visible, 
            opacity: l.opacity, 
            blendMode: l.blendMode, 
            tintColor: l.tintColor,
            tintFactor: l.tintFactor,
            imgData: l.ctx.getImageData(0,0,width,height) 
        })), 
        activeIdx: activeLayerIndex 
    }); 
    loadState(undoStack.pop()); 
    updateHistoryUI(); 
}

function redo() { 
    if (redoStack.length === 0) return; 
    undoStack.push({ 
        state: layers.map(l => ({ 
            name: l.name, 
            visible: l.visible, 
            opacity: l.opacity, 
            blendMode: l.blendMode, 
            tintColor: l.tintColor,
            tintFactor: l.tintFactor,
            imgData: l.ctx.getImageData(0,0,width,height) 
        })), 
        activeIdx: activeLayerIndex 
    }); 
    loadState(redoStack.pop()); 
    updateHistoryUI(); 
}

function updateHistoryUI() { 
    const bU = document.getElementById('btn-undo'), bR = document.getElementById('btn-redo'); 
    undoStack.length > 0 ? (bU.removeAttribute('disabled'), bU.classList.add('text-blue-400')) : (bU.setAttribute('disabled', 'true'), bU.classList.remove('text-blue-400')); 
    redoStack.length > 0 ? (bR.removeAttribute('disabled'), bR.classList.add('text-blue-400')) : (bR.setAttribute('disabled', 'true'), bR.classList.remove('text-blue-400')); 
}

function clearHistory() { undoStack = []; redoStack = []; updateHistoryUI(); }

function startAutoSave() { 
    if(!fs || !path || !os) return; 
    setInterval(() => { 
        try { 
            const autoSaveDir = path.join(getAppDir(), 'autoSave'); 
            if (!fs.existsSync(autoSaveDir)) fs.mkdirSync(autoSaveDir); 
            fs.writeFileSync(path.join(autoSaveDir, 'autosave.pixvec'), JSON.stringify(generateProjectData())); 
            const status = document.getElementById('autosave-status'); 
            status.style.opacity = 1; 
            setTimeout(() => status.style.opacity = 0, 2000); 
        } catch(e) {} 
    }, 30000); 
}

function showMessage(msg) { document.getElementById('message-text').innerText = msg; document.getElementById('modal-message').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); workspace.focus(); }
function showNewProjectModal() { document.getElementById('modal-new-project').classList.remove('hidden'); }

function createNewProject() { 
    width = parseInt(document.getElementById('proj-width').value) || 64; 
    height = parseInt(document.getElementById('proj-height').value) || 64; 
    colorMode = document.getElementById('proj-mode').value; 
    [bgCanvas, displayCanvas, selectionCanvas, previewCanvas, uiCanvas].forEach(c => { c.width = width; c.height = height; }); 
    selectionMask = new Uint8Array(width * height); 
    layers = []; 
    layerCounter = 0; 
    layers.push(createLayer(currentLanguage === 'es' ? 'Fondo' : 'Background')); 
    activeLayerIndex = 0; 
    symOn = false; symX = width/2; symY = height/2; isTransforming = false; 
    document.getElementById('btn-commit-tf').classList.add('hidden'); 
    cancelSelection(); clearHistory(); closeModal('modal-new-project'); 
    renderLayersList(); renderComposite(); centerCanvas(); updateStatusProjectMeta(); 
}

function applyTransform() { wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; document.getElementById('zoom-indicator').innerText = Math.round(zoom * 100) + '%'; }
function centerCanvas() { const wsRect = workspace.getBoundingClientRect(), scaleX = (wsRect.width - 40) / width, scaleY = (wsRect.height - 40) / height; zoom = Math.floor(Math.min(scaleX, scaleY, 20)); if(zoom < 1) zoom = 1; panX = (wsRect.width - (width * zoom)) / 2; panY = (wsRect.height - (height * zoom)) / 2; applyTransform(); }
function zoomIn() { zoom = Math.min(zoom * 1.5, 50); applyTransform(); }
function zoomOut() { zoom = Math.max(zoom / 1.5, 0.5); applyTransform(); }
function toggleFullscreen() { !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen(); }

function renderPalette() { const grid = document.getElementById('palette-grid'); grid.innerHTML = ''; palette.forEach((color, index) => { const div = document.createElement('div'); div.className = `color-swatch w-6 h-6 rounded cursor-pointer shadow ${color === currentColor ? 'active' : ''}`; div.style.backgroundColor = color; div.onclick = () => { currentColor = color; selectedPaletteIndex = index; updateColorUI(); }; div.ondblclick = () => { const p = document.createElement('input'); p.type = 'color'; p.value = color; p.onchange = (e) => { palette[index] = e.target.value; currentColor = e.target.value; renderPalette(); }; p.click(); }; grid.appendChild(div); }); updateColorUI(); }
function updateColorUI() { document.getElementById('main-color-picker').value = currentColor; document.getElementById('hex-display').innerText = currentColor.toUpperCase(); document.querySelectorAll('.color-swatch').forEach(el => { el.classList.remove('active'); let bg = el.style.backgroundColor; if(bg.startsWith('rgb')) bg = "#" + bg.match(/\d+/g).map(x=>parseInt(x).toString(16).padStart(2,'0')).join(''); if(bg.toLowerCase() === currentColor.toLowerCase()) el.classList.add('active'); }); generateHarmony(); }
function updateSelectedPaletteColor() { palette[selectedPaletteIndex] = currentColor; renderPalette(); }
document.getElementById('main-color-picker').addEventListener('input', (e) => { currentColor = e.target.value; updateColorUI(); });
document.getElementById('opacity-slider').addEventListener('input', (e) => { globalAlpha = parseFloat(e.target.value); document.getElementById('opacity-display').innerText = Math.round(globalAlpha * 100) + '%'; });

document.querySelectorAll('.tool-btn').forEach(btn => { 
    btn.addEventListener('click', () => { 
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); 
        btn.classList.add('active'); 
        currentTool = btn.dataset.tool; 
        workspace.style.cursor = (currentTool === 'hand') ? 'grab' : 'crosshair'; 
        
        const gradOpts = document.getElementById('gradient-options');
        if (currentTool === 'gradient') {
            gradOpts.classList.remove('hidden');
            gradOpts.classList.add('flex');
            toggleColorMode('advanced');
        } else {
            gradOpts.classList.add('hidden');
            gradOpts.classList.remove('flex');
        }
        updateStatusTool();
    }); 
});
function changeBrushSize(delta) { brushSize = Math.max(1, Math.min(20, brushSize + delta)); document.getElementById('brush-size-display').innerText = brushSize; }

window.addEventListener('keydown', (e) => {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; 
    if(e.ctrlKey) { if(e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; } if(e.key.toLowerCase() === 'x') { e.preventDefault(); redo(); return; } if(e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; } if(e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelection(); return; } }
    if(e.key === 'Enter') { e.preventDefault(); commitTransform(); return; }
    switch(e.key.toLowerCase()) { case '+': changeBrushSize(1); break; case '-': changeBrushSize(-1); break; case 'p': selectTool('pencil'); break; case 'e': selectTool('eraser'); break; case 'l': selectTool('line'); break; case 'u': selectTool('rect'); break; case 'c': selectTool('circle'); break; case 'i': selectTool('picker'); break; case 'w': selectTool('magic'); break; case 'g': selectTool('gradient'); break; case 'b': case 'f': selectTool('bucket'); break; case '#': toggleGrid(); break; case ' ': selectTool('hand'); e.preventDefault(); break; }
});

function selectTool(name) { 
    document.querySelector(`.tool-btn[data-tool="${name}"]`)?.click(); 
    updateStatusTool();
}
function getCanvasMouse(e) { const rect = displayCanvas.getBoundingClientRect(); let ex = (e.clientX - rect.left) / (rect.width / width), ey = (e.clientY - rect.top) / (rect.height / height); return { x: Math.floor(ex), y: Math.floor(ey), rawX: ex, rawY: ey }; }

function pickColor(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const data = displayCtx.getImageData(x, y, 1, 1).data;
    if (data[3] === 0) return; 
    const hex = "#" + (1 << 24 | data[0] << 16 | data[1] << 8 | data[2]).toString(16).slice(1);
    currentColor = hex;
    globalAlpha = parseFloat((data[3] / 255).toFixed(2));
    document.getElementById('opacity-slider').value = globalAlpha;
    document.getElementById('opacity-display').innerText = Math.round(globalAlpha * 100) + '%';
    updateColorUI();
}

workspace.addEventListener('mousedown', (e) => {
    const pt = getCanvasMouse(e);
    if (isLightingActive) {
        const rect = displayCanvas.getBoundingClientRect();
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;
        let clickedLight = null;
        for (let i = volumetricLights.length - 1; i >= 0; i--) {
            const l = volumetricLights[i];
            const screenX = rect.left + l.x * scaleX;
            const screenY = rect.top + l.y * scaleY;
            if (Math.hypot(e.clientX - screenX, e.clientY - screenY) < 15) {
                clickedLight = l;
                break;
            }
        }
        if (clickedLight) {
            activeLightRef = clickedLight;
            document.getElementById('native-light-intensity').value = activeLightRef.intensity;
            document.getElementById('native-light-z').value = activeLightRef.z;
            isLightDragging = true;
        } else {
            activeLightRef = null;
        }
        return;
    }
    if(isTransforming && e.button === 0) { tfActiveHandle = transformHitTest(pt.rawX, pt.rawY); if(tfActiveHandle) { tfStartX = pt.rawX; tfStartY = pt.rawY; tfInitX = tfX; tfInitY = tfY; tfInitW = tfW; tfInitH = tfH; tfInitAngle = tfAngle; return; } else { commitTransform(); } }
    if (e.button === 1 || currentTool === 'hand' || e.code === 'Space') { e.preventDefault(); isPanning = true; workspace.style.cursor = 'grabbing'; startX = e.clientX - panX; startY = e.clientY - panY; return; }
    if (e.button !== 0) return; 
    if(!layers[activeLayerIndex].visible) { showMessage(translations[currentLanguage].modals.layerHidden); return; }
    if(symOn) { if(symDir === 'V' && Math.abs(pt.x - symX) <= 2) { isDraggingSym = true; return; } if(symDir === 'H' && Math.abs(pt.y - symY) <= 2) { isDraggingSym = true; return; } }
    
    if (!['magic', 'rectSelect', 'lassoSelect', 'picker'].includes(currentTool)) saveState();
    
    isDrawing = true; startX = pt.x; startY = pt.y; lastX = pt.x; lastY = pt.y; const ctx = layers[activeLayerIndex].ctx;
    
    if (currentTool === 'picker') { pickColor(pt.x, pt.y); }
    else if (currentTool === 'pencil' || currentTool === 'eraser') { 
        strokeBackupCanvas.width = width;
        strokeBackupCanvas.height = height;
        strokeBackupCanvas.getContext('2d').drawImage(layers[activeLayerIndex].canvas, 0, 0);
        strokePoints = [{x: pt.x, y: pt.y}];
        drawPoint(ctx, pt.x, pt.y, currentColor, brushSize, currentTool === 'eraser', false); 
        renderComposite(); 
    } 
    else if (currentTool === 'bucket') { floodFill(ctx, pt.x, pt.y, currentColor); renderComposite(); } 
    else if (currentTool === 'magic') { floodSelectComposite(pt.x, pt.y); } 
    else if (currentTool === 'rectSelect') { isRectSelecting = true; } 
    else if (currentTool === 'lassoSelect') { isLassoing = true; lassoPoints = [pt]; }
});

function getPixelColor(d, x, y) { if(x<0||x>=width||y<0||y>=height) return {r:0,g:0,b:0,a:0}; const i = (y * width + x) * 4; return { r: d[i], g: d[i+1], b: d[i+2], a: d[i+3] }; }
function setPixelColor(d, x, y, c) { const i = (y * width + x) * 4; d[i] = c.r; d[i+1] = c.g; d[i+2] = c.b; d[i+3] = c.a; }
function colorsMatch(c1, c2) { return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a; }

function floodSelectComposite(startX, startY) {
    if(startX < 0 || startX >= width || startY < 0 || startY >= height) return;
    if(!selectionMask) selectionMask = new Uint8Array(width * height); selectionMask.fill(0); 
    const data = displayCtx.getImageData(0, 0, width, height).data; const targetColor = getPixelColor(data, startX, startY); const stack = [[startX, startY]]; let selectedCount = 0;
    while(stack.length > 0) {
        const [x, y] = stack.pop(); let curX = x;
        while(curX >= 0 && colorsMatch(getPixelColor(data, curX, y), targetColor) && !selectionMask[curX + y * width]) curX--; curX++;
        let spanAbove = false, spanBelow = false;
        while(curX < width && colorsMatch(getPixelColor(data, curX, y), targetColor) && !selectionMask[curX + y * width]) {
            selectionMask[curX + y * width] = 1; selectedCount++;
            if(y > 0) { if(colorsMatch(getPixelColor(data, curX, y - 1), targetColor) && !selectionMask[curX + (y-1) * width] && !spanAbove) { stack.push([curX, y - 1]); spanAbove = true; } else if(!colorsMatch(getPixelColor(data, curX, y - 1), targetColor)) spanAbove = false; }
            if(y < height - 1) { if(colorsMatch(getPixelColor(data, curX, y + 1), targetColor) && !selectionMask[curX + (y+1) * width] && !spanBelow) { stack.push([curX, y + 1]); spanBelow = true; } else if(!colorsMatch(getPixelColor(data, curX, y + 1), targetColor)) spanBelow = false; }
            curX++;
        }
    }
    hasSelection = selectedCount > 0;
    const tb = document.getElementById('selection-toolbar'); hasSelection ? tb.classList.remove('hidden') : tb.classList.add('hidden'); document.getElementById('btn-modify-sel').classList.remove('hidden'); selectionCtx.clearRect(0,0,width,height);
}

function floodFill(ctx, startX, startY, fillColor) {
    if(startX < 0 || startX >= width || startY < 0 || startY >= height) return; if(hasSelection && !selectionMask[startX + startY * width]) return;
    const imageData = ctx.getImageData(0, 0, width, height); const data = imageData.data; const targetColor = getPixelColor(data, startX, startY); const fillRgb = hexToRgb(fillColor); fillRgb.a = Math.round(globalAlpha * 255);
    if (colorsMatch(targetColor, fillRgb)) return; const stack = [[startX, startY]];
    while(stack.length > 0) {
        const [x, y] = stack.pop(); let curX = x;
        while(curX >= 0 && colorsMatch(getPixelColor(data, curX, y), targetColor) && (!hasSelection || selectionMask[curX + y * width])) curX--; curX++;
        let spanAbove = false, spanBelow = false;
        while(curX < width && colorsMatch(getPixelColor(data, curX, y), targetColor) && (!hasSelection || selectionMask[curX + y * width])) {
            setPixelColor(data, curX, y, fillRgb);
            if(y > 0 && (!hasSelection || selectionMask[curX + (y-1) * width])) { if(colorsMatch(getPixelColor(data, curX, y - 1), targetColor) && !spanAbove) { stack.push([curX, y - 1]); spanAbove = true; } else if(!colorsMatch(getPixelColor(data, curX, y - 1), targetColor)) spanAbove = false; }
            if(y < height - 1 && (!hasSelection || selectionMask[curX + (y+1) * width])) { if(colorsMatch(getPixelColor(data, curX, y + 1), targetColor) && !spanBelow) { stack.push([curX, y + 1]); spanBelow = true; } else if(!colorsMatch(getPixelColor(data, curX, y + 1), targetColor)) spanBelow = false; }
            curX++;
        }
    }
    ctx.putImageData(imageData, 0, 0); updateActiveLayerPreview(); 
}

function applyGradient(ctx, x0, y0, x1, y1) {
    let tempC = document.createElement('canvas'); tempC.width=width; tempC.height=height; let tCtx = tempC.getContext('2d'); const imgData = tCtx.createImageData(width, height); const data = imgData.data; const type = document.getElementById('gradient-type').value; const startRgb = hexToRgb(currentColor); const targetRgb = { r: startRgb.r, g: startRgb.g, b: startRgb.b, a: 0 }; const dx = x1 - x0, dy = y1 - y0, lengthSq = dx * dx + dy * dy, maxRadius = Math.sqrt(lengthSq);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (hasSelection && !selectionMask[x + y * width]) continue;
            let t = 0; if (type === 'linear') { if (lengthSq > 0) t = ((x - x0) * dx + (y - y0) * dy) / lengthSq; } else { const dist = Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2)); if (maxRadius > 0) t = dist / maxRadius; }
            t = Math.max(0, Math.min(1, t)); const r = startRgb.r + t * (targetRgb.r - startRgb.r), g = startRgb.g + t * (targetRgb.g - startRgb.g), b = startRgb.b + t * (targetRgb.b - startRgb.b), a = (startRgb.a * globalAlpha) + t * (targetRgb.a - (startRgb.a * globalAlpha)); setPixelColor(data, x, y, {r, g, b, a: Math.round(a)});
        }
    }
    tCtx.putImageData(imgData, 0, 0); ctx.save(); ctx.drawImage(tempC, 0, 0); ctx.restore();
}

function copySelection() {
    if(!hasSelection || !selectionMask) return; let b = getBoundsMask(width, height, selectionMask);
    if(b) {
        clipboardCanvas = document.createElement('canvas'); clipboardCanvas.width = b.w; clipboardCanvas.height = b.h; let cCtx = clipboardCanvas.getContext('2d'), srcData = layers[activeLayerIndex].ctx.getImageData(b.x, b.y, b.w, b.h), clipData = cCtx.createImageData(b.w, b.h);
        for(let y=0; y<b.h; y++){ for(let x=0; x<b.w; x++){ if(selectionMask[(b.y+y)*width+(b.x+x)]) { let idx = (y*b.w+x)*4; clipData.data[idx]=srcData.data[idx]; clipData.data[idx+1]=srcData.data[idx+1]; clipData.data[idx+2]=srcData.data[idx+2]; clipData.data[idx+3]=srcData.data[idx+3]; } } }
        cCtx.putImageData(clipData,0,0); showMessage("Píxeles copiados.");
    }
}

function pasteSelection() { if(!clipboardCanvas) return; let tc = document.createElement('canvas'); tc.width=width; tc.height=height; tc.getContext('2d').imageSmoothingEnabled=false; tc.getContext('2d').drawImage(clipboardCanvas, Math.floor(width/2 - clipboardCanvas.width/2), Math.floor(height/2 - clipboardCanvas.height/2)); tfType='raster'; initTransform(tc, false, 'raster'); }

function nativeAddLight(type) {
    nativeInitLightingMode();
    const intensityInput = parseFloat(document.getElementById('native-light-intensity').value);
    const zInput = parseFloat(document.getElementById('native-light-z').value);
    
    const newLight = {
        type: type, x: width / 2, y: height / 2, z: zInput, intensity: intensityInput, color: [255, 255, 255]
    };

    if (type === 'punto') newLight.color = [255, 235, 180];
    if (type === 'dir') newLight.color = [255, 255, 255];
    if (type === 'neon') {
        const neonHex = document.getElementById('native-neon-color').value;
        const bigint = parseInt(neonHex.slice(1), 16);
        newLight.color = [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }

    volumetricLights.push(newLight);
    activeLightRef = newLight;
    nativeRenderLightingEffect();
}

function nativeClearLights() {
    volumetricLights = [];
    activeLightRef = null;
    if (isLightingActive) { nativeRenderLightingEffect(); }
}

function nativeFinalizeLights(apply) {
    isLightingActive = false;
    isLightDragging = false;
    
    if (!apply && lightingBaseData) {
        const layer = layers[activeLayerIndex];
        if (layer) { layer.ctx.putImageData(lightingBaseData, 0, 0); renderComposite(); }
    } else if (apply && lightingBaseData) {
        const layer = layers[activeLayerIndex];
        if (layer) {
            const finalLit = layer.ctx.getImageData(0, 0, width, height);
            layer.ctx.putImageData(lightingBaseData, 0, 0);
            saveState();
            layer.ctx.putImageData(finalLit, 0, 0);
            renderComposite();
        }
    }

    lightingBaseData = null; lightingNormals = null; volumetricLights = []; activeLightRef = null;
    updateActiveLayerPreview();
    closeModal('modal-native-light');
    workspace.style.cursor = 'crosshair';
}

function nativeRenderLightingEffect() {
    if (!lightingBaseData || !lightingNormals) return;
    const layer = layers[activeLayerIndex];
    if (!layer) return;

    const ctx = layer.ctx;
    const dstData = ctx.createImageData(width, height);
    const s = lightingBaseData.data, d = dstData.data, nm = lightingNormals;

    for (let i = 0; i < s.length; i++) { d[i] = s[i]; }

    const lCache = volumetricLights.map(l => ({
        ...l, cR: l.color[0] / 255, cG: l.color[1] / 255, cB: l.color[2] / 255
    }));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x, i4 = idx * 4;
            if (s[i4 + 3] > 0) {
                const nx = nm[idx * 3], ny = nm[idx * 3 + 1], nz = nm[idx * 3 + 2];
                let addR = 0, addG = 0, addB = 0;

                for (let j = 0; j < lCache.length; j++) {
                    const l = lCache[j];
                    let lx, ly, lz, len, dot, atten = 1;

                    if (l.type === 'dir') {
                        lx = l.x - (width / 2); ly = l.y - (height / 2); lz = l.z;
                        len = Math.sqrt(lx * lx + ly * ly + lz * lz);
                        lx /= len; ly /= len; lz /= len;
                        dot = Math.max(0, nx * lx + ny * ly + nz * lz);
                    } else {
                        lx = l.x - x; ly = l.y - y; lz = l.z;
                        len = Math.sqrt(lx * lx + ly * ly + lz * lz);
                        lx /= len; ly /= len; lz /= len;
                        dot = Math.max(0, nx * lx + ny * ly + nz * lz);
                        atten = l.type === 'neon' ? 1 / (1 + (len * len) * 0.0005) : 1 / (1 + (len * len) * 0.00005);
                    }

                    const intensity = dot * atten * l.intensity * 255;
                    const specular = Math.pow(dot, 15.0) * atten * l.intensity * 100;

                    addR += intensity * l.cR + specular;
                    addG += intensity * l.cG + specular;
                    addB += intensity * l.cB + specular;
                }

                d[i4] = Math.min(255, s[i4] + addR);
                d[i4 + 1] = Math.min(255, s[i4 + 1] + addG);
                d[i4 + 2] = Math.min(255, s[i4 + 2] + addB);
            }
        }
    }

    ctx.putImageData(dstData, 0, 0);
    renderComposite();
}

function nativeInitLightingMode() {
    const layer = layers[activeLayerIndex];
    if (!layer) return;
    if (!isLightingActive) {
        lightingBaseData = layer.ctx.getImageData(0, 0, width, height);
        nativeBuildNormalsMap(lightingBaseData.data);
        isLightingActive = true;
    }
}

function nativeBuildNormalsMap(src) {
    const dist = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            dist[i] = src[i * 4 + 3] > 0 ? 999999 : 0;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (dist[i] === 0) continue;
            let minD = dist[i];
            if (x > 0) minD = Math.min(minD, dist[y * width + (x - 1)] + 1);
            if (y > 0) minD = Math.min(minD, dist[(y - 1) * width + x] + 1);
            dist[i] = minD;
        }
    }

    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            const i = y * width + x;
            if (dist[i] === 0) continue;
            let minD = dist[i];
            if (x < width - 1) minD = Math.min(minD, dist[y * width + (x + 1)] + 1);
            if (y < height - 1) minD = Math.min(minD, dist[(y + 1) * width + x] + 1);
            dist[i] = minD;
        }
    }

    const heightMap = new Float32Array(width * height);
    const maxDepth = 15.0;
    for (let i = 0; i < width * height; i++) {
        if (dist[i] > 0) {
            if (dist[i] <= maxDepth) {
                heightMap[i] = Math.sin((dist[i] / maxDepth) * (Math.PI / 2)) * maxDepth;
            } else {
                heightMap[i] = maxDepth + (dist[i] - maxDepth) * 0.1;
            }
        }
    }

    const blurHeight = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            blurHeight[i] = heightMap[i];
        }
    }

    lightingNormals = new Float32Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (src[i * 4 + 3] === 0) continue;

            const tl = (x > 0 && y > 0) ? blurHeight[(y - 1) * width + (x - 1)] : 0;
            const tc = (y > 0) ? blurHeight[(y - 1) * width + x] : 0;
            const tr = (x < width - 1 && y > 0) ? blurHeight[(y - 1) * width + (x + 1)] : 0;
            const cl = (x > 0) ? blurHeight[y * width + (x - 1)] : 0;
            const cr = (x < width - 1) ? blurHeight[y * width + (x + 1)] : 0;
            const bl = (x > 0 && y < height - 1) ? blurHeight[(y + 1) * width + (x - 1)] : 0;
            const bc = (y < height - 1) ? blurHeight[(y + 1) * width + x] : 0;
            const br = (x < width - 1 && y < height - 1) ? blurHeight[(y + 1) * width + (x + 1)] : 0;

            const dx = (tr + 2 * cr + br) - (tl + 2 * cl + bl);
            const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
            const dz = 8.0;

            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            lightingNormals[i * 3] = -dx / len;
            lightingNormals[i * 3 + 1] = -dy / len;
            lightingNormals[i * 3 + 2] = dz / len;
        }
    }
}

function runLive3DVolume() {
    if (!effectBackupData || !layers[activeLayerIndex]) return;
    const layer = layers[activeLayerIndex];
    layer.ctx.putImageData(effectBackupData, 0, 0);

    const ctx = layer.ctx;
    const srcData = ctx.getImageData(0, 0, width, height);
    const dstData = ctx.createImageData(width, height);
    const s = srcData.data, d = dstData.data;

    const depth = parseInt(document.getElementById('native-vol-depth').value) || 6;
    const intensity = parseInt(document.getElementById('native-vol-intensity').value) || 12;
    const dist = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            dist[idx] = (s[idx * 4 + 3] === 0) ? 0 : 999999;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (dist[idx] === 0) continue;
            let minD = dist[idx];
            if (x > 0) minD = Math.min(minD, dist[y * width + (x - 1)] + 1);
            if (y > 0) minD = Math.min(minD, dist[(y - 1) * width + x] + 1);
            dist[idx] = minD;
        }
    }

    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            const idx = y * width + x;
            if (dist[idx] === 0) continue;
            let minD = dist[idx];
            if (x < width - 1) minD = Math.min(minD, dist[y * width + (x + 1)] + 1);
            if (y < height - 1) minD = Math.min(minD, dist[(y + 1) * width + x] + 1);
            dist[idx] = Math.min(minD, depth);
        }
    }

    const lx = -0.577, ly = -0.577, lz = 0.577, baseDot = lz;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx4 = (y * width + x) * 4;
            if (s[idx4 + 3] > 0) {
                const l = x > 0 ? dist[y * width + (x - 1)] : 0;
                const r = x < width - 1 ? dist[y * width + (x + 1)] : 0;
                const t = y > 0 ? dist[(y - 1) * width + x] : 0;
                const b = y < height - 1 ? dist[(y + 1) * width + x] : 0;

                const dx = r - l, dy = b - t, dz = 2.0; 
                const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const nx = -dx / len, ny = -dy / len, nz = dz / len;

                let dot = (nx * lx + ny * ly + nz * lz);
                dot = Math.max(-1, Math.min(1, dot));

                const actualLight = dot - baseDot;
                const lightChange = actualLight * (intensity * 8);

                d[idx4] = Math.min(255, Math.max(0, s[idx4] + lightChange));
                d[idx4 + 1] = Math.min(255, Math.max(0, s[idx4 + 1] + lightChange));
                d[idx4 + 2] = Math.min(255, Math.max(0, s[idx4 + 2] + lightChange));
                d[idx4 + 3] = s[idx4 + 3];
            }
        }
    }

    ctx.putImageData(dstData, 0, 0);
    renderComposite();
}

function cancelNativeVol3D() {
    if (effectBackupData && layers[activeLayerIndex]) {
        layers[activeLayerIndex].ctx.putImageData(effectBackupData, 0, 0);
        renderComposite();
    }
    effectBackupData = null;
    closeModal('modal-native-vol');
}

function applyNativeVol3D() {
    if (effectBackupData && layers[activeLayerIndex]) {
        const finalData = layers[activeLayerIndex].ctx.getImageData(0, 0, width, height);
        layers[activeLayerIndex].ctx.putImageData(effectBackupData, 0, 0);
        saveState();
        layers[activeLayerIndex].ctx.putImageData(finalData, 0, 0);
        renderComposite();
        updateActiveLayerPreview();
    }
    effectBackupData = null;
    closeModal('modal-native-vol');
}

function openNativeLightModal() { 
    const lightContent = document.getElementById('native-light-content');
    if (lightContent && (!lightContent.style.left || lightContent.style.left === "")) {
        lightContent.style.left = `calc(50vw - 144px)`;
        lightContent.style.top = `calc(50vh - 200px)`;
    }
    document.getElementById('modal-native-light').classList.remove('hidden'); 
}

function openNativeVolModal() { 
    const layer = layers[activeLayerIndex];
    if (!layer) return;
    effectBackupData = layer.ctx.getImageData(0, 0, width, height);
    
    const volContent = document.getElementById('native-vol-content');
    if (volContent && (!volContent.style.left || volContent.style.left === "")) {
        volContent.style.left = `calc(50vw - 144px)`;
        volContent.style.top = `calc(50vh - 120px)`;
    }

    document.getElementById('modal-native-vol').classList.remove('hidden'); 
    runLive3DVolume();
}

function openEffectSettings(effectName) {
    activeEffectName = effectName;
    const titleEl = document.getElementById('effect-settings-title');
    const bodyEl = document.getElementById('effect-settings-body');
    const applyBtn = document.getElementById('btn-effect-apply');
    
    const layer = layers[activeLayerIndex];
    if (!layer) return;
    effectBackupData = layer.ctx.getImageData(0, 0, width, height);

    bodyEl.innerHTML = '';
    const tr = translations[currentLanguage];
    
    if (effectName === 'mirror') {
        titleEl.innerText = tr.effectsList.mirror;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.axis}</label>
                <select id="eff-param-axis" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1.5 text-xs text-white">
                    <option value="horizontal">${tr.effectParams.horizontal}</option>
                    <option value="vertical">${tr.effectParams.vertical}</option>
                </select>
            </div>
        `;
    } 
    else if (effectName === 'outline') {
        titleEl.innerText = tr.effectsList.outline;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.color}</label>
                <input type="color" id="eff-param-color" value="#000000" class="w-full h-8 bg-transparent border-0 cursor-pointer p-0">
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.thickness}</label>
                <input type="number" id="eff-param-thick" value="1" min="1" max="5" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-center">
            </div>
        `;
    } 
    else if (effectName === 'dither') {
        titleEl.innerText = tr.effectsList.dither;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.intensity}</label>
                <input type="range" id="eff-param-intensity" min="0" max="1" step="0.1" value="0.5" class="w-full">
                <span id="eff-param-intensity-val" class="text-[10px] text-blue-400 font-mono text-center">50%</span>
            </div>
        `;
        setTimeout(() => {
            const slider = document.getElementById('eff-param-intensity');
            const display = document.getElementById('eff-param-intensity-val');
            if (slider && display) {
                slider.oninput = () => {
                    display.innerText = Math.round(slider.value * 100) + '%';
                    applyLiveEffect();
                };
            }
        }, 50);
    } 
    else if (effectName === 'rotate') {
        titleEl.innerText = tr.effectsList.rotate;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.angle}</label>
                <select id="eff-param-angle" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1.5 text-xs text-white">
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                </select>
            </div>
        `;
    } 
    else if (effectName === 'brightness') {
        titleEl.innerText = tr.effectsList.brightness;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.amount}</label>
                <input type="range" id="eff-param-brightness" min="-100" max="100" value="25" class="w-full">
                <span id="eff-param-brightness-val" class="text-[10px] text-blue-400 font-mono text-center">+25</span>
            </div>
        `;
        setTimeout(() => {
            const slider = document.getElementById('eff-param-brightness');
            const display = document.getElementById('eff-param-brightness-val');
            if (slider && display) {
                slider.oninput = () => {
                    display.innerText = (slider.value > 0 ? '+' : '') + slider.value;
                    applyLiveEffect();
                };
            }
        }, 50);
    } 
    else if (effectName === 'cleanOrphans') {
        titleEl.innerText = tr.effectsList.cleanOrphans;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.neighbors}</label>
                <input type="number" id="eff-param-neighbors" value="1" min="1" max="8" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-center">
            </div>
        `;
    } 
    else if (effectName === 'shadow') {
        titleEl.innerText = tr.effectsList.shadow;
        bodyEl.innerHTML = `
            <div class="flex gap-2">
                <div class="w-1/2 flex flex-col gap-1">
                    <label class="text-[9px] uppercase font-bold text-zinc-400">Offset X</label>
                    <input type="number" id="eff-param-ox" value="1" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-center">
                </div>
                <div class="w-1/2 flex flex-col gap-1">
                    <label class="text-[9px] uppercase font-bold text-zinc-400">Offset Y</label>
                    <input type="number" id="eff-param-oy" value="1" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-center">
                </div>
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.color}</label>
                <input type="color" id="eff-param-scolor" value="#000000" class="w-full h-8 bg-transparent border-0 cursor-pointer p-0">
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.opacity}</label>
                <input type="range" id="eff-param-sopacity" min="0" max="1" step="0.1" value="0.5" class="w-full">
                <span id="eff-param-sopacity-val" class="text-[10px] text-blue-400 font-mono text-center">50%</span>
            </div>
        `;
        setTimeout(() => {
            const slider = document.getElementById('eff-param-sopacity');
            const display = document.getElementById('eff-param-sopacity-val');
            if (slider && display) {
                slider.oninput = () => {
                    display.innerText = Math.round(slider.value * 100) + '%';
                    applyLiveEffect();
                };
            }
        }, 50);
    } 
    else if (effectName === 'noise') {
        titleEl.innerText = tr.effectsList.noise;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.intensity}</label>
                <input type="range" id="eff-param-noise" min="0" max="100" value="30" class="w-full">
                <span id="eff-param-noise-val" class="text-[10px] text-blue-400 font-mono text-center">30</span>
            </div>
        `;
        setTimeout(() => {
            const slider = document.getElementById('eff-param-noise');
            const display = document.getElementById('eff-param-noise-val');
            if (slider && display) {
                slider.oninput = () => {
                    display.innerText = slider.value;
                    applyLiveEffect();
                };
            }
        }, 50);
    } 
    else if (effectName === 'simplify') {
        titleEl.innerText = tr.effectsList.simplify;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.colors}</label>
                <select id="eff-param-simplify" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1.5 text-xs text-white">
                    <option value="128">2 niveles (Retro 1-bit)</option>
                    <option value="64" selected>4 niveles (Retro 2-bit)</option>
                    <option value="32">8 niveles</option>
                    <option value="16">16 niveles</option>
                </select>
            </div>
        `;
    } 
    else if (effectName === 'glitch') {
        titleEl.innerText = tr.effectsList.glitch;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.intensity}</label>
                <input type="range" id="eff-param-glitch-prob" min="0" max="1" step="0.05" value="0.2" class="w-full">
                <span id="eff-param-glitch-prob-val" class="text-[10px] text-blue-400 font-mono text-center">20%</span>
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] uppercase font-bold text-zinc-400">${tr.effectParams.amount}</label>
                <input type="number" id="eff-param-glitch-shift" value="10" min="1" max="50" class="w-full bg-[#09090b] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-center">
            </div>
        `;
        setTimeout(() => {
            const slider = document.getElementById('eff-param-glitch-prob');
            const display = document.getElementById('eff-param-glitch-prob-val');
            if (slider && display) {
                slider.oninput = () => {
                    display.innerText = Math.round(slider.value * 100) + '%';
                    applyLiveEffect();
                };
            }
        }, 50);
    }

    const inputs = bodyEl.querySelectorAll('input, select');
    inputs.forEach(el => {
        el.addEventListener('input', applyLiveEffect);
        el.addEventListener('change', applyLiveEffect);
    });

    const modalContent = document.getElementById('effect-settings-content');
    if (modalContent && (!modalContent.style.left || modalContent.style.left === "")) {
        modalContent.style.left = `calc(50vw - 160px)`;
        modalContent.style.top = `calc(50vh - 180px)`;
    }

    applyLiveEffect();

    const cancelBtn = document.getElementById('btn-effect-cancel');
    cancelBtn.onclick = () => {
        if (effectBackupData && layers[activeLayerIndex]) {
            layers[activeLayerIndex].ctx.putImageData(effectBackupData, 0, 0);
            renderComposite();
        }
        effectBackupData = null;
        closeModal('modal-effect-settings');
    };

    applyBtn.onclick = () => {
        if (effectBackupData && layers[activeLayerIndex]) {
            const finalData = layers[activeLayerIndex].ctx.getImageData(0, 0, width, height);
            layers[activeLayerIndex].ctx.putImageData(effectBackupData, 0, 0);
            saveState();
            layers[activeLayerIndex].ctx.putImageData(finalData, 0, 0);
            renderComposite();
            updateActiveLayerPreview();
        }
        effectBackupData = null;
        closeModal('modal-effect-settings');
    };
    
    document.getElementById('modal-effect-settings').classList.remove('hidden');
}

function applyLiveEffect() {
    if (!effectBackupData || !layers[activeLayerIndex]) return;
    const layer = layers[activeLayerIndex];
    layer.ctx.putImageData(effectBackupData, 0, 0);

    if (activeEffectName === 'mirror') {
        const axis = document.getElementById('eff-param-axis').value;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tCtx = tempCanvas.getContext('2d');
        if (axis === 'horizontal') {
            tCtx.translate(width, 0);
            tCtx.scale(-1, 1);
        } else {
            tCtx.translate(0, height);
            tCtx.scale(1, -1);
        }
        tCtx.drawImage(layer.canvas, 0, 0);
        layer.ctx.clearRect(0, 0, width, height);
        layer.ctx.drawImage(tempCanvas, 0, 0);
    } 
    else if (activeEffectName === 'outline') {
        const color = document.getElementById('eff-param-color').value;
        const thick = parseInt(document.getElementById('eff-param-thick').value) || 1;
        const imgData = layer.ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const outlineData = new Uint8ClampedArray(data);
        const rgb = hexToRgb(color);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let i = (y * width + x) * 4;
                if (data[i + 3] === 0) {
                    let isOutline = false;
                    for (let dy = -thick; dy <= thick; dy++) {
                        for (let dx = -thick; dx <= thick; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nIdx = (ny * width + nx) * 4;
                                if (data[nIdx + 3] > 0) {
                                    isOutline = true;
                                    break;
                                }
                            }
                        }
                        if (isOutline) break;
                    }
                    if (isOutline) {
                        outlineData[i] = rgb.r;
                        outlineData[i + 1] = rgb.g;
                        outlineData[i + 2] = rgb.b;
                        outlineData[i + 3] = 255;
                    }
                }
            }
        }
        layer.ctx.putImageData(new ImageData(outlineData, width, height), 0, 0);
    } 
    else if (activeEffectName === 'dither') {
        const intensity = parseFloat(document.getElementById('eff-param-intensity').value);
        const imgData = layer.ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if ((x + y) % 2 === 0) {
                    let i = (y * width + x) * 4;
                    data[i + 3] = data[i + 3] * (1 - intensity);
                }
            }
        }
        layer.ctx.putImageData(imgData, 0, 0);
    } 
    else if (activeEffectName === 'rotate') {
        const angle = parseInt(document.getElementById('eff-param-angle').value) || 90;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.translate(width / 2, height / 2);
        tCtx.rotate(angle * Math.PI / 180);
        tCtx.drawImage(layer.canvas, -width / 2, -height / 2);
        layer.ctx.clearRect(0, 0, width, height);
        layer.ctx.drawImage(tempCanvas, 0, 0);
    } 
    else if (activeEffectName === 'brightness') {
        const amt = parseInt(document.getElementById('eff-param-brightness').value);
        const imgData = layer.ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                data[i] = Math.max(0, Math.min(255, data[i] + amt));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + amt));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + amt));
            }
        }
        layer.ctx.putImageData(imgData, 0, 0);
    } 
    else if (activeEffectName === 'cleanOrphans') {
        const minNeighbors = parseInt(document.getElementById('eff-param-neighbors').value) || 1;
        const imgData = layer.ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const result = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let i = (y * width + x) * 4;
                if (data[i + 3] > 0) {
                    let neighborsCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            let nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                if (data[(ny * width + nx) * 4 + 3] > 0) {
                                    neighborsCount++;
                                }
                            }
                        }
                    }
                    if (neighborsCount < minNeighbors) {
                        result[i + 3] = 0;
                    }
                }
            }
        }
        layer.ctx.putImageData(new ImageData(result, width, height), 0, 0);
    } 
    else if (activeEffectName === 'shadow') {
        const ox = parseInt(document.getElementById('eff-param-ox').value) || 1;
        const oy = parseInt(document.getElementById('eff-param-oy').value) || 1;
        const color = document.getElementById('eff-param-scolor').value;
        const opacity = parseFloat(document.getElementById('eff-param-sopacity').value);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(layer.canvas, ox, oy);
        tCtx.globalCompositeOperation = 'source-in';
        const rgb = hexToRgb(color);
        tCtx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
        tCtx.fillRect(0, 0, width, height);
        
        const backC = document.createElement('canvas');
        backC.width = width;
        backC.height = height;
        const bCtx = backC.getContext('2d');
        bCtx.drawImage(tempCanvas, 0, 0);
        bCtx.drawImage(layer.canvas, 0, 0);
        
        layer.ctx.clearRect(0, 0, width, height);
        layer.ctx.drawImage(backC, 0, 0);
    } 
    else if (activeEffectName === 'noise') {
        const noiseAmt = parseInt(document.getElementById('eff-param-noise').value);
        const imgData = layer.ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                const noise = (Math.random() - 0.5) * noiseAmt;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }
        layer.ctx.putImageData(imgData, 0, 0);
    } 
    else if (activeEffectName === 'simplify') {
        const step = parseInt(document.getElementById('eff-param-simplify').value) || 64;
        const imgData = layer.ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                data[i] = Math.round(data[i] / step) * step;
                data[i + 1] = Math.round(data[i + 1] / step) * step;
                data[i + 2] = Math.round(data[i + 2] / step) * step;
            }
        }
        layer.ctx.putImageData(imgData, 0, 0);
    } 
    else if (activeEffectName === 'glitch') {
        const prob = parseFloat(document.getElementById('eff-param-glitch-prob').value);
        const maxShift = parseInt(document.getElementById('eff-param-glitch-shift').value) || 10;
        const ctx = layer.ctx;
        for (let y = 0; y < height; y++) {
            if (Math.random() < prob) {
                const offset = Math.floor((Math.random() - 0.5) * maxShift * 2);
                const rowData = ctx.getImageData(0, y, width, 1);
                ctx.clearRect(0, y, width, 1);
                ctx.putImageData(rowData, offset, y);
            }
        }
    }
    renderComposite();
}

function _drawSinglePoint(ctx, x, y, color, size, isEraser, iM=false) {
    const offset = Math.floor(size / 2);
    const dither = document.getElementById('dither-mode').value;
    const shadingActive = document.getElementById('chk-shading-mode').checked;
    const shadingIntensity = parseInt(document.getElementById('shading-intensity').value) || 0;

    for (let ix = 0; ix < size; ix++) { 
        for (let iy = 0; iy < size; iy++) { 
            let px = Math.floor(x - offset + ix), py = Math.floor(y - offset + iy); 
            
            if (dither !== 'none' && !isEraser) {
                if (dither === 'checkerboard') {
                    if ((px + py) % 2 !== 0) continue;
                } else if (dither === 'stripes') {
                    if (py % 2 !== 0 || px % 2 !== 0) continue;
                } else if (dither === 'dots') {
                    if ((px % 4 !== 0) || (py % 4 !== 0)) continue;
                }
            }

            if (px >= 0 && px < width && py >= 0 && py < height) { 
                if (!hasSelection || (hasSelection && selectionMask[px + py * width])) { 
                    if (isEraser) { 
                        ctx.clearRect(px, py, 1, 1); 
                    } else { 
                        if (shadingActive) {
                            let currentPixel = ctx.getImageData(px, py, 1, 1).data;
                            if (currentPixel[3] > 0) {
                                let r = Math.max(0, Math.min(255, currentPixel[0] + shadingIntensity));
                                let g = Math.max(0, Math.min(255, currentPixel[1] + shadingIntensity));
                                let b = Math.max(0, Math.min(255, currentPixel[2] + shadingIntensity));
                                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                                ctx.fillRect(px, py, 1, 1);
                            }
                        } else {
                            ctx.globalAlpha = globalAlpha; 
                            ctx.fillStyle = color; 
                            ctx.fillRect(px, py, 1, 1); 
                            ctx.globalAlpha = 1.0; 
                        }
                    } 
                } 
            } 
        } 
    }
}

function drawPoint(ctx, x, y, color, size, isEraser = false, iM=false) { 
    _drawSinglePoint(ctx, x, y, color, size, isEraser, iM); 
    if (symOn) { 
        if (symDir === 'V') _drawSinglePoint(ctx, symX + (symX - x) - 1, y, color, size, isEraser, iM); 
        else _drawSinglePoint(ctx, x, symY + (symY - y) - 1, color, size, isEraser, iM); 
    } 
}

function drawLine(ctx, x0, y0, x1, y1, c, s, isE=false, iM=false) { 
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1, err = dx - dy; 
    while(true) { 
        drawPoint(ctx, x0, y0, c, s, isE, iM); 
        if (x0 === x1 && y0 === y1) break; 
        let e2 = 2 * err; 
        if (e2 > -dy) { err -= dy; x0 += sx; } 
        if (e2 < dx) { err += dx; y0 += sy; } 
    } 
}

function drawRectOutline(ctx, x0, y0, x1, y1, c, s, isE=false, iM=false) {
    let minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    for (let x = minX; x <= maxX; x++) { drawPoint(ctx, x, minY, c, s, isE, iM); drawPoint(ctx, x, maxY, c, s, isE, iM); }
    for (let y = minY + 1; y < maxY; y++) { drawPoint(ctx, minX, y, c, s, isE, iM); drawPoint(ctx, maxX, y, c, s, isE, iM); }
}

function drawCircle(ctx, xc, yc, r, c, s, isE=false, iM=false) {
    if (r === 0) { drawPoint(ctx, xc, yc, c, s, isE, iM); return; }
    let x = r, y = 0, P = 1 - r;
    while(x >= y) {
        drawPoint(ctx, xc + x, yc + y, c, s, isE, iM); drawPoint(ctx, xc + y, yc + x, c, s, isE, iM);
        drawPoint(ctx, xc - y, yc + x, c, s, isE, iM); drawPoint(ctx, xc - x, yc + y, c, s, isE, iM);
        drawPoint(ctx, xc - x, yc - y, c, s, isE, iM); drawPoint(ctx, xc - y, yc - x, c, s, isE, iM);
        drawPoint(ctx, xc + y, yc - x, c, s, isE, iM); drawPoint(ctx, xc + x, yc - y, c, s, isE, iM);
        y++; 
        if (P <= 0) { P = P + 2*y + 1; } 
        else { x--; P = P + 2*y - 2*x + 1; }
    }
}

function cancelSelection() {
    hasSelection = false;
    if (selectionMask) selectionMask.fill(0);
    selectionCtx.clearRect(0, 0, width, height);
    const tb = document.getElementById('selection-toolbar');
    if (tb) tb.classList.add('hidden');
    const btnModify = document.getElementById('btn-modify-sel');
    if (btnModify) btnModify.classList.add('hidden');
    const btnCommit = document.getElementById('btn-commit-tf');
    if (btnCommit) btnCommit.classList.add('hidden');
    isTransforming = false;
    renderComposite();
}

function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255
    } : { r: 0, g: 0, b: 0, a: 255 };
}

function updateStatusProjectMeta() {
    const statusSize = document.getElementById('status-size');
    const statusColorSpace = document.getElementById('status-color-space');
    if (statusSize) statusSize.innerText = `${width} x ${height} px`;
    if (statusColorSpace) statusColorSpace.innerText = colorMode;
}

function makeElementDraggable(el, handle) {
    if (!el || !handle) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function generateProjectData() {
    return {
        width,
        height,
        colorMode,
        layers: layers.map(l => ({
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            blendMode: l.blendMode,
            tintColor: l.tintColor,
            tintFactor: l.tintFactor,
            dataUrl: l.canvas.toDataURL()
        })),
        palette
    };
}

function saveNative() {
    const projectData = generateProjectData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `proyecto_${Date.now()}.pixvec`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Carga un archivo .pixvec existente
document.getElementById('file-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const projectData = JSON.parse(event.target.result);
            loadProjectData(projectData);
        } catch (err) {
            showMessage(currentLanguage === 'es' ? "Error al cargar el archivo." : "Error loading file.");
        }
    };
    reader.readAsText(file);
});

function loadProjectData(data) {
    if (!data || !data.width || !data.height) return;
    width = data.width;
    height = data.height;
    colorMode = data.colorMode || 'RGB';
    palette = data.palette || palette;

    [bgCanvas, displayCanvas, selectionCanvas, previewCanvas, uiCanvas].forEach(c => {
        c.width = width;
        c.height = height;
    });

    selectionMask = new Uint8Array(width * height);
    layers = [];
    layerCounter = 0;

    let loadedLayersCount = 0;
    data.layers.forEach((lData) => {
        const layer = createLayer(lData.name);
        layer.visible = lData.visible !== false;
        layer.opacity = lData.opacity !== undefined ? lData.opacity : 1.0;
        layer.blendMode = lData.blendMode || 'source-over';
        layer.tintColor = lData.tintColor || '#3b82f6';
        layer.tintFactor = lData.tintFactor !== undefined ? lData.tintFactor : 0.0;
        
        const img = new Image();
        img.onload = () => {
            layer.ctx.drawImage(img, 0, 0);
            loadedLayersCount++;
            if (loadedLayersCount === data.layers.length) {
                activeLayerIndex = layers.length - 1;
                renderLayersList();
                renderComposite();
                centerCanvas();
                updateStatusProjectMeta();
            }
        };
        img.src = lData.dataUrl;
        layers.push(layer);
    });
    cancelSelection();
    clearHistory();
}

// Modales de exportación PNG/JPG
let exportFormat = 'png';
function openExportModal(format) {
    exportFormat = format;
    document.getElementById('modal-export').classList.remove('hidden');
}

function confirmExport() {
    const scale = parseInt(document.getElementById('export-scale').value) || 1;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width * scale;
    exportCanvas.height = height * scale;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.imageSmoothingEnabled = false;

    layers.forEach(layer => {
        if (layer.visible) {
            exportCtx.globalAlpha = layer.opacity;
            exportCtx.globalCompositeOperation = layer.blendMode;
            
            if (layer.tintFactor && layer.tintFactor > 0) {
                let tempC = document.createElement('canvas');
                tempC.width = width;
                tempC.height = height;
                let tempCtx = tempC.getContext('2d');
                tempCtx.drawImage(layer.canvas, 0, 0);
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = layer.tintColor || '#3b82f6';
                tempCtx.globalAlpha = layer.tintFactor;
                tempCtx.fillRect(0, 0, width, height);
                exportCtx.drawImage(tempC, 0, 0, width, height, 0, 0, width * scale, height * scale);
            } else {
                exportCtx.drawImage(layer.canvas, 0, 0, width, height, 0, 0, width * scale, height * scale);
            }
        }
    });

    if (exportFormat === 'jpeg') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = exportCanvas.width;
        tempCanvas.height = exportCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(exportCanvas, 0, 0);
        exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.drawImage(tempCanvas, 0, 0);
    }

    const dataUrl = exportCanvas.toDataURL(`image/${exportFormat}`);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `pixelart_${Date.now()}.${exportFormat}`;
    a.click();
    
    closeModal('modal-export');
}

// Controladores de eventos del ratón
workspace.addEventListener('mousemove', (e) => {
    const pt = getCanvasMouse(e);
    const statusCoords = document.getElementById('status-coords');
    if (statusCoords) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
            statusCoords.innerText = `${pt.x}, ${pt.y} px`;
        } else {
            statusCoords.innerText = `---, --- px`;
        }
    }

    if (isPanning) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyTransform();
        return;
    }

    if (isLightDragging && activeLightRef) {
        const rect = displayCanvas.getBoundingClientRect();
        activeLightRef.x = Math.round((e.clientX - rect.left) / (rect.width / width));
        activeLightRef.y = Math.round((e.clientY - rect.top) / (rect.height / height));
        nativeRenderLightingEffect();
        return;
    }

    if (isTransforming && tfActiveHandle) {
        let dx = pt.rawX - tfStartX, dy = pt.rawY - tfStartY;
        if (tfActiveHandle === 'move') {
            tfX = tfInitX + dx;
            tfY = tfInitY + dy;
        } else if (tfActiveHandle === 'rot') {
            let cx = tfInitX + tfInitW/2, cy = tfInitY + tfInitH/2;
            let angle1 = Math.atan2(tfStartY - cy, tfStartX - cx);
            let angle2 = Math.atan2(pt.rawY - cy, pt.rawX - cx);
            tfAngle = tfInitAngle + (angle2 - angle1);
        } else {
            if (tfActiveHandle.includes('r')) tfW = tfInitW + dx;
            if (tfActiveHandle.includes('l')) { tfW = tfInitW - dx; tfX = tfInitX + dx; }
            if (tfActiveHandle.includes('b')) tfH = tfInitH + dy;
            if (tfActiveHandle.includes('t')) { tfH = tfInitH - dy; tfY = tfInitY + dy; }
        }
        renderComposite();
        return;
    }

    if (!isDrawing) return;

    const ctx = layers[activeLayerIndex].ctx;

    if (currentTool === 'pencil' || currentTool === 'eraser') {
        const pts = getBresenhamPoints(lastX, lastY, pt.x, pt.y);
        pts.forEach(p => {
            // Mitigación Anti-Jaggies en Tiempo Real (Novedad Pro Tools 2)
            if (document.getElementById('chk-anti-jaggies')?.checked && !isEraser && strokePoints.length > 0) {
                let lastPt = strokePoints[strokePoints.length - 1];
                if (strokePoints.length >= 2) {
                    let p0 = strokePoints[strokePoints.length - 2];
                    let p1 = lastPt;
                    let p2 = p;
                    // Detectar paso de esquina redundante
                    if ((p0.x === p1.x || p0.y === p1.y) && (p1.x === p2.x || p1.y === p2.y) && p0.x !== p2.x && p0.y !== p2.y) {
                        ctx.clearRect(p1.x, p1.y, 1, 1);
                        strokePoints.pop();
                    }
                }
            }
            strokePoints.push({x: p.x, y: p.y});
            drawPoint(ctx, p.x, p.y, currentColor, brushSize, currentTool === 'eraser', false);
        });
        lastX = pt.x;
        lastY = pt.y;
        renderComposite();
    } else if (currentTool === 'gradient' || currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle' || currentTool === 'rectSelect') {
        if (isoAssistOn && (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle')) {
            let snapped = snapToIsometric(startX, startY, pt.x, pt.y);
            lastX = snapped.x;
            lastY = snapped.y;
        } else {
            lastX = pt.x;
            lastY = pt.y;
        }
    } else if (currentTool === 'lassoSelect') {
        lassoPoints.push(pt);
    }
});

window.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        workspace.style.cursor = (currentTool === 'hand') ? 'grab' : 'crosshair';
    }
    if (isLightDragging) {
        isLightDragging = false;
    }
    if (isTransforming) {
        tfActiveHandle = null;
    }
    if (isDrawing) {
        isDrawing = false;
        const ctx = layers[activeLayerIndex].ctx;
        if (currentTool === 'gradient') {
            saveState();
            applyGradient(ctx, startX, startY, lastX, lastY);
            renderComposite();
            updateActiveLayerPreview();
        } else if (currentTool === 'line') {
            saveState();
            let finalX = lastX, finalY = lastY;
            if (isoAssistOn) {
                let snapped = snapToIsometric(startX, startY, lastX, lastY);
                finalX = snapped.x;
                finalY = snapped.y;
            }
            drawLine(ctx, startX, startY, finalX, finalY, currentColor, brushSize, false, false);
            renderComposite();
            updateActiveLayerPreview();
        } else if (currentTool === 'rect') {
            saveState();
            let finalX = lastX, finalY = lastY;
            if (isoAssistOn) {
                let snapped = snapToIsometric(startX, startY, lastX, lastY);
                finalX = snapped.x;
                finalY = snapped.y;
            }
            drawRectOutline(ctx, startX, startY, finalX, finalY, currentColor, brushSize, false, false);
            renderComposite();
            updateActiveLayerPreview();
        } else if (currentTool === 'circle') {
            saveState();
            let finalX = lastX, finalY = lastY;
            if (isoAssistOn) {
                let snapped = snapToIsometric(startX, startY, lastX, lastY);
                finalX = snapped.x;
                finalY = snapped.y;
            }
            let r = Math.round(Math.hypot(finalX - startX, finalY - startY));
            drawCircle(ctx, startX, startY, r, currentColor, brushSize, false, false);
            renderComposite();
            updateActiveLayerPreview();
        } else if (currentTool === 'rectSelect') {
            let rx = Math.min(startX, lastX), ry = Math.min(startY, lastY),
                rw = Math.abs(startX - lastX), rh = Math.abs(startY - lastY);
            if (rw > 0 && rh > 0) {
                if (!selectionMask) selectionMask = new Uint8Array(width * height);
                selectionMask.fill(0);
                for (let y = ry; y < ry + rh; y++) {
                    for (let x = rx; x < rx + rw; x++) {
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            selectionMask[y * width + x] = 1;
                        }
                    }
                }
                hasSelection = true;
                document.getElementById('selection-toolbar').classList.remove('hidden');
                document.getElementById('btn-modify-sel').classList.remove('hidden');
            } else {
                cancelSelection();
            }
            isRectSelecting = false;
        } else if (currentTool === 'lassoSelect') {
            if (lassoPoints.length > 2) {
                if (!selectionMask) selectionMask = new Uint8Array(width * height);
                selectionMask.fill(0);
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (isPointInPolygon({x, y}, lassoPoints)) {
                            selectionMask[y * width + x] = 1;
                        }
                    }
                }
                hasSelection = true;
                document.getElementById('selection-toolbar').classList.remove('hidden');
                document.getElementById('btn-modify-sel').classList.remove('hidden');
            } else {
                cancelSelection();
            }
            isLassoing = false;
            lassoPoints = [];
        } else if (currentTool === 'pencil' || currentTool === 'eraser') {
            updateActiveLayerPreview();
        }
    }
});

function isPointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

window.onload = () => { createNewProject(); init(); applyLanguage(); };
