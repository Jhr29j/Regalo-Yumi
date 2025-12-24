const album = document.querySelector('.album-container');
const fotosContainer = document.getElementById('fotos-container');
const videosContainer = document.getElementById('videos-container');
const selectorButtons = document.querySelectorAll('.selector-btn');

// Configuración optimizada
const config = {
    columnWidth: 220,
    gap: 25
};

let columns = 0;
let columnHeights = [];
let allPolaroids = [];
let allVideoPolaroids = [];
let isLoading = false;
let fotosCargadas = false;
let videosCargados = false;

// Cache para archivos ya verificados
const cache = {
    fotosExistentes: null,
    videosExistentes: null
};

// Observador optimizado
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            
            if (entry.target.classList.contains('video-polaroid')) {
                const video = entry.target.querySelector('video');
                if (video && video.paused) {
                    video.play().catch(() => {}); // Ignorar errores de autoplay
                }
            }
        }
    });
}, { 
    threshold: 0.15,
    rootMargin: '100px' // Cargar antes de que sean visibles
});

// Calcular columnas optimizado
function calcularColumnas() {
    const containerWidth = album.clientWidth;
    columns = Math.max(1, Math.floor(containerWidth / (config.columnWidth + config.gap)));
    columnHeights = new Array(columns).fill(0);
    return columns;
}

// ===============================
// ESTRATEGIA 1: CARGAR CON LISTA PREDEFINIDA
// ===============================

// Si sabes exactamente cuántas fotos y videos tienes, ponlos aquí:
const FOTOS_TOTAL = 148; // Cambia este número por el total REAL de fotos que tienes
const VIDEOS_TOTAL = 14; // Cambia este número por el total REAL de videos que tienes

// ===============================
// ESTRATEGIA 2: VERIFICACIÓN MÁS RÁPIDA
// ===============================

// Verificar archivos en paralelo con tiempo límite
async function verificarArchivosRapido(basePath, total, extension) {
    const existentes = [];
    const checks = [];
    
    // Verificar en paralelo (máximo 5 a la vez)
    for (let i = 1; i <= total; i++) {
        checks.push(verificarArchivoRapido(`${basePath}${i}${extension}`).then(existe => {
            if (existe) existentes.push(i);
        }));
        
        // Limitar concurrencia para no sobrecargar
        if (checks.length >= 5) {
            await Promise.all(checks);
            checks.length = 0; // Resetear array
        }
    }
    
    // Esperar checks restantes
    if (checks.length > 0) {
        await Promise.all(checks);
    }
    
    return existentes.sort((a, b) => a - b);
}

function verificarArchivoRapido(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        
        // Timeout rápido
        setTimeout(() => resolve(false), 500);
    });
}

// ===============================
// ESTRATEGIA 3: CARGAR PROGRESIVAMENTE CON PLACEHOLDERS
// ===============================

// Crear placeholder inmediato
function crearPlaceholderPolaroid(index, esVideo = false) {
    const polaroid = document.createElement('div');
    polaroid.className = esVideo ? 'video-polaroid placeholder' : 'polaroid placeholder';
    
    const rotationPattern = [-2, 1, 0, -1, 2];
    const rotation = rotationPattern[index % rotationPattern.length];
    polaroid.style.setProperty('--rotate', `${rotation}deg`);
    
    polaroid.style.width = `${config.columnWidth}px`;
    polaroid.style.height = `${config.columnWidth}px`; // Tamaño cuadrado inicial
    
    // Mostrar número para debugging
    polaroid.setAttribute('data-index', index);
    
    return {
        element: polaroid,
        width: config.columnWidth,
        height: config.columnWidth,
        aspectRatio: 1,
        index: index,
        isPlaceholder: true,
        esVideo: esVideo
    };
}

// Crear polaroid real para foto
function crearPolaroidReal(imgSrc, imgIndex) {
    return new Promise((resolve) => {
        const img = new Image();
        img.loading = 'lazy';
        img.decoding = 'async';
        
        img.onload = function() {
            const polaroid = document.createElement('div');
            polaroid.className = 'polaroid';
            
            const rotationPattern = [-2, 1, 0, -1, 2];
            const rotation = rotationPattern[imgIndex % rotationPattern.length];
            polaroid.style.setProperty('--rotate', `${rotation}deg`);
            
            const aspectRatio = this.naturalHeight / this.naturalWidth;
            const width = config.columnWidth;
            const height = width * aspectRatio + 25;
            
            const imgElement = document.createElement('img');
            imgElement.src = imgSrc;
            imgElement.alt = `Recuerdo ${imgIndex}`;
            imgElement.loading = 'lazy';
            imgElement.decoding = 'async';
            
            polaroid.appendChild(imgElement);
            
            resolve({
                element: polaroid,
                width: width,
                height: height,
                aspectRatio: aspectRatio,
                index: imgIndex,
                isPlaceholder: false
            });
        };
        
        img.onerror = () => {
            // Si falla, mantener el placeholder
            resolve(null);
        };
        
        img.src = imgSrc;
    });
}

