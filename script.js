// --------------------
// DOM ELEMENTS
// --------------------

const searchInput = document.querySelector("#search-input");
const fileArea = document.querySelector("#file-area");
const newButton = document.querySelector("#new-button");
const fileInput = document.querySelector("#file-input");
const navItems = document.querySelectorAll(".nav-item");
const pageTitle = document.querySelector(".content h1");
const sortSelect = document.querySelector("#sort-select");

const previewModal = document.querySelector("#preview-modal");
const previewTitle = document.querySelector("#preview-title");
const previewBody = document.querySelector("#preview-body");
const closePreviewButton = document.querySelector("#close-preview");

let files = [];
let currentSection = "My Drive";
let currentPreviewUrl = null;


// --------------------
// FILE SIZE FORMATTING
// --------------------

function formatFileSize(bytes) {
    bytes = Number(bytes) || 0;

    if (bytes < 1024) return bytes + " B";

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}


// --------------------
// SORTING
// --------------------

function sortFiles(fileList) {
    const sorted = [...fileList];
    const sortMode = sortSelect ? sortSelect.value : "newest";

    if (sortMode === "name") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "size") {
        sorted.sort((a, b) => b.size - a.size);
    } else {
        sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
}

if (sortSelect) {
    sortSelect.addEventListener("change", renderFiles);
}


// --------------------
// LOAD FILES FROM BACKEND
// --------------------

async function loadFiles() {
    if (!fileArea) return;

    try {
        let endpoint = "/files";

        if (currentSection === "Trash") {
            endpoint = "/files/trash";
        } else if (currentSection === "Starred") {
            endpoint = "/files/starred";
        } else if (currentSection === "Recent") {
            endpoint = "/files/recent";
        }

        const searchTerm = searchInput
            ? searchInput.value.trim()
            : "";

        if (searchTerm && currentSection !== "Trash") {
            endpoint = `/files/search?q=${encodeURIComponent(searchTerm)}`;
        }

        const data = await apiRequest(endpoint);

        files = data.files.map(file => ({
            id: file.id,
            name: file.original_name,
            size: Number(file.size),
            type: file.mime_type || "Unknown",
            starred: file.is_starred,
            trashed: currentSection === "Trash",
            createdAt: new Date(file.created_at).getTime(),
            folderId: file.folder_id
        }));

        renderFiles();

    } catch (error) {
        console.error("Could not load files:", error);

        fileArea.textContent =
            "Could not load files. Check your server and login.";
    }
}


// --------------------
// UPLOAD FILES
// --------------------

if (newButton && fileInput) {
    newButton.addEventListener("click", function () {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener("change", async function () {
        const selectedFiles = Array.from(fileInput.files);

        if (selectedFiles.length === 0) return;

        let completed = 0;
        let failed = 0;

        for (const selectedFile of selectedFiles) {
            try {
                const formData = new FormData();
                formData.append("file", selectedFile);

                await apiRequest("/files/upload", {
                    method: "POST",
                    body: formData
                });

                completed++;

            } catch (error) {
                failed++;
                console.error(
                    "Upload failed:",
                    selectedFile.name,
                    error
                );
            }
        }

        fileInput.value = "";

        await loadFiles();

        if (failed > 0) {
            alert(`${completed} uploaded; ${failed} failed.`);
        } else {
            alert(`${completed} file(s) uploaded successfully.`);
        }
    });
}


// --------------------
// NAVIGATION
// --------------------

navItems.forEach(function (item) {
    item.addEventListener("click", function () {
        currentSection = item.textContent.trim();

        if (pageTitle) {
            pageTitle.textContent = currentSection;
        }

        navItems.forEach(function (navItem) {
            navItem.classList.remove("active");
        });

        item.classList.add("active");

        loadFiles();
    });
});

if (searchInput) {
    searchInput.addEventListener("input", loadFiles);
}


// --------------------
// RENDER FILES
// --------------------

function renderFiles() {
    if (!fileArea) return;

    fileArea.replaceChildren();

    const visibleFiles = sortFiles(files);

    if (visibleFiles.length === 0) {
        const message = document.createElement("p");

        message.textContent =
            searchInput && searchInput.value.trim()
                ? "No files match your search."
                : "No files here yet.";

        fileArea.appendChild(message);
        return;
    }

    visibleFiles.forEach(function (file) {
        fileArea.appendChild(createFileCard(file));
    });
}


// --------------------
// BUTTON CREATION
// --------------------

function createButton(label, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);

    return button;
}


// --------------------
// FILE CARDS
// --------------------

function createFileCard(file) {
    const fileCard = document.createElement("div");
    fileCard.className = "file-card";

    const icon = document.createElement("div");
    icon.className = "file-icon";

    const extension = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
        : "";

    const icons = {
        pdf: "📕",
        png: "🖼️",
        jpg: "🖼️",
        jpeg: "🖼️",
        gif: "🖼️",
        webp: "🖼️",
        txt: "📄",
        doc: "📝",
        docx: "📝",
        csv: "📊",
        xls: "📊",
        xlsx: "📊",
        js: "💻",
        html: "💻",
        css: "💻",
        zip: "🗜️"
    };

    icon.textContent = icons[extension] || "📄";

    const name = document.createElement("h3");
    name.className = "file-name";
    name.textContent = file.name;
    name.title = file.name;

    const details = document.createElement("p");
    details.className = "file-details";

    details.textContent =
        file.type + " • " + formatFileSize(file.size);

    fileCard.append(icon, name, details);

    if (file.trashed) {
        fileCard.append(
            createButton("Restore", function () {
                restoreFile(file);
            }),

            createButton("Delete permanently", function () {
                permanentlyDeleteFile(file);
            })
        );

        return fileCard;
    }

    fileCard.append(
        createButton("Preview", function () {
            previewFile(file);
        }),

        createButton("Download", function () {
            downloadFile(file);
        }),

        createButton("Rename", function () {
            renameFile(file);
        }),

        createButton(file.starred ? "Unstar" : "Star", function () {
            toggleStar(file);
        }),

        createButton("Move to Trash", function () {
            trashFile(file);
        })
    );

    return fileCard;
}


// --------------------
// RENAME FILE
// --------------------

async function renameFile(file) {
    const newName = prompt("Enter a new name:", file.name);

    if (newName === null) return;

    const trimmedName = newName.trim();

    if (!trimmedName) {
        alert("The filename cannot be empty.");
        return;
    }

    if (trimmedName === file.name) return;

    try {
        await apiRequest(`/files/${file.id}/rename`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: trimmedName
            })
        });

        await loadFiles();

    } catch (error) {
        console.error("Rename failed:", error);
        alert(error.message);
    }
}


