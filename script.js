const album = document.querySelector('.album-container');
const totalFotos = 150;
let index = 1;
let isLoading = false;
let todasLasImagenesCargadas = false;

// Configuración
const config = {
    columnWidth: 220,
    gap: 25
};

let columns = 0;
let columnHeights = [];
let allPolaroids = [];

// ===============================
// Elemento loader
// ===============================
const loader = document.createElement('div');
loader.className = 'loader';
loader.textContent = 'Cargando tus recuerdos... 💜';
album.parentElement.insertBefore(loader, album);

// ===============================
// Intersection Observer
// ===============================
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('show');
                }, 50);
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.1 }
);

// ===============================
// Calcular número de columnas
// ===============================
function calcularColumnas() {
    const containerWidth = album.clientWidth;
    columns = Math.max(1, Math.floor(containerWidth / (config.columnWidth + config.gap)));
    columnHeights = new Array(columns).fill(0);
    return columns;
}

// ===============================
// Verificar si una imagen existe
// ===============================
function verificarImagenExiste(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// ===============================
// Encontrar el número real de fotos disponibles
// ===============================
async function encontrarTotalFotosReales() {
    console.log('Buscando fotos disponibles...');
    let fotosReales = 0;
    
    // Verificar en lotes
    for (let i = 1; i <= totalFotos; i += 10) {
        const promesas = [];
        for (let j = i; j < i + 10 && j <= totalFotos; j++) {
            promesas.push(verificarImagenExiste(`assets/img/foto${j}.jpg`));
        }
        
        const resultados = await Promise.all(promesas);
        const existentes = resultados.filter(existe => existe).length;
        fotosReales += existentes;
        
        if (existentes < 10) break; // Si hay menos de 10 en un lote, probablemente no hay más
    }
    
    console.log(`Fotos encontradas: ${fotosReales}`);
    return fotosReales;
}

// ===============================
// Crear y agregar una imagen
// ===============================
function crearPolaroid(imgSrc, imgIndex) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
            const polaroid = document.createElement('div');
            polaroid.className = 'polaroid';
            
            // Rotación aleatoria
            const rotation = Math.random() * 8 - 4;
            polaroid.style.setProperty('--rotate', `${rotation}deg`);
            
            // Calcular dimensiones
            const aspectRatio = this.naturalHeight / this.naturalWidth;
            const width = config.columnWidth;
            const height = width * aspectRatio + 25; // +25 por padding
            
            // Crear estructura
            const imgElement = document.createElement('img');
            imgElement.src = imgSrc;
            imgElement.alt = `Recuerdo ${imgIndex}`;
            imgElement.loading = 'lazy';
            
            polaroid.appendChild(imgElement);
            polaroid.dataset.width = width;
            polaroid.dataset.height = height;
            polaroid.dataset.aspect = aspectRatio;
            
            // Guardar datos
            const polaroidData = {
                element: polaroid,
                width: width,
                height: height,
                aspectRatio: aspectRatio,
                index: imgIndex,
                loaded: true
            };
            
            allPolaroids.push(polaroidData);
            resolve(polaroidData);
        };
        
        img.onerror = function() {
            console.warn(`No se pudo cargar: ${imgSrc}`);
            resolve(null); // Devuelve null si no se pudo cargar
        };
        
        img.src = imgSrc;
    });
}

// ===============================
// Organizar imágenes en masonry
// ===============================
function organizarMasonry() {
    if (allPolaroids.length === 0) return;
    
    // Recalcular columnas
    calcularColumnas();
    const containerWidth = album.clientWidth;
    const totalGapWidth = (columns - 1) * config.gap;
    const availableWidth = containerWidth - totalGapWidth;
    const actualColumnWidth = availableWidth / columns;
    
    // Resetear alturas
    columnHeights = new Array(columns).fill(0);
    
    // Organizar cada polaroid (solo las cargadas)
    const polaroidsCargadas = allPolaroids.filter(p => p.loaded);
    
    polaroidsCargadas.forEach(polaroidData => {
        const polaroid = polaroidData.element;
        const height = polaroidData.height * (actualColumnWidth / config.columnWidth);
        
        // Encontrar columna más baja
        let minHeight = Math.min(...columnHeights);
        let columnIndex = columnHeights.indexOf(minHeight);
        
        // Calcular posición
        const x = columnIndex * (actualColumnWidth + config.gap);
        const y = columnHeights[columnIndex];
        
        // Aplicar posición y tamaño
        polaroid.style.width = `${actualColumnWidth}px`;
        polaroid.style.height = `${height}px`;
        polaroid.style.left = `${x}px`;
        polaroid.style.top = `${y}px`;
        
        // Agregar al DOM si no está
        if (!polaroid.parentElement) {
            album.appendChild(polaroid);
            observer.observe(polaroid);
        }
        
        // Actualizar altura de la columna
        columnHeights[columnIndex] += height + config.gap;
    });
    
    // Actualizar altura del contenedor
    const maxHeight = Math.max(...columnHeights);
    album.style.height = `${maxHeight + 50}px`; // +50px de margen
    
    // Ocultar loader si tenemos imágenes
    if (polaroidsCargadas.length > 0) {
        loader.classList.add('hidden');
    }
    
    console.log(`Organizadas ${polaroidsCargadas.length} imágenes en ${columns} columnas`);
}

