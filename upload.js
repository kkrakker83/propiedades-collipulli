const BUCKET_NAME = "propiedades-collipulli-assets";
const REGION = "us-east-1";
const PUBLIC_FOLDER = "public/";

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-upload");
  fileInput.addEventListener("change", renderPreview);
});

function clearCredentials() {
  localStorage.removeItem("aws_id");
  localStorage.removeItem("aws_secret");
  alert("Credenciales borradas. La próxima vez se volverán a pedir.");
  location.reload();
}

function setStatus(message, type = "info") {
  const status = document.getElementById("status");
  const base = "text-sm font-medium min-h-[24px]";

  if (type === "error") {
    status.className = `${base} text-red-600 font-bold`;
  } else if (type === "success") {
    status.className = `${base} text-green-600 font-bold`;
  } else if (type === "warning") {
    status.className = `${base} text-yellow-600 font-bold`;
  } else {
    status.className = `${base} text-blue-600 font-bold`;
  }

  status.innerText = message;
}

function updateProgress(percent) {
  const bar = document.getElementById("progress-bar");
  const safePercent = Math.max(0, Math.min(100, percent));
  bar.style.width = `${safePercent}%`;
  bar.innerText = `${safePercent}%`;
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function generatePropertyId() {
  return "prop-" + Date.now();
}

function renderPreview() {
  const preview = document.getElementById("preview");
  const files = Array.from(document.getElementById("file-upload").files);

  preview.innerHTML = "";

  if (!files.length) return;

  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "border rounded-lg bg-white p-2 shadow-sm";

    const label = document.createElement("div");
    label.className = "text-xs font-bold text-gray-600 mb-2";
    label.textContent = index === 0 ? "Archivo 1 (posible portada)" : `Archivo ${index + 1}`;

    item.appendChild(label);

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "w-full h-28 object-cover rounded";
      item.appendChild(img);
    } else if (file.type.startsWith("video/")) {
      const videoBox = document.createElement("div");
      videoBox.className = "w-full h-28 rounded bg-gray-900 text-white flex items-center justify-center text-xs text-center p-2";
      videoBox.textContent = "Video seleccionado";
      item.appendChild(videoBox);
    } else {
      const fileBox = document.createElement("div");
      fileBox.className = "w-full h-28 rounded bg-gray-200 text-gray-700 flex items-center justify-center text-xs text-center p-2";
      fileBox.textContent = "Archivo no compatible";
      item.appendChild(fileBox);
    }

    const name = document.createElement("p");
    name.className = "text-xs text-gray-600 mt-2 break-words";
    name.textContent = file.name;
    item.appendChild(name);

    preview.appendChild(item);
  });
}

function getCredentials() {
  let accessKey = localStorage.getItem("aws_id");
  let secretKey = localStorage.getItem("aws_secret");

  if (!accessKey || !secretKey) {
    accessKey = prompt("Introduce tu AWS Access Key ID:");
    secretKey = prompt("Introduce tu AWS Secret Access Key:");

    if (!accessKey || !secretKey) {
      return null;
    }

    accessKey = accessKey.trim();
    secretKey = secretKey.trim();

    localStorage.setItem("aws_id", accessKey);
    localStorage.setItem("aws_secret", secretKey);
  }

  return { accessKey, secretKey };
}

function createS3Client(credentials) {
  AWS.config.update({
    accessKeyId: credentials.accessKey,
    secretAccessKey: credentials.secretKey,
    region: REGION
  });

  return new AWS.S3({
    apiVersion: "2006-03-01"
  });
}

