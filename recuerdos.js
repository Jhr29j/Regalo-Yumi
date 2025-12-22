const album = document.querySelector('.album-container');
const fotosContainer = document.getElementById('fotos-container');
const videosContainer = document.getElementById('videos-container');
const selectorButtons = document.querySelectorAll('.selector-btn');

// Configuración
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

// Observador para animaciones
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('show');
                
                // Reproducir video automáticamente si está en pantalla
                if (entry.target.classList.contains('video-polaroid')) {
                    const video = entry.target.querySelector('video');
                    if (video) {
                        if (video.paused) {
                            video.play().catch(e => {
                                console.log("Autoplay bloqueado");
                            });
                        }
                    }
                }
            }, 100);
        } else {
            // Pausar video cuando sale de pantalla
            if (entry.target.classList.contains('video-polaroid')) {
                const video = entry.target.querySelector('video');
                if (video && !video.paused) {
                    video.pause();
                }
            }
        }
    });
}, { threshold: 0.3 });

// Calcular columnas
function calcularColumnas() {
    const containerWidth = album.clientWidth;
    columns = Math.max(1, Math.floor(containerWidth / (config.columnWidth + config.gap)));
    columnHeights = new Array(columns).fill(0);
    return columns;
}

// Crear polaroid para foto (con rotación determinista basada en el índice)
function crearPolaroid(imgSrc, imgIndex) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
            const polaroid = document.createElement('div');
            polaroid.className = 'polaroid';
            
            // Rotación determinista basada en el índice (no aleatoria)
            // Patrón: -2°, 1°, 0°, -1°, 2°, -2°, 1°, etc.
            const rotationPattern = [-2, 1, 0, -1, 2, -2, 1, 0, -1, 2];
            const rotation = rotationPattern[imgIndex % rotationPattern.length];
            polaroid.style.setProperty('--rotate', `${rotation}deg`);
            
            const aspectRatio = this.naturalHeight / this.naturalWidth;
            const width = config.columnWidth;
            const height = width * aspectRatio + 25;
            
            const imgElement = document.createElement('img');
            imgElement.src = imgSrc;
            imgElement.alt = `Recuerdo ${imgIndex}`;
            imgElement.loading = 'lazy';
            
            polaroid.appendChild(imgElement);
            
            const polaroidData = {
                element: polaroid,
                width: width,
                height: height,
                aspectRatio: aspectRatio,
                index: imgIndex // Guardamos el índice para ordenar
            };
            
            allPolaroids.push(polaroidData);
            resolve(polaroidData);
        };
        
        img.onerror = () => resolve(null);
        
        img.src = imgSrc;
    });
}

// Crear controles personalizados para video
function crearControlesVideo(videoElement, videoPolaroid) {
    const controlsOverlay = document.createElement('div');
    controlsOverlay.className = 'video-controls-overlay';
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'control-btn play-pause-btn';
    playPauseBtn.innerHTML = '⏸️';
    
    const muteBtn = document.createElement('button');
    muteBtn.className = 'control-btn mute-btn';
    muteBtn.innerHTML = '🔇';
    
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'control-btn fullscreen-btn';
    fullscreenBtn.innerHTML = '⛶';
    
    controlsOverlay.appendChild(playPauseBtn);
    controlsOverlay.appendChild(muteBtn);
    controlsOverlay.appendChild(fullscreenBtn);
    
    playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (videoElement.paused) {
            videoElement.play();
            playPauseBtn.innerHTML = '⏸️';
        } else {
            videoElement.pause();
            playPauseBtn.innerHTML = '▶️';
        }
    });
    
    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        videoElement.muted = !videoElement.muted;
        muteBtn.innerHTML = videoElement.muted ? '🔇' : '🔊';
    });
    
    fullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.webkitRequestFullscreen) {
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.mozRequestFullScreen) {
            videoElement.mozRequestFullScreen();
        }
    });
    
    videoElement.addEventListener('play', () => {
        playPauseBtn.innerHTML = '⏸️';
    });
    
    videoElement.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '▶️';
    });
    
    videoPolaroid.addEventListener('mouseenter', () => {
        controlsOverlay.style.opacity = '1';
    });
    
    videoPolaroid.addEventListener('mouseleave', () => {
        controlsOverlay.style.opacity = '0';
    });
    
    return controlsOverlay;
}

