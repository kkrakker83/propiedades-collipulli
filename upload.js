// Configuración de AWS Amplify
const awsConfig = {
    Auth: {
        identityPoolId: '', // Lo dejaremos vacío por ahora para usar acceso directo
        region: 'us-east-1', // La región que elegiste (ej: us-east-1)
        userPoolId: '', 
        userPoolWebClientId: '',
    },
    Storage: {
        AWSS3: {
            bucket: 'tu-nombre-de-bucket', // El nombre exacto de tu Bucket de S3
            region: 'us-east-1' 
        }
    }
};

// Inicializar Amplify
Amplify.configure(awsConfig);

// Función para subir el archivo
async function uploadFile() {
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('status');
    const file = fileInput.files[0];

    if (!file) {
        status.innerText = "❌ Por favor, selecciona un archivo primero.";
        return;
    }

    status.innerText = "⏳ Subiendo archivo a Propiedades Collipulli...";

    try {
        // Esta línea hace toda la magia de la subida
        const result = await Amplify.Storage.put(file.name, file, {
            contentType: file.type, // Detecta si es imagen o video automáticamente
            level: 'public' // Para que se pueda ver en tu web
        });

        console.log("Éxito:", result);
        status.innerText = "✅ ¡Archivo subido con éxito! Ya está en la nube.";
        status.className = "mt-4 text-sm text-green-600 font-bold";

    } catch (error) {
        console.error("Error detallado:", error);
        status.innerText = "❌ Error al subir. Revisa la configuración de CORS o tus llaves.";
        status.className = "mt-4 text-sm text-red-600 font-bold";
    }
}