// Crear video polaroid real
function crearVideoPolaroidReal(videoSrc, videoIndex) {
    return new Promise((resolve) => {
        const videoPolaroid = document.createElement('div');
        videoPolaroid.className = 'video-polaroid';
        
        const rotationPattern = [-2, 1, 0, -1, 2];
        const rotation = rotationPattern[videoIndex % rotationPattern.length];
        videoPolaroid.style.setProperty('--rotate', `${rotation}deg`);
        
        const videoElement = document.createElement('video');
        videoElement.src = videoSrc;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.preload = 'metadata';
        videoElement.controls = false;
        videoElement.loading = 'lazy';
        
        videoPolaroid.appendChild(videoElement);
        
        const videoData = {
            element: videoPolaroid,
            videoElement: videoElement,
            index: videoIndex,
            isPlaceholder: false
        };
        
        videoElement.addEventListener('loadedmetadata', function() {
            if (this.videoWidth && this.videoHeight) {
                const aspectRatio = this.videoHeight / this.videoWidth;
                const width = config.columnWidth;
                const height = width * aspectRatio + 25;
                
                videoData.width = width;
                videoData.height = height;
                videoData.aspectRatio = aspectRatio;
                
                resolve(videoData);
            }
        });
        
        videoElement.onerror = () => {
            // Si falla, mantener el placeholder
            resolve(null);
        };
        
        // Timeout de seguridad
        setTimeout(() => {
            if (!videoData.width) {
                videoData.width = config.columnWidth;
                videoData.height = config.columnWidth * 0.75 + 25;
                videoData.aspectRatio = 0.75;
                resolve(videoData);
            }
        }, 1000);
    });
}

// ===============================
// ESTRATEGIA 4: CARGAR EN LOTE INTELIGENTE
// ===============================