// Crear polaroid para video (con rotación determinista)
function crearVideoPolaroid(videoSrc, videoIndex) {
    return new Promise((resolve) => {
        const videoPolaroid = document.createElement('div');
        videoPolaroid.className = 'video-polaroid';
        
        // Rotación determinista basada en el índice (no aleatoria)
        // Mismo patrón que las fotos para consistencia
        const rotationPattern = [-2, 1, 0, -1, 2, -2, 1, 0, -1, 2];
        const rotation = rotationPattern[videoIndex % rotationPattern.length];
        videoPolaroid.style.setProperty('--rotate', `${rotation}deg`);
        
        const videoElement = document.createElement('video');
        videoElement.src = videoSrc;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.preload = "metadata";
        videoElement.controls = false;
        videoElement.style.width = "100%";
        videoElement.style.height = "auto";
        videoElement.style.maxHeight = "500px";
        videoElement.style.objectFit = "contain";
        
        const videoWrapper = document.createElement('div');
        videoWrapper.style.width = "100%";
        videoWrapper.style.height = "100%";
        videoWrapper.style.overflow = "hidden";
        videoWrapper.style.display = "flex";
        videoWrapper.style.alignItems = "center";
        videoWrapper.style.justifyContent = "center";
        videoWrapper.style.position = "relative";
        
        videoWrapper.appendChild(videoElement);
        videoPolaroid.appendChild(videoWrapper);
        
        const controls = crearControlesVideo(videoElement, videoPolaroid);
        videoWrapper.appendChild(controls);
        
        const videoData = {
            element: videoPolaroid,
            videoElement: videoElement,
            index: videoIndex
        };
        
        videoElement.addEventListener('loadedmetadata', function() {
            if (this.videoWidth && this.videoHeight) {
                videoData.naturalWidth = this.videoWidth;
                videoData.naturalHeight = this.videoHeight;
                videoData.aspectRatio = this.videoHeight / this.videoWidth;
                
                const width = config.columnWidth;
                const height = width * videoData.aspectRatio + 25;
                
                videoData.width = width;
                videoData.height = height;
                
                allVideoPolaroids.push(videoData);
                resolve(videoData);
                
                if (isElementInViewport(videoPolaroid)) {
                    videoElement.play().catch(e => {
                        console.log("Autoplay bloqueado");
                    });
                }
            }
        });
        
        videoElement.onerror = () => {
            console.error(`Error cargando video: ${videoSrc}`);
            resolve(null);
        };
        
        setTimeout(() => {
            if (!videoData.width) {
                videoData.width = config.columnWidth;
                videoData.height = config.columnWidth * 0.75 + 25;
                videoData.aspectRatio = 0.75;
                
                allVideoPolaroids.push(videoData);
                resolve(videoData);
            }
        }, 3000);
    });
}

// Verificar si elemento está en viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Función para ordenar los polaroids por índice
function ordenarPolaroidsPorIndice(polaroidsArray) {
    return polaroidsArray.sort((a, b) => {
        // Ordenar por índice numérico
        return a.index - b.index;
    });
}

// Organizar masonry para fotos (manteniendo orden)
function organizarMasonryFotos() {
    if (allPolaroids.length === 0) return;
    
    // Ordenar las fotos por índice antes de organizarlas
    allPolaroids = ordenarPolaroidsPorIndice(allPolaroids);
    
    calcularColumnas();
    const containerWidth = album.clientWidth;
    const totalGapWidth = (columns - 1) * config.gap;
    const availableWidth = containerWidth - totalGapWidth;
    const actualColumnWidth = availableWidth / columns;
    
    columnHeights.fill(0);
    
    allPolaroids.forEach(polaroidData => {
        const polaroid = polaroidData.element;
        const height = polaroidData.height * (actualColumnWidth / config.columnWidth);
        
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
            observer.observe(polaroid);
        }
        
        columnHeights[columnIndex] += height + config.gap;
    });
    
    const maxHeight = Math.max(...columnHeights);
    album.style.height = `${maxHeight + 50}px`;
}