// --------------------
// STAR / UNSTAR FILE
// --------------------

async function toggleStar(file) {
    try {
        await apiRequest(`/files/${file.id}/star`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                starred: !file.starred
            })
        });

        await loadFiles();

    } catch (error) {
        console.error("Star update failed:", error);
        alert(error.message);
    }
}


// --------------------
// MOVE FILE TO TRASH
// --------------------

async function trashFile(file) {
    const confirmed = confirm(
        `Move "${file.name}" to Trash?`
    );

    if (!confirmed) return;

    try {
        await apiRequest(`/files/${file.id}`, {
            method: "DELETE"
        });

        await loadFiles();

    } catch (error) {
        console.error("Trash operation failed:", error);
        alert(error.message);
    }
}


// --------------------
// RESTORE FILE
// --------------------

async function restoreFile(file) {
    try {
        await apiRequest(`/files/${file.id}/restore`, {
            method: "PATCH"
        });

        await loadFiles();

    } catch (error) {
        console.error("Restore failed:", error);
        alert(error.message);
    }
}


// --------------------
// PERMANENTLY DELETE FILE
// --------------------

async function permanentlyDeleteFile(file) {
    const confirmed = confirm(
        `Permanently delete "${file.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
        await apiRequest(`/files/${file.id}/permanent`, {
            method: "DELETE"
        });

        await loadFiles();

    } catch (error) {
        console.error("Permanent deletion failed:", error);
        alert(error.message);
    }
}


// --------------------
// DOWNLOAD FILE
// --------------------

async function downloadFile(file) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/files/${file.id}/download`,
            {
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Could not download file.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Download failed:", error);
        alert(error.message);
    }
}


// --------------------
// PREVIEW FILE
// --------------------

function closePreview() {
    if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
        currentPreviewUrl = null;
    }

    if (previewBody) {
        previewBody.replaceChildren();
    }

    if (previewModal) {
        previewModal.hidden = true;
    }
}

if (closePreviewButton) {
    closePreviewButton.addEventListener("click", closePreview);
}

document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        previewModal &&
        !previewModal.hidden
    ) {
        closePreview();
    }
});

async function previewFile(file) {
    if (!previewModal || !previewBody || !previewTitle) return;

    closePreview();

    try {
        const response = await fetch(
            `${API_BASE_URL}/files/${file.id}/download`,
            {
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Could not retrieve file.");
        }

        const blob = await response.blob();

        previewTitle.textContent = file.name;

        const isTextFile =
            blob.type.startsWith("text/") ||
            /\.(txt|md|csv|json|js|css|html|xml)$/i.test(file.name);

        if (blob.type.startsWith("image/")) {
            currentPreviewUrl = URL.createObjectURL(blob);

            const image = document.createElement("img");
            image.src = currentPreviewUrl;
            image.alt = file.name;

            previewBody.appendChild(image);

        } else if (
            blob.type === "application/pdf" ||
            /\.pdf$/i.test(file.name)
        ) {
            currentPreviewUrl = URL.createObjectURL(blob);

            const frame = document.createElement("iframe");
            frame.src = currentPreviewUrl;
            frame.title = file.name;
            frame.style.height = "70vh";

            previewBody.appendChild(frame);

        } else if (isTextFile) {
            const text = await blob.text();

            const pre = document.createElement("pre");
            pre.textContent = text;

            previewBody.appendChild(pre);

        } else {
            previewBody.textContent =
                "Preview is not supported for this file type. You can download it instead.";
        }

        previewModal.hidden = false;

    } catch (error) {
        console.error("Preview failed:", error);

        previewTitle.textContent = file.name;
        previewBody.textContent = "Could not preview this file.";
        previewModal.hidden = false;
    }
}


// --------------------
// INITIAL LOAD
// --------------------

