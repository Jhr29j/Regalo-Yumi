// Navegación entre páginas
document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            
            // Remover active de todos los botones
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // Agregar active al botón clickeado
            this.classList.add('active');
            
            // Navegar a la página
            if (page !== window.location.pathname.split('/').pop()) {
                window.location.href = page;
            }
        });
    });
});