// ===============================
// Cargar TODAS las imágenes disponibles
// ===============================
async function cargarTodasLasImagenes() {
    if (isLoading) return;
    
    isLoading = true;
    loader.textContent = 'Cargando todos tus recuerdos... 💜';
    
    // Encontrar cuántas fotos realmente existen
    const fotosReales = await encontrarTotalFotosReales();
    
    if (fotosReales === 0) {
        loader.textContent = 'No se encontraron imágenes en la carpeta assets/img/';
        isLoading = false;
        return;
    }
    
    console.log(`Cargando ${fotosReales} imágenes...`);
    
    // Cargar TODAS las imágenes en lotes para no bloquear el navegador
    const lotes = [];
    const imagenesPorLote = 15;
    
    for (let i = 1; i <= fotosReales; i += imagenesPorLote) {
        const lote = [];
        for (let j = i; j < i + imagenesPorLote && j <= fotosReales; j++) {
            lote.push(crearPolaroid(`assets/img/foto${j}.jpg`, j));
        }
        lotes.push(lote);
    }
    
    // Procesar cada lote
    let imagenesCargadas = 0;
    
    for (let i = 0; i < lotes.length; i++) {
        const resultados = await Promise.all(lotes[i]);
        imagenesCargadas += resultados.filter(r => r !== null).length;
        
        // Actualizar progreso
        loader.textContent = `Cargando recuerdos... ${imagenesCargadas}/${fotosReales} 💜`;
        
        // Organizar las imágenes después de cada lote
        if (i === 0 || i % 2 === 0) { // Organizar más frecuentemente
            organizarMasonry();
        }
        
        // Pequeña pausa para no bloquear el navegador
        if (i < lotes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Organización final
    organizarMasonry();
    
    // Actualizar loader
    if (imagenesCargadas > 0) {
        loader.textContent = `¡${imagenesCargadas} recuerdos cargados! 💜`;
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 1500);
    } else {
        loader.textContent = 'No se pudieron cargar las imágenes. Verifica la carpeta assets/img/';
    }
    
    todasLasImagenesCargadas = true;
    isLoading = false;
    
    console.log(`Carga completada: ${imagenesCargadas} imágenes cargadas`);
}

// ===============================
// Cargar imágenes progresivamente (alternativa)
// ===============================
async function cargarImagenesProgresivamente(cantidadInicial = 20) {
    if (isLoading) return;
    
    isLoading = true;
    
    // Primero, encontrar cuántas fotos existen
    const fotosReales = await encontrarTotalFotosReales();
    
    if (fotosReales === 0) {
        loader.textContent = 'No se encontraron imágenes. Verifica la carpeta assets/img/';
        isLoading = false;
        return;
    }
    
    // Cargar imágenes iniciales
    const promesasIniciales = [];
    const cargarHasta = Math.min(index + cantidadInicial - 1, fotosReales);
    
    for (let i = index; i <= cargarHasta; i++) {
        promesasIniciales.push(crearPolaroid(`assets/img/foto${i}.jpg`, i));
        index++;
    }
    
    const resultados = await Promise.all(promesasIniciales);
    const cargadas = resultados.filter(r => r !== null).length;
    
    // Organizar inmediatamente
    organizarMasonry();
    
    loader.textContent = cargadas > 0 
        ? `Cargadas ${cargadas} imágenes. Desplázate para cargar más...` 
        : 'No se pudieron cargar imágenes.';
    
    setTimeout(() => {
        if (cargadas > 0) {
            loader.classList.add('hidden');
        }
    }, 1000);
    
    isLoading = false;
    return cargadas;
}

// ===============================
// Scroll infinito
// ===============================
async function checkScroll() {
    if (isLoading || todasLasImagenesCargadas || index > totalFotos) return;
    
    const scrollBottom = window.innerHeight + window.scrollY;
    const containerBottom = album.offsetTop + album.offsetHeight;
    
    if (scrollBottom > containerBottom - 500) {
        await cargarImagenesProgresivamente(10);
        organizarMasonry();
    }
}

// ===============================
// Inicialización
// ===============================
async function inicializar() {
    console.log('Inicializando galería...');
    
    // Calcular columnas
    calcularColumnas();
    
    // OPCIÓN 1: Cargar TODAS las imágenes de una vez
    // await cargarTodasLasImagenes();
    
    // OPCIÓN 2: Cargar progresivamente
    await cargarImagenesProgresivamente(25); // Carga 25 imágenes iniciales
    
    // Configurar eventos
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            organizarMasonry();
        }, 200);
    });
    
    // Scroll infinito
    let scrollTimer;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            requestAnimationFrame(checkScroll);
        }, 100);
    });
    
    // También cargar más después de un tiempo
    setTimeout(async () => {
        if (!todasLasImagenesCargadas && index < 50) {
            await cargarImagenesProgresivamente(15);
        }
    }, 2000);
}

// ===============================
// Iniciar
// ===============================
document.addEventListener('DOMContentLoaded', inicializar);

// Forzar reorganización después de la carga completa
window.addEventListener('load', () => {
    setTimeout(() => {
        if (allPolaroids.length > 0) {
            organizarMasonry();
        }
    }, 1000);
});