// Organizar masonry para videos (manteniendo orden)
function organizarMasonryVideos() {
    if (allVideoPolaroids.length === 0) return;
    
    // Ordenar los videos por índice antes de organizarlos
    allVideoPolaroids = ordenarPolaroidsPorIndice(allVideoPolaroids);
    
    const videosColumns = Math.max(1, Math.floor(videosContainer.clientWidth / (config.columnWidth + config.gap)));
    const videosColumnHeights = new Array(videosColumns).fill(0);
    
    const containerWidth = videosContainer.clientWidth;
    const totalGapWidth = (videosColumns - 1) * config.gap;
    const availableWidth = containerWidth - totalGapWidth;
    const actualColumnWidth = availableWidth / videosColumns;
    
    allVideoPolaroids.forEach(videoData => {
        const videoPolaroid = videoData.element;
        
        const aspectRatio = videoData.aspectRatio || 0.75;
        const height = actualColumnWidth * aspectRatio + 25;
        
        videoData.displayWidth = actualColumnWidth;
        videoData.displayHeight = height;
        
        videoPolaroid.style.width = `${actualColumnWidth}px`;
        videoPolaroid.style.height = `${height}px`;
        
        const videoWrapper = videoPolaroid.querySelector('div');
        if (videoWrapper) {
            videoWrapper.style.height = `calc(100% - 25px)`;
        }
    });
    
    allVideoPolaroids.forEach(videoData => {
        const videoPolaroid = videoData.element;
        const height = videoData.displayHeight;
        
        let minHeight = Math.min(...videosColumnHeights);
        let columnIndex = videosColumnHeights.indexOf(minHeight);
        
        const x = columnIndex * (actualColumnWidth + config.gap);
        const y = videosColumnHeights[columnIndex];
        
        videoPolaroid.style.left = `${x}px`;
        videoPolaroid.style.top = `${y}px`;
        
        if (!videoPolaroid.parentElement) {
            videosContainer.appendChild(videoPolaroid);
            observer.observe(videoPolaroid);
        }
        
        videosColumnHeights[columnIndex] += height + config.gap;
    });
    
    const maxHeight = Math.max(...videosColumnHeights);
    videosContainer.style.height = `${maxHeight + 50}px`;
}

// Verificar si archivo existe
function verificarArchivoExiste(url) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                resolve(xhr.status === 200);
            }
        };
        xhr.onerror = () => resolve(false);
        xhr.send();
    });
}