function uploadSingleFile(s3, file, key, onProgress) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: file.type
      // ACL: "public-read"
    };

    const uploader = s3.upload(params);

    uploader.on("httpUploadProgress", (progress) => {
      if (progress && progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        onProgress(percent);
      }
    });

    uploader.send((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function uploadFiles() {
  const titulo = document.getElementById("titulo").value.trim();
  const precio = document.getElementById("precio").value.trim();
  const ubicacion = document.getElementById("ubicacion").value.trim();
  const fileInput = document.getElementById("file-upload");
  const files = Array.from(fileInput.files);
  const uploadBtn = document.getElementById("upload-btn");
  const jsonOutput = document.getElementById("json-output");

  jsonOutput.value = "";
  updateProgress(0);

  if (!titulo || !precio || !ubicacion) {
    setStatus("❌ Debes completar título, precio y ubicación.", "error");
    return;
  }

  if (!files.length) {
    setStatus("❌ Debes seleccionar al menos una foto o video.", "error");
    return;
  }

  const credentials = getCredentials();
  if (!credentials) {
    setStatus("❌ No se ingresaron credenciales AWS.", "error");
    return;
  }

  const s3 = createS3Client(credentials);
  const propertyId = generatePropertyId();
  const uploadedUrls = [];

  uploadBtn.disabled = true;
  uploadBtn.classList.add("opacity-60", "cursor-not-allowed");

  try {
    setStatus("⏳ Subiendo archivos a S3...", "info");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = sanitizeFileName(file.name);
      const uniqueKey = `${PUBLIC_FOLDER}${propertyId}_${i + 1}_${Date.now()}_${safeName}`;

      setStatus(`⏳ Subiendo archivo ${i + 1} de ${files.length}: ${file.name}`, "info");

      const result = await uploadSingleFile(
        s3,
        file,
        uniqueKey,
        (percentPerFile) => {
          const overall = Math.round(((i + percentPerFile / 100) / files.length) * 100);
          updateProgress(overall);
        }
      );

      uploadedUrls.push({
        url: result.Location,
        tipo: file.type.startsWith("video/") ? "video" : "imagen",
        nombre: file.name
      });
    }

    updateProgress(100);

    const firstImage = uploadedUrls.find((item) => item.tipo === "imagen");
    const portada = firstImage ? firstImage.url : uploadedUrls[0].url;

    const propertyJson = {
      id: propertyId,
      titulo: titulo,
      precio: precio,
      ubicacion: ubicacion,
      imagenUrl: portada,
      galeria: uploadedUrls.map((item) => item.url)
    };

    jsonOutput.value = JSON.stringify(propertyJson, null, 2);

    setStatus("✅ Propiedad subida correctamente. JSON generado listo para copiar.", "success");

    document.getElementById("titulo").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("ubicacion").value = "";
    fileInput.value = "";
    document.getElementById("preview").innerHTML = "";
  } catch (err) {
    console.error("Error al subir:", err);

    if (
      err.code === "InvalidAccessKeyId" ||
      err.code === "SignatureDoesNotMatch" ||
      err.code === "CredentialsError"
    ) {
      localStorage.removeItem("aws_id");
      localStorage.removeItem("aws_secret");
      setStatus("❌ Credenciales AWS inválidas. Se borraron para volver a ingresarlas.", "error");
      return;
    }

    if (
      err.code === "AccessControlListNotSupported" ||
      (err.message && err.message.includes("ACL"))
    ) {
      setStatus("❌ Tu bucket no permite ACLs. Ya dejé el código preparado sin ACL. Reintenta.", "error");
      return;
    }

    setStatus(`❌ Error al subir archivos: ${err.message || "desconocido"}`, "error");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.classList.remove("opacity-60", "cursor-not-allowed");
  }
}

function copyJson() {
  const jsonOutput = document.getElementById("json-output");

  if (!jsonOutput.value.trim()) {
    alert("Aún no hay JSON para copiar.");
    return;
  }

  jsonOutput.select();
  jsonOutput.setSelectionRange(0, 999999);

  try {
    document.execCommand("copy");
    alert("JSON copiado al portapapeles.");
  } catch (error) {
    navigator.clipboard.writeText(jsonOutput.value)
      .then(() => alert("JSON copiado al portapapeles."))
      .catch(() => alert("No se pudo copiar automáticamente. Cópialo manualmente."));
  }
}
