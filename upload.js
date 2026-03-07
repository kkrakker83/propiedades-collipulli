// Función para configurar Amplify de forma segura
function configureAmplify() {
    // Intentamos obtener la librería desde el objeto global del navegador
    const amplifyLib = window.Amplify;

    if (!amplifyLib) {
        console.error("Amplify no está cargado. Reintentando...");
        return false;
    }

    const awsConfig = {
        Auth: {
            region: 'us-east-1',
            credentials: {
                accessKeyId: window.localStorage.getItem('aws_id') || prompt("Introduce tu Access Key ID:"),
                secretAccessKey: window.localStorage.getItem('aws_secret') || prompt("Introduce tu Secret Access Key:")
            }
        },
        Storage: {
            AWSS3: {
                bucket: 'propiedades-collipulli-assets',
                region: 'us-east-1'
            }
        }
    };

    // Guardar credenciales para no pedir siempre
    if (awsConfig.Auth.credentials.accessKeyId && awsConfig.Auth.credentials.secretAccessKey) {
        window.localStorage.setItem('aws_id', awsConfig.Auth.credentials.accessKeyId);
        window.localStorage.setItem('aws_secret', awsConfig.Auth.credentials.secretAccessKey);
    }

    amplifyLib.default.configure(awsConfig);
    console.log("Amplify configurado correctamente");
    return true;
}

// Intentar configurar al cargar el script
configureAmplify();

async function uploadFile() {
    const amplifyLib = window.Amplify;
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('status');
    const file = fileInput.files[0];

    if (!file) {
        status.innerText = "❌ Selecciona un archivo.";
        return;
    }

    status.innerText = "⏳ Subiendo...";

    try {
        // Usamos la sintaxis correcta para la versión cargada por script
        const result = await amplifyLib.default.Storage.put(file.name, file, {
            contentType: file.type,
            level: 'public'
        });

        console.log("Éxito:", result);
        status.innerText = "✅ ¡Subida Exitosa!";
        status.className = "mt-4 text-sm text-green-600 font-bold";
    } catch (error) {
        console.error("Error:", error);
        status.innerText = "❌ Error. Revisa la consola (F12).";
        status.className = "mt-4 text-sm text-red-600 font-bold";
    }
}