// Cargar fotos optimizado
async function cargarFotosOptimizado() {
    if (isLoading || fotosCargadas) return;
    
    isLoading = true;
    allPolaroids = [];
    album.innerHTML = '';
    
    // Mostrar loader inmediato
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.textContent = 'Preparando tus recuerdos... 💜';
    album.appendChild(loader);
    
    try {
        // PASO 1: Usar cache o verificar rápidamente
        let fotosEncontradas;
        
        if (cache.fotosExistentes) {
            fotosEncontradas = cache.fotosExistentes;
            console.log('✅ Usando fotos de cache');
        } else {
            loader.textContent = 'Buscando fotos... 💜';
            fotosEncontradas = await verificarArchivosRapido('assets/img/foto', FOTOS_TOTAL, '.jpg');
            cache.fotosExistentes = fotosEncontradas;
            console.log(`✅ Fotos encontradas: ${fotosEncontradas.length}`);
        }
        
        if (fotosEncontradas.length === 0) {
            loader.textContent = 'No se encontraron fotos';
            isLoading = false;
            return;
        }
        
        // PASO 2: Crear placeholders inmediatamente para layout
        loader.textContent = 'Organizando fotos... 💜';
        
        fotosEncontradas.forEach(index => {
            allPolaroids.push(crearPlaceholderPolaroid(index, false));
        });
        
        // Organizar placeholders inmediatamente
        organizarMasonryFotos();
        
        // Quitar loader después de mostrar placeholders
        setTimeout(() => {
            if (loader.parentElement) {
                loader.remove();
            }
        }, 500);
        
        // PASO 3: Cargar imágenes reales en segundo plano
        setTimeout(async () => {
            const batchSize = 3; // Cargar de a 3 para no sobrecargar
            const total = fotosEncontradas.length;
            
            for (let i = 0; i < total; i += batchSize) {
                const batch = fotosEncontradas.slice(i, i + batchSize);
                const promesas = batch.map(index => 
                    crearPolaroidReal(`assets/img/foto${index}.jpg`, index)
                );
                
                const resultados = await Promise.allSettled(promesas);
                
                // Reemplazar placeholders con imágenes reales
                resultados.forEach((resultado, batchIndex) => {
                    if (resultado.status === 'fulfilled' && resultado.value) {
                        const realIndex = i + batchIndex;
                        const placeholderIndex = allPolaroids.findIndex(p => p.index === batch[batchIndex]);
                        
                        if (placeholderIndex !== -1) {
                            // Reemplazar placeholder con imagen real
                            const placeholder = allPolaroids[placeholderIndex].element;
                            const realPolaroid = resultado.value.element;
                            
                            // Copiar posición del placeholder
                            realPolaroid.style.left = placeholder.style.left;
                            realPolaroid.style.top = placeholder.style.top;
                            realPolaroid.style.width = placeholder.style.width;
                            realPolaroid.style.height = resultado.value.height + 'px';
                            
                            // Reemplazar en el DOM
                            placeholder.parentElement.replaceChild(realPolaroid, placeholder);
                            
                            // Actualizar en el array
                            allPolaroids[placeholderIndex] = resultado.value;
                            
                            // Observar para animación
                            observer.observe(realPolaroid);
                        }
                    }
                });
                
                // Reorganizar después de cada lote
                if (i % 9 === 0) { // Cada 3 lotes
                    organizarMasonryFotos();
                }
                
                // Pequeña pausa para no bloquear el UI
                if (i % 15 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            
            // Organización final
            organizarMasonryFotos();
            fotosCargadas = true;
            console.log(`🎉 Fotos cargadas completamente: ${allPolaroids.length}`);
            
        }, 300); // Esperar un poco antes de empezar a cargar
        
    } catch (error) {
        console.error('Error cargando fotos:', error);
        if (loader.parentElement) {
            loader.textContent = 'Error cargando las fotos';
        }
    }
    
    isLoading = false;
}

// Cargar videos optimizado
async function cargarVideosOptimizado() {
    if (isLoading || videosCargados) return;
    
    isLoading = true;
    allVideoPolaroids = [];
    videosContainer.innerHTML = '';
    
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.textContent = 'Preparando videos... 💜';
    videosContainer.appendChild(loader);
    
    try {
        let videosEncontrados;
        
        if (cache.videosExistentes) {
            videosEncontrados = cache.videosExistentes;
            console.log('✅ Usando videos de cache');
        } else {
            loader.textContent = 'Buscando videos... 💜';
            videosEncontrados = await verificarArchivosRapido('assets/videos/video', VIDEOS_TOTAL, '.mp4');
            cache.videosExistentes = videosEncontrados;
            console.log(`✅ Videos encontrados: ${videosEncontrados.length}`);
        }
        
        if (videosEncontrados.length === 0) {
            loader.textContent = 'No se encontraron videos';
            isLoading = false;
            return;
        }
        
        // Crear placeholders inmediatamente
        videosEncontrados.forEach(index => {
            allVideoPolaroids.push(crearPlaceholderPolaroid(index, true));
        });
        
        // Organizar placeholders
        organizarMasonryVideos();
        
        // Quitar loader
        setTimeout(() => {
            if (loader.parentElement) {
                loader.remove();
            }
        }, 500);
        
        // Cargar videos reales en segundo plano
        setTimeout(async () => {
            for (let i = 0; i < videosEncontrados.length; i++) {
                const index = videosEncontrados[i];
                const videoData = await crearVideoPolaroidReal(`assets/videos/video${index}.mp4`, index);
                
                if (videoData) {
                    // Reemplazar placeholder
                    const placeholderIndex = allVideoPolaroids.findIndex(v => v.index === index);
                    if (placeholderIndex !== -1) {
                        const placeholder = allVideoPolaroids[placeholderIndex].element;
                        const realVideo = videoData.element;
                        
                        // Copiar posición
                        realVideo.style.left = placeholder.style.left;
                        realVideo.style.top = placeholder.style.top;
                        realVideo.style.width = placeholder.style.width;
                        realVideo.style.height = videoData.height + 'px';
                        
                        placeholder.parentElement.replaceChild(realVideo, placeholder);
                        allVideoPolaroids[placeholderIndex] = videoData;
                        observer.observe(realVideo);
                    }
                }
                
                // Pequeña pausa entre videos
                if (i % 2 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            organizarMasonryVideos();
            videosCargados = true;
            console.log(`🎉 Videos cargados: ${allVideoPolaroids.length}`);
            
        }, 300);
        
    } catch (error) {
        console.error('Error cargando videos:', error);
        if (loader.parentElement) {
            loader.textContent = 'Error cargando los videos';
        }
    }
    
    isLoading = false;
}

// ===============================
// FUNCIONES DE ORGANIZACIÓN (MANTENIDAS)
// ===============================

function organizarMasonryFotos() {
    if (allPolaroids.length === 0) return;
    
    calcularColumnas();
    const containerWidth = album.clientWidth;
    const totalGapWidth = (columns - 1) * config.gap;
    const availableWidth = containerWidth - totalGapWidth;
    const actualColumnWidth = availableWidth / columns;
    
    columnHeights.fill(0);
    
    // Ordenar por índice
    allPolaroids.sort((a, b) => a.index - b.index);
    
    allPolaroids.forEach(polaroidData => {
        const polaroid = polaroidData.element;
        const height = polaroidData.isPlaceholder ? 
            config.columnWidth : 
            polaroidData.height * (actualColumnWidth / config.columnWidth);
        
        let minHeight = Math.min(...columnHeights);
        let columnIndex = columnHeights.indexOf(minHeight);
        
        const x = columnIndex * (actualColumnWidth + config.gap);
        const y = columnHeights[columnIndex];
        
        polaroid.style.width = `${actualColumnWidth}px`;
        polaroid.style.height = `${height}px`;
        polaroid.style.left = `${x}px`;
        polaroid.style.top = `${y}px`;
        
        if (!polaroid.parentElement) {
            album.appendChild(polaroid);
            if (!polaroidData.isPlaceholder) {
                observer.observe(polaroid);
            }
        }
        
        columnHeights[columnIndex] += height + config.gap;
    });
    
    const maxHeight = Math.max(...columnHeights);
    album.style.height = `${maxHeight + 50}px`;
}

function organizarMasonryVideos() {
    if (allVideoPolaroids.length === 0) return;
    
    const videosColumns = Math.max(1, Math.floor(videosContainer.clientWidth / (config.columnWidth + config.gap)));
    const videosColumnHeights = new Array(videosColumns).fill(0);
    
    const containerWidth = videosContainer.clientWidth;
    const totalGapWidth = (videosColumns - 1) * config.gap;
    const availableWidth = containerWidth - totalGapWidth;
    const actualColumnWidth = availableWidth / videosColumns;
    
    // Ordenar por índice
    allVideoPolaroids.sort((a, b) => a.index - b.index);
    
    allVideoPolaroids.forEach(videoData => {
        const videoPolaroid = videoData.element;
        
        const aspectRatio = videoData.isPlaceholder ? 1 : (videoData.aspectRatio || 0.75);
        const height = actualColumnWidth * aspectRatio + 25;
        
        videoPolaroid.style.width = `${actualColumnWidth}px`;
        videoPolaroid.style.height = `${height}px`;
    });
    
    allVideoPolaroids.forEach(videoData => {
        const videoPolaroid = videoData.element;
        const aspectRatio = videoData.isPlaceholder ? 1 : (videoData.aspectRatio || 0.75);
        const height = actualColumnWidth * aspectRatio + 25;
        
        let minHeight = Math.min(...videosColumnHeights);
        let columnIndex = videosColumnHeights.indexOf(minHeight);
        
        const x = columnIndex * (actualColumnWidth + config.gap);
        const y = videosColumnHeights[columnIndex];
        
        videoPolaroid.style.left = `${x}px`;
        videoPolaroid.style.top = `${y}px`;
        
        if (!videoPolaroid.parentElement) {
            videosContainer.appendChild(videoPolaroid);
            if (!videoData.isPlaceholder) {
                observer.observe(videoPolaroid);
            }
        }
        
        videosColumnHeights[columnIndex] += height + config.gap;
    });
    
    const maxHeight = Math.max(...videosColumnHeights);
    videosContainer.style.height = `${maxHeight + 50}px`;
}

// ===============================
// EVENT HANDLERS Y INICIALIZACIÓN
// ===============================

selectorButtons.forEach(button => {
    button.addEventListener('click', function() {
        const type = this.getAttribute('data-type');
        
        selectorButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        if (type === 'fotos') {
            fotosContainer.style.display = 'block';
            videosContainer.style.display = 'none';
            
            if (!fotosCargadas) {
                cargarFotosOptimizado();
            } else {
                organizarMasonryFotos();
            }
        } else if (type === 'videos') {
            fotosContainer.style.display = 'none';
            videosContainer.style.display = 'block';
            
            if (!videosCargados) {
                cargarVideosOptimizado();
            } else {
                organizarMasonryVideos();
            }
        }
    });
});

// Inicialización optimizada
document.addEventListener('DOMContentLoaded', function() {
    // Navegación
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            if (page !== window.location.pathname.split('/').pop()) {
                window.location.href = page;
            }
        });
    });
    
    // Cargar fotos inmediatamente (optimizado)
    calcularColumnas();
    cargarFotosOptimizado();
    
    // Resize optimizado
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (fotosContainer.style.display !== 'none') {
                organizarMasonryFotos();
            }
            if (videosContainer.style.display !== 'none') {
                organizarMasonryVideos();
            }
        }, 150);
    });
});