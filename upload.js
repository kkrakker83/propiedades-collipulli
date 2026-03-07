// Configuración de AWS Amplify para Propiedades Collipulli
const awsConfig = {
    Auth: {
        // En esta etapa inicial, usamos acceso directo por credenciales
        region: 'us-east-1', 
    },
    Storage: {
        AWSS3: {
            bucket: 'propiedades-collipulli-assets', // El nombre que sugerimos
            region: 'us-east-1' // La región sugerida
        }
    }
};

// Inicializar la librería Amplify
Amplify.configure(awsConfig);

/**
 * Función principal para subir archivos desde el panel administrativo
 */
async function uploadFile() {
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('status');
    const file = fileInput.files[0];

    // Validación: Verificar si se seleccionó un archivo
    if (!file) {
        status.innerText = "❌ Por favor, selecciona una foto o video primero.";
        status.className = "mt-4 text-sm text-red-600 font-bold";
        return;
    }

    status.innerText = "⏳ Subiendo archivo a AWS S3...";
    status.className = "mt-4 text-sm text-blue-600 animate-pulse";

    try {
        // Ejecución de la subida a través de Amplify Storage
        const result = await Amplify.Storage.put(file.name, file, {
            contentType: file.type, 
            level: 'public' // Permite que las fotos sean visibles en el catálogo
        });

        console.log("Subida exitosa:", result);
        
        status.innerText = "✅ ¡Archivo subido con éxito! Listo para el catálogo.";
        status.className = "mt-4 text-sm text-green-600 font-bold";
        
        // Limpiar el input después de la subida
        fileInput.value = "";

    } catch (error) {
        console.error("Error en la subida:", error);
        status.innerText = "❌ Error al subir. Verifica la conexión con AWS.";
        status.className = "mt-4 text-sm text-red-600 font-bold";
    }
}