// Cargar fotos en orden numérico
async function cargarFotos() {
    if (isLoading || fotosCargadas) return;
    
    isLoading = true;
    allPolaroids = [];
    album.innerHTML = '';
    
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.textContent = 'Cargando tus fotos... 💜';
    album.appendChild(loader);
    
    try {
        // Primero encontrar TODAS las fotos que existen
        let fotosExistentes = 0;
        const fotosEncontradas = [];
        
        // Verificar en orden desde 1 hasta 150
        for (let i = 1; i <= 150; i++) {
            const existe = await verificarArchivoExiste(`assets/img/foto${i}.jpg`);
            if (existe) {
                fotosExistentes++;
                fotosEncontradas.push(i);
                console.log(`Foto ${i} encontrada`);
            }
            
            // Si no encontramos ninguna foto en los primeros 10, paramos
            if (i === 10 && fotosEncontradas.length === 0) {
                console.log("No se encontraron fotos en los primeros 10 intentos");
                break;
            }
            
            // Pausa pequeña para no bloquear el navegador
            if (i % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (fotosExistentes === 0) {
            loader.textContent = 'No se encontraron fotos en assets/img/';
            isLoading = false;
            return;
        }
        
        console.log(`Total de fotos encontradas: ${fotosExistentes}`);
        
        // Cargar las fotos en orden numérico
        const promesas = [];
        for (let i of fotosEncontradas) {
            promesas.push(crearPolaroid(`assets/img/foto${i}.jpg`, i));
            
            // Cargar en lotes pequeños para no sobrecargar
            if (promesas.length % 10 === 0) {
                await Promise.all(promesas);
                // Actualizar loader con progreso
                loader.textContent = `Cargando fotos... ${i}/${fotosExistentes} 💜`;
            }
        }
        
        // Esperar a que se carguen todas las promesas restantes
        if (promesas.length > 0) {
            await Promise.all(promesas);
        }
        
        loader.remove();
        
        // Organizar las fotos (ya están ordenadas por índice)
        organizarMasonryFotos();
        fotosCargadas = true;
        
        console.log(`Fotos cargadas y organizadas: ${allPolaroids.length}`);
        
    } catch (error) {
        console.error('Error cargando fotos:', error);
        loader.textContent = 'Error cargando las fotos';
    }
    
    isLoading = false;
}

// Cargar videos en orden numérico
async function cargarVideos() {
    if (isLoading || videosCargados) return;
    
    isLoading = true;
    allVideoPolaroids = [];
    videosContainer.innerHTML = '';
    
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.textContent = 'Cargando tus videos... 💜';
    videosContainer.appendChild(loader);
    
    try {
        // Verificar qué videos existen (del 1 al 13)
        const videosExistentes = [];
        
        for (let i = 1; i <= 14; i++) {
            const existe = await verificarArchivoExiste(`assets/videos/video${i}.mp4`);
            if (existe) {
                videosExistentes.push({
                    src: `assets/videos/video${i}.mp4`,
                    caption: `Recuerdo especial ${i}`,
                    index: i
                });
                console.log(`Video ${i} encontrado`);
            }
            
            // Pausa pequeña para no bloquear
            if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (videosExistentes.length === 0) {
            loader.textContent = 'No se encontraron videos en assets/videos/';
            isLoading = false;
            return;
        }
        
        console.log(`Total de videos encontrados: ${videosExistentes.length}`);
        
        // Cargar los videos en orden numérico
        const promesas = [];
        for (let video of videosExistentes) {
            promesas.push(crearVideoPolaroid(video.src, video.index));
            
            // Actualizar progreso
            if (promesas.length % 3 === 0) {
                await Promise.all(promesas);
                loader.textContent = `Cargando videos... ${video.index}/${videosExistentes.length} 💜`;
            }
        }
        
        if (promesas.length > 0) {
            await Promise.all(promesas);
        }
        
        loader.remove();
        organizarMasonryVideos();
        videosCargados = true;
        
        console.log(`Videos cargados y organizados: ${allVideoPolaroids.length}`);
        
    } catch (error) {
        console.error('Error cargando videos:', error);
        loader.textContent = 'Error cargando los videos';
    }
    
    isLoading = false;
}

// Cambiar entre fotos y videos
selectorButtons.forEach(button => {
    button.addEventListener('click', function() {
        const type = this.getAttribute('data-type');
        
        selectorButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        if (type === 'fotos') {
            fotosContainer.style.display = 'block';
            videosContainer.style.display = 'none';
            
            if (!fotosCargadas) {
                cargarFotos();
            } else {
                organizarMasonryFotos();
            }
        } else if (type === 'videos') {
            fotosContainer.style.display = 'none';
            videosContainer.style.display = 'block';
            
            if (!videosCargados) {
                cargarVideos();
            } else {
                organizarMasonryVideos();
            }
        }
    });
});

// Navegación entre páginas
document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            if (page !== window.location.pathname.split('/').pop()) {
                window.location.href = page;
            }
        });
    });
    
    // Cargar fotos por defecto (en orden)
    calcularColumnas();
    cargarFotos();
    
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
        }, 250);
    });
    
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !videosCargados && videosContainer.style.display !== 'none') {
                cargarVideos();
            }
        });
    }, { threshold: 0.1 });
    
    videoObserver.observe(videosContainer);
});