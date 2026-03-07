// CONFIGURACIÓN DE AWS AMPLIFY - PROPIEDADES COLLIPULLI
const awsConfig = {
    Auth: {
        region: 'us-east-1',
        // Cambiamos esto para que no sea detectado como un secreto fijo
        credentials: {
            accessKeyId: window.localStorage.getItem('aws_id') || prompt("Introduce tu Access Key ID por única vez:"),
            secretAccessKey: window.localStorage.getItem('aws_secret') || prompt("Introduce tu Secret Access Key por única vez:")
        }
    },
    Storage: {
        AWSS3: {
            bucket: 'propiedades-collipulli-assets',
            region: 'us-east-1'
        }
    }
};

// Guardamos en el navegador para no preguntar siempre (solo en tu PC local)
if (awsConfig.Auth.credentials.accessKeyId) {
    window.localStorage.setItem('aws_id', awsConfig.Auth.credentials.accessKeyId);
    window.localStorage.setItem('aws_secret', awsConfig.Auth.credentials.secretAccessKey);
}

Amplify.configure(awsConfig);
/**
 * Función que se activa al hacer clic en "Subir a la nube"
 */
async function uploadFile() {
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('status');
    const file = fileInput.files[0];

    // Validar si el usuario seleccionó un archivo
    if (!file) {
        status.innerText = "❌ Error: Selecciona un archivo primero.";
        status.className = "mt-4 text-sm text-red-600 font-bold";
        return;
    }

    // Mensaje de carga
    status.innerText = "⏳ Subiendo " + file.name + " a AWS S3...";
    status.className = "mt-4 text-sm text-blue-600 animate-pulse";

    try {
        // Subida real a la carpeta 'public/' del Bucket
        const result = await Amplify.Storage.put(file.name, file, {
            contentType: file.type, // Identifica si es imagen o video
            level: 'public' // Lo hace visible para todos los clientes
        });

        console.log("Resultado exitoso:", result);
        
        status.innerText = "✅ ¡Subida Exitosa! El archivo ya está en la nube.";
        status.className = "mt-4 text-sm text-green-600 font-bold";
        
        // Limpiar el selector de archivos
        fileInput.value = "";

    } catch (error) {
        console.error("Error detallado de AWS:", error);
        status.innerText = "❌ Error al subir. Revisa tus llaves o el permiso CORS.";
        status.className = "mt-4 text-sm text-red-600 font-bold";
    }
}
