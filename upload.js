const BUCKET_NAME = "propiedades-collipulli-assets";
const REGION = "us-east-1";
const PUBLIC_FOLDER = "public/";
const DATA_FILE_KEY = "data/propiedades.json";
const DATA_FILE_URL = `https://${BUCKET_NAME}.s3.amazonaws.com/${DATA_FILE_KEY}`;

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-upload");
  const precioInput = document.getElementById("precio");

  if (fileInput) {
    fileInput.addEventListener("change", renderPreview);
  }

  if (precioInput) {
    precioInput.addEventListener("blur", () => {
      precioInput.value = formatPrice(precioInput.value);
    });
  }
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

function formatPrice(value) {
  if (!value) return "";

  const clean = String(value).replace(/[^\d]/g, "");
  if (!clean) return "";

  const numberValue = Number(clean);
  if (Number.isNaN(numberValue)) return value;

  return "$" + numberValue.toLocaleString("es-CL");
}

function renderPreview() {
  const preview = document.getElementById("preview");
  const files = Array.from(document.getElementById("file-upload").files);
  preview.innerHTML = "";

  if (!files.length) return;

  let firstImageMarked = false;

  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "border rounded-lg bg-white p-2 shadow-sm";

    const label = document.createElement("div");
    label.className = "text-xs font-bold text-gray-600 mb-2";

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isImage && !firstImageMarked) {
      label.textContent = "Portada";
      firstImageMarked = true;
    } else {
      label.textContent = `Archivo ${index + 1}`;
    }

    item.appendChild(label);

    if (isImage) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "w-full h-28 object-cover rounded";
      item.appendChild(img);
    } else if (isVideo) {
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

async function fetchExistingProperties() {
  const response = await fetch(`${DATA_FILE_URL}?v=${Date.now()}`);

  if (!response.ok) {
    throw new Error("No se pudo leer data/propiedades.json desde S3");
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("El archivo data/propiedades.json no contiene un array válido");
  }

  return data;
}

function savePropertiesToS3(s3, properties) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: DATA_FILE_KEY,
      Body: JSON.stringify(properties, null, 2),
      ContentType: "application/json; charset=utf-8"
    };

    s3.putObject(params, (err, data) => {
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
  const precioRaw = document.getElementById("precio").value.trim();
  const precio = formatPrice(precioRaw);
  const ubicacion = document.getElementById("ubicacion").value.trim();
  const dormitorios = parseInt(document.getElementById("dormitorios").value, 10);
  const banos = parseInt(document.getElementById("banos").value, 10);
  const descripcion = document.getElementById("descripcion").value.trim();
  const disponible = document.getElementById("disponible").value === "true";
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

  if (Number.isNaN(dormitorios) || Number.isNaN(banos)) {
    setStatus("❌ Debes ingresar dormitorios y baños.", "error");
    return;
  }

  if (!descripcion) {
    setStatus("❌ Debes ingresar una descripción.", "error");
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
  const uploadedFiles = [];
  const baseStamp = Date.now();

  uploadBtn.disabled = true;
  uploadBtn.classList.add("opacity-60", "cursor-not-allowed");

  try {
    setStatus("⏳ Subiendo archivos a S3...", "info");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = sanitizeFileName(file.name);
      const uniqueKey = `${PUBLIC_FOLDER}${baseStamp}_${i + 1}_${safeName}`;

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

      uploadedFiles.push({
        url: result.Location,
        tipo: file.type.startsWith("video/") ? "video" : "imagen",
        nombre: file.name
      });
    }

    setStatus("⏳ Leyendo propiedades actuales desde S3...", "info");

    const existingProperties = await fetchExistingProperties();

    const imagenes = uploadedFiles
      .filter((item) => item.tipo === "imagen")
      .map((item) => item.url);

    const videos = uploadedFiles
      .filter((item) => item.tipo === "video")
      .map((item) => item.url);

    const portada = imagenes.length > 0 ? imagenes[0] : (uploadedFiles[0]?.url || "");

    const propertyJson = {
      id: baseStamp,
      titulo: titulo,
      precio: precio,
      ubicacion: ubicacion,
      dormitorios: dormitorios,
      banos: banos,
      imagenUrl: portada,
      galeria: imagenes,
      videos: videos,
      descripcion: descripcion,
      disponible: disponible
    };

    const updatedProperties = [...existingProperties, propertyJson];

    setStatus("⏳ Guardando propiedades actualizadas en S3...", "info");

    await savePropertiesToS3(s3, updatedProperties);

    updateProgress(100);
    jsonOutput.value = JSON.stringify(propertyJson, null, 2);

    setStatus("✅ Propiedad guardada automáticamente en S3 y JSON generado.", "success");

    document.getElementById("titulo").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("ubicacion").value = "";
    document.getElementById("dormitorios").value = "";
    document.getElementById("banos").value = "";
    document.getElementById("descripcion").value = "";
    document.getElementById("disponible").value = "true";
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

    if (err.code === "AccessDenied") {
      setStatus("❌ AccessDenied: faltan permisos AWS para leer o escribir data/propiedades.json.", "error");
      return;
    }

    setStatus(`❌ Error al guardar en S3: ${err.message || "desconocido"}`, "error");
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
