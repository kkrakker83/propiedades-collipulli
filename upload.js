const BUCKET_NAME = "propiedades-collipulli-assets";
const REGION = "us-east-1";
const PUBLIC_FOLDER = "public/";
const DATA_FILE_KEY = "data/propiedades.json";
const DATA_FILE_URL = `https://${BUCKET_NAME}.s3.amazonaws.com/${DATA_FILE_KEY}`;

let currentProperties = [];
let currentEditingProperty = null;

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

  loadPropertiesList();
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

function getEstadoBadgeClass(estado) {
  if (estado === "reservada") return "bg-yellow-500 text-white";
  if (estado === "vendida") return "bg-red-500 text-white";
  return "bg-green-500 text-white";
}

function getEstadoLabel(estado) {
  if (estado === "reservada") return "RESERVADA";
  if (estado === "vendida") return "VENDIDA";
  return "DISPONIBLE";
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

function enterEditMode(propiedadId) {
  const property = currentProperties.find((item) => String(item.id) === String(propiedadId));
  if (!property) {
    alert("No se encontró la propiedad a editar.");
    return;
  }

  currentEditingProperty = { ...property };

  document.getElementById("editing-id").value = property.id;
  document.getElementById("titulo").value = property.titulo || "";
  document.getElementById("precio").value = property.precio || "";
  document.getElementById("ubicacion").value = property.ubicacion || "";
  document.getElementById("dormitorios").value = property.dormitorios ?? "";
  document.getElementById("banos").value = property.banos ?? "";
  document.getElementById("descripcion").value = property.descripcion || "";
  document.getElementById("estado").value = property.estado || "disponible";

  document.getElementById("upload-btn").textContent = "Actualizar propiedad en S3";
  document.getElementById("cancel-edit-btn").classList.remove("hidden");
  document.getElementById("edit-mode-banner").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEditMode() {
  currentEditingProperty = null;

  document.getElementById("editing-id").value = "";
  document.getElementById("titulo").value = "";
  document.getElementById("precio").value = "";
  document.getElementById("ubicacion").value = "";
  document.getElementById("dormitorios").value = "";
  document.getElementById("banos").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("estado").value = "disponible";
  document.getElementById("file-upload").value = "";
  document.getElementById("preview").innerHTML = "";
  document.getElementById("upload-btn").textContent = "Guardar propiedad en S3";
  document.getElementById("cancel-edit-btn").classList.add("hidden");
  document.getElementById("edit-mode-banner").classList.add("hidden");
}

function renderPropertiesList(properties) {
  const list = document.getElementById("properties-list");
  if (!list) return;

  if (!Array.isArray(properties) || properties.length === 0) {
    list.innerHTML = `
      <div class="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-xl p-4">
        No hay propiedades guardadas todavía.
      </div>
    `;
    return;
  }

  list.innerHTML = properties
    .slice()
    .reverse()
    .map((propiedad) => {
      const estado = propiedad.estado || (propiedad.disponible ? "disponible" : "vendida");
      const badgeClass = getEstadoBadgeClass(estado);
      const badgeLabel = getEstadoLabel(estado);
      const thumb = propiedad.imagenUrl || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=300&q=80";

      return `
        <div class="border border-gray-200 rounded-2xl bg-white shadow-sm p-4">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="md:w-40 shrink-0">
              <img
                src="${thumb}"
                alt="${propiedad.titulo || "Propiedad"}"
                class="w-full h-28 object-cover rounded-xl"
              />
            </div>

            <div class="flex-1">
              <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h3 class="text-lg font-bold text-blue-900">
                    ${propiedad.titulo || "Sin título"}
                  </h3>
                  <p class="text-sm text-gray-500 mt-1">
                    ${propiedad.ubicacion || "Ubicación no informada"}
                  </p>
                </div>

                <span class="inline-block text-xs font-bold px-3 py-1 rounded-full shadow ${badgeClass}">
                  ${badgeLabel}
                </span>
              </div>

              <div class="mt-3 flex flex-wrap gap-3 text-sm text-gray-700">
                <span class="bg-gray-100 px-3 py-1 rounded-lg">Precio: ${propiedad.precio || "Consultar"}</span>
                <span class="bg-gray-100 px-3 py-1 rounded-lg">Dormitorios: ${propiedad.dormitorios ?? 0}</span>
                <span class="bg-gray-100 px-3 py-1 rounded-lg">Baños: ${propiedad.banos ?? 0}</span>
                <span class="bg-gray-100 px-3 py-1 rounded-lg">ID: ${propiedad.id}</span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onclick="enterEditMode('${propiedad.id}')"
                  class="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-blue-200"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onclick="quickChangeStatus('${propiedad.id}', 'disponible')"
                  class="bg-green-100 text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-green-200"
                >
                  Disponible
                </button>

                <button
                  type="button"
                  onclick="quickChangeStatus('${propiedad.id}', 'reservada')"
                  class="bg-yellow-100 text-yellow-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-200"
                >
                  Reservar
                </button>

                <button
                  type="button"
                  onclick="quickChangeStatus('${propiedad.id}', 'vendida')"
                  class="bg-orange-100 text-orange-900 px-4 py-2 rounded-lg font-semibold hover:bg-orange-200"
                >
                  Vender
                </button>

                <button
                  type="button"
                  onclick="deleteProperty('${propiedad.id}')"
                  class="bg-red-100 text-red-900 px-4 py-2 rounded-lg font-semibold hover:bg-red-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadPropertiesList() {
  const list = document.getElementById("properties-list");
  if (!list) return;

  list.innerHTML = `
    <div class="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-xl p-4">
      Cargando propiedades guardadas...
    </div>
  `;

  try {
    const properties = await fetchExistingProperties();
    currentProperties = properties;
    renderPropertiesList(properties);
  } catch (error) {
    console.error("Error cargando listado de propiedades:", error);
    list.innerHTML = `
      <div class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4">
        No se pudo cargar el listado de propiedades.
      </div>
    `;
  }
}

async function quickChangeStatus(propertyId, newStatus) {
  const credentials = getCredentials();
  if (!credentials) {
    setStatus("❌ No se ingresaron credenciales AWS.", "error");
    return;
  }

  const s3 = createS3Client(credentials);

  try {
    setStatus("⏳ Actualizando estado de la propiedad...", "info");

    const updatedProperties = currentProperties.map((item) => {
      if (String(item.id) === String(propertyId)) {
        return {
          ...item,
          estado: newStatus
        };
      }
      return item;
    });

    await savePropertiesToS3(s3, updatedProperties);
    currentProperties = updatedProperties;

    if (currentEditingProperty && String(currentEditingProperty.id) === String(propertyId)) {
      currentEditingProperty.estado = newStatus;
      document.getElementById("estado").value = newStatus;
    }

    renderPropertiesList(updatedProperties);
    setStatus(`✅ Estado actualizado a ${getEstadoLabel(newStatus)}.`, "success");
  } catch (err) {
    console.error("Error cambiando estado:", err);
    setStatus(`❌ Error al cambiar estado: ${err.message || "desconocido"}`, "error");
  }
}

async function deleteProperty(propertyId) {
  const property = currentProperties.find((item) => String(item.id) === String(propertyId));
  if (!property) {
    alert("No se encontró la propiedad.");
    return;
  }

  const confirmed = confirm(`¿Eliminar la propiedad "${property.titulo}"?\n\nEsta acción la quitará de la web.`);
  if (!confirmed) return;

  const credentials = getCredentials();
  if (!credentials) {
    setStatus("❌ No se ingresaron credenciales AWS.", "error");
    return;
  }

  const s3 = createS3Client(credentials);

  try {
    setStatus("⏳ Eliminando propiedad del sistema...", "info");

    const updatedProperties = currentProperties.filter((item) => String(item.id) !== String(propertyId));

    await savePropertiesToS3(s3, updatedProperties);
    currentProperties = updatedProperties;

    if (currentEditingProperty && String(currentEditingProperty.id) === String(propertyId)) {
      cancelEditMode();
    }

    renderPropertiesList(updatedProperties);
    setStatus("✅ Propiedad eliminada correctamente del listado.", "success");
  } catch (err) {
    console.error("Error eliminando propiedad:", err);
    setStatus(`❌ Error al eliminar propiedad: ${err.message || "desconocido"}`, "error");
  }
}

async function uploadFiles() {
  const editingId = document.getElementById("editing-id").value.trim();
  const isEditing = Boolean(editingId);

  const titulo = document.getElementById("titulo").value.trim();
  const precioRaw = document.getElementById("precio").value.trim();
  const precio = formatPrice(precioRaw);
  const ubicacion = document.getElementById("ubicacion").value.trim();
  const dormitorios = parseInt(document.getElementById("dormitorios").value, 10);
  const banos = parseInt(document.getElementById("banos").value, 10);
  const descripcion = document.getElementById("descripcion").value.trim();
  const estado = document.getElementById("estado").value;

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

  if (!estado) {
    setStatus("❌ Debes seleccionar un estado.", "error");
    return;
  }

  if (!isEditing && !files.length) {
    setStatus("❌ Debes seleccionar al menos una foto o video para crear la propiedad.", "error");
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
    let imagenes = [];
    let videos = [];
    let portada = "";

    if (files.length > 0) {
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

      imagenes = uploadedFiles
        .filter((item) => item.tipo === "imagen")
        .map((item) => item.url);

      videos = uploadedFiles
        .filter((item) => item.tipo === "video")
        .map((item) => item.url);

      portada = imagenes.length > 0 ? imagenes[0] : (uploadedFiles[0]?.url || "");
    }

    setStatus("⏳ Leyendo propiedades actuales desde S3...", "info");

    const existingProperties = await fetchExistingProperties();

    let propertyJson;

    if (isEditing) {
      const existingProperty = existingProperties.find((item) => String(item.id) === String(editingId));
      if (!existingProperty) {
        throw new Error("No se encontró la propiedad que se estaba editando.");
      }

      propertyJson = {
        ...existingProperty,
        titulo: titulo,
        precio: precio,
        ubicacion: ubicacion,
        dormitorios: dormitorios,
        banos: banos,
        descripcion: descripcion,
        estado: estado,
        imagenUrl: files.length > 0 ? portada : existingProperty.imagenUrl,
        galeria: files.length > 0 ? imagenes : (existingProperty.galeria || []),
        videos: files.length > 0 ? videos : (existingProperty.videos || [])
      };
    } else {
      propertyJson = {
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
        estado: estado
      };
    }

    let updatedProperties;

    if (isEditing) {
      updatedProperties = existingProperties.map((item) =>
        String(item.id) === String(editingId) ? propertyJson : item
      );
    } else {
      updatedProperties = [...existingProperties, propertyJson];
    }

    setStatus("⏳ Guardando propiedades actualizadas en S3...", "info");

    await savePropertiesToS3(s3, updatedProperties);

    updateProgress(100);
    jsonOutput.value = JSON.stringify(propertyJson, null, 2);

    currentProperties = updatedProperties;
    renderPropertiesList(updatedProperties);

    if (isEditing) {
      setStatus("✅ Propiedad actualizada correctamente en S3.", "success");
      cancelEditMode();
    } else {
      setStatus("✅ Propiedad guardada automáticamente en S3 y JSON generado.", "success");
      document.getElementById("titulo").value = "";
      document.getElementById("precio").value = "";
      document.getElementById("ubicacion").value = "";
      document.getElementById("dormitorios").value = "";
      document.getElementById("banos").value = "";
      document.getElementById("descripcion").value = "";
      document.getElementById("estado").value = "disponible";
      fileInput.value = "";
      document.getElementById("preview").innerHTML = "";
    }
  } catch (err) {
    console.error("Error al guardar:", err);

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
