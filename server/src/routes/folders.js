const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protect every folder endpoint
router.use(authMiddleware);

// CREATE FOLDER
router.post("/", async (req, res) => {
    try {
        const { name, parentId = null } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Folder name is required"
            });
        }

        // Check whether the parent folder belongs to this user
        if (parentId) {
            const parent = await pool.query(
                `SELECT id FROM folders
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NULL`,
                [parentId, req.user.id]
            );

            if (parent.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Parent folder not found"
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO folders (user_id, parent_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, name, parent_id, created_at`,
            [req.user.id, parentId, name.trim()]
        );

        res.status(201).json({
            success: true,
            message: "Folder created successfully",
            folder: result.rows[0]
        });

    } catch (error) {
        console.error("Create folder error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


// LIST FOLDERS
router.get("/", async (req, res) => {
    try {
        const parentId = req.query.parentId || null;

        const result = await pool.query(
            `SELECT id, name, parent_id, created_at, updated_at
             FROM folders
             WHERE user_id = $1
             AND parent_id IS NOT DISTINCT FROM $2::uuid
             AND deleted_at IS NULL
             ORDER BY name ASC`,
            [req.user.id, parentId]
        );

        res.status(200).json({
            success: true,
            folders: result.rows
        });

    } catch (error) {
        console.error("List folders error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
// RENAME FOLDER
router.patch("/:id", async (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Folder name is required"
            });
        }

        const result = await pool.query(
            `UPDATE folders
             SET name = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             AND user_id = $3
             AND deleted_at IS NULL
             RETURNING id, name, parent_id, updated_at`,
            [name.trim(), id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Folder not found"
            });
        }

        res.json({
            success: true,
            message: "Folder renamed successfully",
            folder: result.rows[0]
        });

    } catch (error) {
        console.error("Rename folder error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
// DELETE FOLDER
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE folders
             SET deleted_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             AND user_id = $2
             AND deleted_at IS NULL
             RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Folder not found"
            });
        }

        res.json({
            success: true,
            message: "Folder moved to trash"
        });

    } catch (error) {
        console.error("Delete folder error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
module.exports = router;
