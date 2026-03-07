/**
 * Lógica para subir archivos a Amazon S3
 */
async function uploadFile() {
    const fileInput = document.getElementById('file-upload');
    const status = document.getElementById('status');
    const file = fileInput.files[0];

    // 1. Validar que exista un archivo seleccionado
    if (!file) {
        status.innerText = "❌ Por favor, selecciona un archivo primero.";
        status.className = "mt-4 text-sm text-red-600 font-bold";
        return;
    }

    // 2. Gestión de Credenciales (Evita el bloqueo de GitHub Secret Scanning)
    let accessKey = localStorage.getItem('aws_id');
    let secretKey = localStorage.getItem('aws_secret');

    if (!accessKey || !secretKey) {
        accessKey = prompt("Introduce tu Access Key ID (AKIA...):");
        secretKey = prompt("Introduce tu Secret Access Key:");
        
        if (accessKey && secretKey) {
            localStorage.setItem('aws_id', accessKey.trim());
            localStorage.setItem('aws_secret', secretKey.trim());
        } else {
            status.innerText = "❌ Acceso denegado: Se requieren las llaves.";
            return;
        }
    }

    // 3. Configurar AWS SDK con tus datos
    AWS.config.update({
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        region: 'us-east-1' 
    });

    const s3 = new AWS.S3();
    
    // Configuración del envío
    const params = {
        Bucket: 'propiedades-collipulli-assets', // Tu bucket
        Key: 'public/' + Date.now() + "_" + file.name, // Nombre único con fecha
        Body: file,
        ContentType: file.type,
        ACL: 'public-read' // Permiso para lectura pública
    };

    // 4. Proceso de subida
    status.innerText = "⏳ Conectando con AWS y subiendo...";
    status.className = "mt-4 text-sm text-blue-600 animate-pulse font-bold";

    s3.upload(params, function(err, data) {
        if (err) {
            console.error("Error de AWS:", err);
            status.innerText = "❌ Error: " + err.message;
            status.className = "mt-4 text-sm text-red-600 font-bold";
            
            // Si el error es de credenciales, limpiamos para reintentar
            if(err.code === 'SignatureDoesNotMatch' || err.code === 'InvalidAccessKeyId') {
                localStorage.clear();
                status.innerText += " (Llaves incorrectas, se han borrado)";
            }
        } else {
            console.log("Subida exitosa:", data.Location);
            status.innerText = "✅ ¡SUBIDA EXITOSA! El archivo ya está en la nube.";
            status.className = "mt-4 text-sm text-green-600 font-bold";
            fileInput.value = ""; // Limpiar el formulario
        }
    });
}
