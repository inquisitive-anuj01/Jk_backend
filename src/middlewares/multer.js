import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists if not create one !
const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "general";

    // Check the route to determine the upload folder
    const isServiceRoute = req.originalUrl && req.originalUrl.includes("/api/services");
    const isFleetRoute = req.originalUrl && req.originalUrl.includes("/api/fleet");

    if (file.fieldname === "heroImage" || file.fieldname === "gallery") {
      folder = "fleet";
    } else if (file.fieldname === "image" || file.fieldname === "images") {
      folder = isServiceRoute ? "services" : "vehicles";
    } else if (file.fieldname === "icon") {
      folder = "icons";
    }

    const dir = `${uploadDir}/${folder}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);

    // Clean filename (remove special characters)
    const cleanName = nameWithoutExt
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();

    cb(null, `${file.fieldname}-${cleanName}-${uniqueSuffix}${ext}`);
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error("Only image files are allowed (jpeg, jpg, png, gif, svg, webp)")
    );
  }
};

// Create upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

// Utility function to delete file
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};
