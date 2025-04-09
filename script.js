// Espera a que el contenido del DOM esté completamente cargado y parseado
document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos del DOM ---
    // Se obtienen las referencias a los elementos HTML importantes
    const addNoteBtn = document.getElementById('addNoteBtn');
    const noteModal = document.getElementById('noteModal');
    const modalContent = noteModal.querySelector('.modal-content'); // Contenedor del modal para animación
    const cancelBtn = document.getElementById('cancelBtn');
    const noteForm = document.getElementById('noteForm');
    const modalTitle = document.getElementById('modalTitle');
    const notesTableBody = document.getElementById('notesTableBody');
    const noNotesRow = document.getElementById('no-notes-row'); // Fila que se muestra si no hay notas
    const totalAmountCell = document.getElementById('totalAmount'); // Celda para mostrar el total
    const currentYearSpan = document.getElementById('currentYear'); // Span para el año en el footer
    const noteIdInput = document.getElementById('noteId'); // Input oculto para el ID de la nota (al editar)
    const fechaInput = document.getElementById('fecha');
    const conceptoInput = document.getElementById('concepto');
    const montoInput = document.getElementById('monto');

    // --- Estado de la Aplicación ---
    let notes = []; // Array para almacenar los objetos de apuntes
    let editingNoteId = null; // Guarda el ID de la nota que se está editando, o null si se crea una nueva

    // --- Funciones ---

    /**
     * Carga los apuntes desde el localStorage al iniciar la aplicación.
     */
    function loadNotes() {
        const storedNotes = localStorage.getItem('accountingNotes'); // Intenta obtener notas guardadas
        notes = storedNotes ? JSON.parse(storedNotes) : []; // Si existen, las parsea; si no, inicializa como array vacío
        renderNotes(); // Muestra las notas en la tabla
        initializeLucideIcons(); // Asegura que los iconos se rendericen después de cargar
    }

    /**
     * Guarda el array actual de apuntes en el localStorage.
     */
    function saveNotes() {
        localStorage.setItem('accountingNotes', JSON.stringify(notes)); // Convierte el array a JSON y lo guarda
        renderNotes(); // Vuelve a dibujar la tabla con los datos actualizados
        initializeLucideIcons(); // Asegura que los iconos se rendericen después de guardar/actualizar
    }

    /**
     * Formatea un número como moneda (Euros).
     * @param {number} amount - La cantidad numérica a formatear.
     * @returns {string} La cantidad formateada como string de moneda (ej: "1.234,56 €").
     */
    function formatCurrency(amount) {
        // Usa la API Intl.NumberFormat para formateo localizado
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    }

    /**
     * Calcula la suma total de los montos de todos los apuntes y la muestra en el footer de la tabla.
     */
    function calculateTotal() {
        // Usa reduce para sumar los montos. Convierte a float y maneja posibles valores no numéricos (|| 0)
        const total = notes.reduce((sum, note) => sum + parseFloat(note.monto || 0), 0);
        totalAmountCell.textContent = formatCurrency(total); // Muestra el total formateado
    }

    /**
     * Renderiza (dibuja) la tabla de apuntes en el HTML.
     * Limpia la tabla actual y la reconstruye con los datos del array 'notes'.
     */
    function renderNotes() {
        notesTableBody.innerHTML = ''; // Limpia el contenido actual del cuerpo de la tabla

        if (notes.length === 0) {
            noNotesRow.classList.remove('hidden'); // Muestra el mensaje "No hay apuntes" si el array está vacío
        } else {
            noNotesRow.classList.add('hidden'); // Oculta el mensaje si hay apuntes
            // Itera sobre cada apunte en el array
            notes.forEach(note => {
                const row = document.createElement('tr'); // Crea una nueva fila de tabla
                row.classList.add('hover:bg-gray-50'); // Añade un efecto hover sutil
                // Define el contenido HTML de la fila, incluyendo los datos y los botones de acción
                row.innerHTML = `
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${note.fecha}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${note.concepto}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">${formatCurrency(note.monto)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-center space-x-2">
                        <button class="action-button edit-btn text-blue-600 hover:text-blue-800" data-id="${note.id}" title="Editar">
                            <i data-lucide="edit-2" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                        </button>
                        <button class="action-button delete-btn text-red-600 hover:text-red-800" data-id="${note.id}" title="Borrar">
                            <i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                        </button>
                    </td>
                `;
                notesTableBody.appendChild(row); // Añade la fila creada al cuerpo de la tabla
            });
        }
        calculateTotal(); // Recalcula y muestra el total general
        addTableButtonListeners(); // Vuelve a añadir listeners a los botones de editar/borrar recién creados
    }

    /**
     * Añade los event listeners a los botones de Editar y Borrar de la tabla.
     * Se llama cada vez que se renderiza la tabla para asegurar que los botones nuevos funcionen.
     */
    function addTableButtonListeners() {
        // Selecciona todos los botones con la clase 'edit-btn' y les añade un listener
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.removeEventListener('click', handleEditNote); // Previene duplicados si se llama varias veces
            button.addEventListener('click', handleEditNote);
        });
        // Selecciona todos los botones con la clase 'delete-btn' y les añade un listener
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.removeEventListener('click', handleDeleteNote); // Previene duplicados
            button.addEventListener('click', handleDeleteNote);
        });
    }

    /**
     * Muestra el modal para añadir o editar un apunte.
     * @param {boolean} [isEditing=false] - Indica si el modal se abre para editar (true) o crear (false).
     * @param {object|null} [noteData=null] - Los datos del apunte a editar (solo si isEditing es true).
     */
    function showModal(isEditing = false, noteData = null) {
        editingNoteId = isEditing ? noteData.id : null; // Guarda el ID si estamos editando
        modalTitle.textContent = isEditing ? 'Editar Apunte' : 'Añadir Nuevo Apunte'; // Cambia el título del modal

        if (isEditing && noteData) {
            // Si se está editando, rellena el formulario con los datos existentes
            noteIdInput.value = noteData.id;
            fechaInput.value = noteData.fecha;
            conceptoInput.value = noteData.concepto;
            montoInput.value = noteData.monto;
        } else {
            // Si se crea uno nuevo, resetea el formulario y pone la fecha actual por defecto
            noteForm.reset();
            noteIdInput.value = ''; // Asegura que el ID oculto esté vacío
            fechaInput.valueAsDate = new Date(); // Pone la fecha de hoy
        }

        // Muestra el modal aplicando las clases CSS correspondientes para la transición
        noteModal.classList.remove('modal-hidden');
        noteModal.classList.add('modal-visible');
        modalContent.classList.remove('modal-content-hidden');
        modalContent.classList.add('modal-content-visible');
        initializeLucideIcons(); // Asegura que los iconos dentro del modal (si los hubiera) se rendericen
    }

    /**
     * Oculta el modal.
     */
    function hideModal() {
        // Oculta el modal aplicando las clases CSS para la transición inversa
        noteModal.classList.add('modal-hidden');
        noteModal.classList.remove('modal-visible');
        modalContent.classList.add('modal-content-hidden');
        modalContent.classList.remove('modal-content-visible');
        noteForm.reset(); // Limpia el formulario al cerrar
        editingNoteId = null; // Resetea el ID de edición
        noteIdInput.value = '';
    }

    /**
     * Maneja el evento de envío del formulario del modal (Guardar/Actualizar).
     * @param {Event} event - El objeto del evento submit.
     */
    function handleFormSubmit(event) {
        event.preventDefault(); // Evita que la página se recargue al enviar el formulario

        // Recoge los datos del formulario
        const formData = {
            // Usa el ID existente si se está editando, o crea uno nuevo basado en la fecha actual si es nuevo
            id: editingNoteId || Date.now().toString(),
            fecha: fechaInput.value,
            concepto: conceptoInput.value.trim(), // Elimina espacios en blanco al inicio/final
            monto: parseFloat(montoInput.value) || 0 // Convierte a número, o 0 si no es válido
        };

        // Validación simple (se podría mejorar)
        if (!formData.fecha || !formData.concepto) {
            alert("La fecha y el concepto son obligatorios."); // Feedback básico al usuario
            return; // Detiene la ejecución si faltan datos
        }

        if (editingNoteId) {
            // Si se estaba editando, busca el índice de la nota y la actualiza
            const noteIndex = notes.findIndex(note => note.id === editingNoteId);
            if (noteIndex > -1) {
                notes[noteIndex] = formData; // Reemplaza la nota antigua con la nueva
            }
        } else {
            // Si es una nota nueva, la añade al final del array
            notes.push(formData);
        }

        saveNotes(); // Guarda el array actualizado en localStorage y re-renderiza la tabla
        hideModal(); // Cierra el modal
    }

    /**
     * Maneja el clic en el botón Editar de una fila de la tabla.
     * @param {Event} event - El objeto del evento click.
     */
    function handleEditNote(event) {
        const button = event.currentTarget; // El botón que fue presionado
        const id = button.dataset.id; // Obtiene el ID de la nota desde el atributo data-id
        const noteToEdit = notes.find(note => note.id === id); // Busca la nota correspondiente en el array
        if (noteToEdit) {
            showModal(true, noteToEdit); // Abre el modal en modo edición con los datos de la nota
        }
    }

    /**
     * Maneja el clic en el botón Borrar de una fila de la tabla.
     * @param {Event} event - El objeto del evento click.
     */
    function handleDeleteNote(event) {
        const button = event.currentTarget; // El botón que fue presionado
        const id = button.dataset.id; // Obtiene el ID de la nota desde el atributo data-id

        // Pide confirmación al usuario antes de borrar
        if (confirm('¿Estás seguro de que quieres borrar este apunte?')) {
            // Filtra el array, creando uno nuevo que excluye la nota con el ID a borrar
            notes = notes.filter(note => note.id !== id);
            saveNotes(); // Guarda el array modificado y re-renderiza la tabla
        }
    }

    /**
     * Inicializa o actualiza los iconos de Lucide en la página.
     * Se llama después de cargar notas y después de renderizar/actualizar.
     */
    function initializeLucideIcons() {
        if (window.lucide) {
            lucide.createIcons(); // Llama a la función de la librería Lucide para renderizar los iconos
        } else {
            // Mensaje de advertencia si la librería no se ha cargado aún (poco probable con 'defer')
            console.warn("Lucide Icons script not loaded yet or failed to load.");
        }
    }

    // --- Inicialización y Event Listeners Globales ---

    // Listener para abrir el modal al hacer clic en el botón "Añadir Apunte"
    addNoteBtn.addEventListener('click', () => showModal(false)); // Llama a showModal en modo creación

    // Listener para cerrar el modal con el botón "Cancelar"
    cancelBtn.addEventListener('click', hideModal);

    // Listener para cerrar el modal si se hace clic fuera del contenido (en el fondo oscuro)
    noteModal.addEventListener('click', (event) => {
        if (event.target === noteModal) { // Comprueba si el clic fue directamente sobre el fondo del modal
            hideModal();
        }
    });

    // Listener para manejar el envío del formulario (cuando se hace clic en "Guardar")
    noteForm.addEventListener('submit', handleFormSubmit);

    // Pone el año actual en el span del footer
    currentYearSpan.textContent = new Date().getFullYear();

    // Carga inicial de los apuntes guardados al cargar la página
    loadNotes();

}); // Fin del listener DOMContentLoaded
