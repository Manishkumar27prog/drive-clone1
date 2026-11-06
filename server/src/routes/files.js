const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Upload directory
const uploadDir = path.join(__dirname, "../../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        cb(null, crypto.randomUUID());
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

// UPLOAD FILE
router.post("/upload", upload.single("file"), async (req, res) => {
    let uploadedPath;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a file"
            });
        }

        uploadedPath = req.file.path;

        const { folderId = null } = req.body;

        // Verify folder ownership
        if (folderId) {
            const folder = await pool.query(
                `SELECT id FROM folders
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NULL`,
                [folderId, req.user.id]
            );

            if (folder.rows.length === 0) {
                fs.unlinkSync(uploadedPath);

                return res.status(404).json({
                    success: false,
                    message: "Folder not found"
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO files
             (user_id, folder_id, original_name, stored_name,
              mime_type, size, storage_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, original_name, mime_type, size,
                       folder_id, created_at`,
            [
                req.user.id,
                folderId,
                req.file.originalname,
                req.file.filename,
                req.file.mimetype,
                req.file.size,
                uploadedPath
            ]
        );

        res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            file: result.rows[0]
        });

    } catch (error) {
        if (uploadedPath && fs.existsSync(uploadedPath)) {
            fs.unlinkSync(uploadedPath);
        }

        console.error("File upload error:", error);

        res.status(500).json({
            success: false,
            message: "File upload failed"
        });
    }
});

// DOWNLOAD FILE
router.get("/:id/download", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT original_name, storage_path
             FROM files
             WHERE id = $1
             AND user_id = $2
             AND deleted_at IS NULL`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        const file = result.rows[0];

        if (!fs.existsSync(file.storage_path)) {
            return res.status(404).json({
                success: false,
                message: "Stored file is missing"
            });
        }

        res.download(file.storage_path, file.original_name);

    } catch (error) {
        console.error("File download error:", error);

        res.status(500).json({
            success: false,
            message: "File download failed"
        });
    }
});
// LIST FILES
router.get("/", async (req, res) => {
    try {
        const folderId = req.query.folderId || null;

        const result = await pool.query(
            `SELECT id, original_name, mime_type, size,
                    folder_id, is_starred, created_at, updated_at
             FROM files
             WHERE user_id = $1
             AND folder_id IS NOT DISTINCT FROM $2::uuid
             AND deleted_at IS NULL
             ORDER BY created_at DESC`,
            [req.user.id, folderId]
        );

        res.status(200).json({
            success: true,
            files: result.rows
        });

    } catch (error) {
        console.error("List files error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve files"
        });
    }
});
// RENAME FILE
router.patch("/:id/rename", async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "File name is required"
            });
        }

        const result = await pool.query(
            `UPDATE files
             SET original_name = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             AND user_id = $3
             AND deleted_at IS NULL
             RETURNING id, original_name, updated_at`,
            [name.trim(), req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        res.json({
            success: true,
            message: "File renamed successfully",
            file: result.rows[0]
        });

    } catch (error) {
        console.error("Rename file error:", error);
        res.status(500).json({
            success: false,
            message: "File rename failed"
        });
    }
});
// STAR / UNSTAR FILE
router.patch("/:id/star", async (req, res) => {
    try {
        const { starred } = req.body;

        if (typeof starred !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Starred must be true or false"
            });
        }

        const result = await pool.query(
            `UPDATE files
             SET is_starred = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             AND user_id = $3
             AND deleted_at IS NULL
             RETURNING id, original_name, is_starred`,
            [starred, req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        res.json({
            success: true,
            file: result.rows[0]
        });

    } catch (error) {
        console.error("Star file error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update star status"
        });
    }
});
// MOVE FILE TO TRASH
router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE files
             SET deleted_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             AND user_id = $2
             AND deleted_at IS NULL
             RETURNING id, original_name`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        res.json({
            success: true,
            message: "File moved to trash"
        });

    } catch (error) {
        console.error("Trash error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to move file to trash"
        });
    }
});


// LIST TRASH
router.get("/trash", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, original_name, mime_type, size,
                    folder_id, deleted_at
             FROM files
             WHERE user_id = $1
             AND deleted_at IS NOT NULL
             ORDER BY deleted_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            files: result.rows
        });

    } catch (error) {
        console.error("Trash listing error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve trash"
        });
    }
});


// RESTORE FILE
router.patch("/:id/restore", async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE files
             SET deleted_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             AND user_id = $2
             AND deleted_at IS NOT NULL
             RETURNING id, original_name, folder_id`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found in trash"
            });
        }

        res.json({
            success: true,
            message: "File restored successfully",
            file: result.rows[0]
        });

    } catch (error) {
        console.error("Restore error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to restore file"
        });
    }
});


// PERMANENTLY DELETE FILE
router.delete("/:id/permanent", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT storage_path
             FROM files
             WHERE id = $1
             AND user_id = $2
             AND deleted_at IS NOT NULL`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found in trash"
            });
        }

        const storagePath = result.rows[0].storage_path;

        await pool.query(
            `DELETE FROM files
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        const fs = require("fs");

        if (fs.existsSync(storagePath)) {
            fs.unlinkSync(storagePath);
        }

        res.json({
            success: true,
            message: "File permanently deleted"
        });

    } catch (error) {
        console.error("Permanent deletion error:", error);
        res.status(500).json({
            success: false,
            message: "Permanent deletion failed"
        });
    }
});
// LIST STARRED FILES
router.get("/starred", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, original_name, mime_type, size,
                    folder_id, is_starred, created_at
             FROM files
             WHERE user_id = $1
             AND is_starred = TRUE
             AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            files: result.rows
        });

    } catch (error) {
        console.error("Starred files error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve starred files"
        });
    }
});
// LIST RECENT FILES
router.get("/recent", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, original_name, mime_type, size,
                    folder_id, is_starred, created_at, updated_at
             FROM files
             WHERE user_id = $1
             AND deleted_at IS NULL
             ORDER BY updated_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        res.json({
            success: true,
            files: result.rows
        });

    } catch (error) {
        console.error("Recent files error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve recent files"
        });
    }
});
// SEARCH FILES
router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || !q.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const result = await pool.query(
            `SELECT id, original_name, mime_type, size,
                    folder_id, is_starred, created_at
             FROM files
             WHERE user_id = $1
             AND deleted_at IS NULL
             AND original_name ILIKE $2
             ORDER BY updated_at DESC
             LIMIT 50`,
            [req.user.id, `%${q.trim()}%`]
        );

        res.json({
            success: true,
            files: result.rows
        });

    } catch (error) {
        console.error("Search error:", error);

        res.status(500).json({
            success: false,
            message: "Search failed"
        });
    }
});
module.exports = router;
