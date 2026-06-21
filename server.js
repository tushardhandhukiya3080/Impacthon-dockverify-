import express from "express";
import mongoose from "mongoose";
// Triggers restart
import path from "path";
import session from "express-session";
import bcrypt from "bcryptjs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createWorker } from 'tesseract.js';
import qrcode from 'qrcode';
import MongoStore from "connect-mongodb-session";
import pinataSDK from '@pinata/sdk';
import stream from 'stream';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import {
    computeSha256,
    computePHash,
    comparePHash,
    analyzeForgery,
    embedWatermark,
    verifyWatermark,
    runSecurityCheck,
    isWatermarkServiceConfigured,
} from "./services/securityService.js";
import { vaultEncrypt, vaultDecrypt, isVaultBlob, isVaultConfigured } from "./services/vaultService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug: Log environment variables loading
console.log('🔧 Environment variables loaded:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('- PINATA_API_KEY:', process.env.PINATA_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- PINATA_SECRET_API_KEY:', process.env.PINATA_SECRET_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- WEB3_PROVIDER_URL:', process.env.WEB3_PROVIDER_URL ? '✅ Set' : '❌ Missing');
console.log('- ACCOUNT_ADDRESS:', process.env.ACCOUNT_ADDRESS ? '✅ Set' : '❌ Missing');
console.log('- PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');
console.log('- PORT:', process.env.PORT ? '✅ Set' : '❌ Missing');
console.log('📍 Current working directory:', process.cwd());
console.log('📁 .env file path:', path.join(__dirname, '.env'));
console.log('📊 Total env vars loaded:', Object.keys(process.env).length);
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

// --- Security headers (helmet). CSP/COEP disabled because the UI loads CDN
//     scripts (Tailwind, ethers, Chart.js) and uses inline handlers. ---
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// CORS — restricted to the configured client origin (defaults to the same
// origin that serves this app). Set CLIENT_ORIGIN in .env to allow a separate
// frontend (e.g. the React dev server).
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "";
app.use((req, res, next) => {
    if (CLIENT_ORIGIN) {
        res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json({ limit: "20mb" }));

// Strip any keys containing `$` or `.` to block NoSQL/operator injection.
app.use(mongoSanitize());

// --- Rate limiters (defence against brute-force + cost abuse) ---
// Auth: tight, to stop password/OTP guessing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
});
// Heavy/paid endpoints (AI, IPFS, blockchain).
const heavyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Rate limit reached for this action. Please slow down." },
});

// --- CRITICAL FIX: Reading MONGODB_URI from environment ---
const MONGODB_URI = process.env.MONGODB_URI;
// --- Reading PINATA keys from environment ---
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || "DEFAULT_SECRET_KEY";

// --- PINATA SETUP ---
const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY);
// -----------------------------------------------------------------


// --- SESSION STORE FIX: MongoDBStore ---
const MongoDBStore = MongoStore(session);
const sessionStore = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions',
    expires: 1000 * 60 * 60 * 24 * 7,
});

sessionStore.on('error', function(error) {
    console.error("Session Store Error:", error);
});

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7
        },
    })
);

const storage = multer.memoryStorage();
// Upload limits: 15 MB max, and an allow-list of document mime types.
// `application/octet-stream` is allowed because client-side-encrypted files are
// uploaded as opaque binary blobs.
const ALLOWED_UPLOAD_TYPES = new Set([
    "image/png", "image/jpeg", "image/jpg", "image/webp",
    "application/pdf", "application/octet-stream",
]);
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_UPLOAD_TYPES.has(file.mimetype)) return cb(null, true);
        cb(new Error("Unsupported file type. Allowed: PNG, JPEG, WEBP, PDF."));
    },
});

// Surface multer errors (size/type) as clean JSON instead of a stack trace.
function handleUpload(field) {
    return (req, res, next) => {
        upload.single(field)(req, res, (err) => {
            if (err) return res.status(400).json({ message: err.message || "Upload failed." });
            next();
        });
    };
}

// Serve vanilla frontend from frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log(" Successfully connected to MongoDB Atlas!"))
    .catch((err) => console.error(" MongoDB Connection error:", err.message));

// --- Blockchain Setup (omitted for brevity) ---
const web3 = new Web3(process.env.WEB3_PROVIDER_URL || "http://127.0.0.1:7545");
const accountAddress = process.env.ACCOUNT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

async function sendHashToBlockchain(fileHash) {
    try {
        if (!web3.utils.isAddress(accountAddress)) {
            throw new Error(`Invalid account address: ${accountAddress}. Please check your .env file.`);
        }
        if (!privateKey || privateKey.length < 64) {
            throw new Error("Private key is missing or invalid. Please check your .env file.");
        }

        const txCount = await web3.eth.getTransactionCount(accountAddress);
        const networkGasPrice = await web3.eth.getGasPrice();

        const increasedGasPrice = BigInt(networkGasPrice) * BigInt(125) / BigInt(100);

        const tx = {
            nonce: web3.utils.toHex(txCount),
            gasLimit: web3.utils.toHex(500000),
            gasPrice: web3.utils.toHex(increasedGasPrice),
            to: accountAddress,
            value: "0x0",
            data: web3.utils.toHex(fileHash),
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        if (!signedTx || !signedTx.rawTransaction) {
            throw new Error("Failed to sign transaction, rawTransaction is missing.");
        }

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(" Blockchain Tx Successful:", receipt.transactionHash);
        return receipt.transactionHash;
    } catch (err) {
        console.error(" Blockchain Tx Failed:", err.message || err);
        return null;
    }
}
// --- Gemini AI Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// FIX: Force API version to v1beta for gemini-1.5-flash compatibility
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1beta" });

// Tesseract Worker removed in favor of Gemini

// Helper function to ensure worker is ready
async function ensureWorkerReady() {
    if (!worker || !workerReady) {
        throw new Error('OCR worker is not ready. Please try again in a moment.');
    }
    return worker;
}

// --- Mongoose Schemas ---
const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    walletAddress: { type: String, unique: true, sparse: true }
});
const User = mongoose.model("User", userSchema, "users");

const authorizedDocumentSchema = new mongoose.Schema({
    docNumber: { type: String, required: true, unique: true },
    docType: String,
});
const AuthorizedDocument = mongoose.model(
    "AuthorizedDocument",
    authorizedDocumentSchema,
    "authorized_documents"
);

const verificationSchema = new mongoose.Schema({
    qrId: { type: String, unique: true, sparse: true },
    docId: String,
    docType: String,
    docNumber: String,
    fileHash: String,
    transactionHash: String,
    verificationStatus: { type: String, default: "Pending" },
    userId: mongoose.Schema.Types.ObjectId,
    submittedAt: { type: Date, default: Date.now },
    documentCID: String, // <-- Stores the IPFS Content Identifier
});
const DocumentVerification = mongoose.model(
    "DocumentVerification",
    verificationSchema,
    "document_verifications"
);

const messageSchema = new mongoose.Schema({
    subject: String,
    message: String,
    submittedBy: mongoose.Schema.Types.ObjectId,
    submittedAt: { type: Date, default: Date.now },
});
const ContactMessage = mongoose.model(
    "ContactMessage",
    messageSchema,
    "contact_messages"
);

const settingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
});
const UserSettings = mongoose.model("UserSettings", settingsSchema, "user_settings");

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 minutes
});
const OTP = mongoose.model("OTP", otpSchema);

// --- ISSUER PORTAL: Published documents (issuer -> receiver) ---
// Off-chain mirror of the on-chain DocVerifyRegistry record. The blockchain
// (deployed via Remix) holds the immutable proof; this mirror enables fast
// listing and metadata, and access is gated to the issuer/receiver wallets.
const issuedDocumentSchema = new mongoose.Schema({
    docId: { type: String, required: true, unique: true }, // bytes32 hex used on-chain
    fileHash: { type: String, required: true },            // keccak256 of file bytes (on-chain L5)
    sha256: String,                                        // L1 — SHA-256 exact file hash
    pHash: String,                                         // L3 — perceptual hash (binary string)
    watermarked: { type: Boolean, default: false },        // L2 — invisible watermark embedded
    issuerWallet: { type: String, required: true },        // checksummed sender address
    receiverWallet: { type: String, required: true },      // checksummed recipient address
    receiverEmail: { type: String, lowercase: true, trim: true }, // recipient's User-Portal email
    documentCID: { type: String, required: true },         // IPFS CID
    mimeType: String,                                      // original file mime (for correct view/download)
    fileName: String,                                      // original file name
    docType: String,
    docNumber: String,
    transactionHash: String,                               // on-chain tx hash
    encrypted: { type: Boolean, default: false },          // server-vault encrypted on IPFS
    issuedAt: { type: Date, default: Date.now },
});
const IssuedDocument = mongoose.model("IssuedDocument", issuedDocumentSchema, "issued_documents");

// --- EMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Middleware (omitted for brevity) ---
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ message: "Authentication required" });
}

// ----------------------------------------------------
// --- ROUTES (Defined after all Models & Middleware) ---
// ----------------------------------------------------

// Authentication Routes (omitted for brevity)
app.post("/api/auth/send-email-otp", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Remove existing OTP for this email
        await OTP.deleteMany({ email });
        
        // Save new OTP
        await new OTP({ email, otp }).save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Document Portal Verification Code',
            text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
        };

        console.log(`🔧 Attempting to send email...`);
        console.log(`Sender: ${process.env.EMAIL_USER}`);
        console.log(`Password configured: ${process.env.EMAIL_PASS ? 'Yes' : 'No'} (Length: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0})`);
        
        try {
            await transporter.sendMail(mailOptions);
            console.log(`📧 OTP sent via Gmail to ${email}`);
            res.json({ message: "OTP sent successfully" });
        } catch (emailError) {
            console.error("❌ Gmail Send Failed:", emailError.message);
            console.log("⚠️ FALLBACK MODE ACTIVATED");
            console.log(`🔒 YOUR OTP CODE IS: ${otp}`);
            console.log("⚠️ Use this code to verify (since email failed).");
            
            // Return success anyway so frontend works
            res.json({ 
                message: "Email failed, check terminal for OTP (Dev Mode)", 
                devOtp: otp 
            });
        }
    } catch (error) {
        console.error("System error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/auth/verify-email-otp", authLimiter, async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    try {
        const record = await OTP.findOne({ email, otp });
        if (!record) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }
        
        // Delete OTP after successful verification
        await OTP.deleteOne({ _id: record._id });
        
        res.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Verification failed" });
    }
});
app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ fullName, email, password: hashedPassword, phone });
        await user.save();

        req.session.userId = user._id;
        await new UserSettings({ userId: user._id }).save();

        res.status(201).json({ message: "Account created successfully!" });
    } catch (error) {
        console.error("Error during sign-up:", error.message);
        res.status(400).json({ message: "Email already in use or invalid data." });
    }
});

app.post("/api/auth/signin", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

        req.session.userId = user._id;
        res.json({ message: "Signed in successfully!", user: { fullName: user.fullName } });
    } catch (error) {
        console.error("Error during sign-in:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
});

app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ message: "Failed to log out." });
        }
        res.json({ message: "Logged out successfully." });
    });
});

// User Profile Routes (omitted for brevity)
app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json(user);
    } catch (error) {
        console.error("Error fetching profile:", error.message);
        res.status(500).json({ message: "Failed to fetch profile." });
    }
});

app.put("/api/profile", isAuthenticated, async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.session.userId.toString()) {
            return res.status(400).json({ message: "Email already in use by another account." });
        }

        await User.findByIdAndUpdate(req.session.userId, { fullName, email, phone }, { new: true });
        res.json({ message: "Profile updated successfully!" });
    } catch (error) {
        console.error("Error updating profile:", error.message);
        res.status(500).json({ message: "Failed to update profile." });
    }
});

app.put("/api/settings", isAuthenticated, async (req, res) => {
    try {
        const { emailNotifications, smsNotifications } = req.body;
        await UserSettings.findOneAndUpdate({ userId: req.session.userId }, { emailNotifications, smsNotifications }, { new: true, upsert: true });
        res.json({ message: "Settings updated successfully!" });
    } catch (error) {
        console.error("Error updating settings:", error.message);
        res.status(500).json({ message: "Failed to update settings." });
    }
});

// --- RESTORED ROUTE: Link Wallet Address to Profile (FIXED LOCATION) ---
app.post("/api/profile/link-wallet", isAuthenticated, async (req, res) => {
    const { walletAddress } = req.body;
    const userId = req.session.userId;

    if (!walletAddress || !web3.utils.isAddress(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address provided." });
    }

    try {
        const existingUser = await User.findOne({ walletAddress: web3.utils.toChecksumAddress(walletAddress) });
        if (existingUser && existingUser._id.toString() !== userId.toString()) {
            return res.status(400).json({ message: "This wallet address is already linked to another user account." });
        }

        await User.findByIdAndUpdate(userId, { walletAddress: web3.utils.toChecksumAddress(walletAddress) });
        res.json({ message: "Wallet address linked successfully!" });
    } catch (error) {
        console.error("Error linking wallet:", error.message);
        res.status(500).json({ message: "Failed to link wallet." });
    }
});

// --- Unlink the wallet from the current user's profile ---
app.post("/api/profile/unlink-wallet", isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    try {
        // $unset keeps the unique sparse index happy (removes the field entirely).
        await User.findByIdAndUpdate(userId, { $unset: { walletAddress: "" } });
        res.json({ message: "Wallet address unlinked successfully!" });
    } catch (error) {
        console.error("Error unlinking wallet:", error.message);
        res.status(500).json({ message: "Failed to unlink wallet." });
    }
});

// Document Verification Route (omitted for brevity)
app.post("/api/verify", heavyLimiter, isAuthenticated, handleUpload("document"), async (req, res) => {
        // Gemini is stateless, no worker check needed


    const { docType, docNumber } = req.body;
    const userId = new mongoose.Types.ObjectId(req.session.userId);

    if (!docType || !docNumber || !req.file) {
        return res.status(400).json({ message: "All fields are required (Document Type, Document Number, and Document File)." });
    }
    if (!req.file.buffer) {
        return res.status(400).json({ message: "Uploaded file is empty or corrupted." });
    }

    let documentCID = null;
    let verificationStatus = "Rejected";
    let transactionHash = null;
    let qrId;
    let qrCodeDataUrl = null;
    let qrLink = null;

    try {
        // =================================================================
        // *** FIX: STEP 1 - CHECK FOR EXISTING VERIFIED RECORD BY USER ***
        // =================================================================
        const existingRecord = await DocumentVerification.findOne({
            docNumber: docNumber,
            userId: userId, // Check by user ID as well
            verificationStatus: "Verified"
        });

        if (existingRecord) {
            console.log("Existing verified record found for this user. Regenerating QR Code Image.");

            const existingQrId = existingRecord.qrId;
            const existingQrLink = existingQrId ?
                `${process.env.RENDER_APP_URL || `http://localhost:${port}`}/verify-qr?id=${existingQrId}`
                : null;

            let existingQrCodeDataUrl = null;

            // --- CRITICAL FIX: Regenerate the QR Code Image Data URL ---
            if (existingQrLink) {
                existingQrCodeDataUrl = await qrcode.toDataURL(existingQrLink);
                console.log("QR Code Image Regenerated Successfully.");
            }
            // -----------------------------------------------------------

            return res.json({
                message: "Document Already Verified!",
                verificationStatus: "Verified",
                fileHash: existingRecord.fileHash,
                transactionHash: existingRecord.transactionHash,
                documentCID: existingRecord.documentCID,
                qrCodeLink: existingQrLink,       // Pass the permanent link
                qrCodeDataUrl: existingQrCodeDataUrl, // <-- PASS THE REGENERATED IMAGE DATA
            });
        }
        // =================================================================

        // --- STEP 2: PROCEED WITH NEW VERIFICATION (If no existing record found) ---

        // --- 2.1 GEMINI AI EXTRACTION ---
        let text = '';
        let extractedDocNumber = null;

        try {
            console.log("🤖 Asking Gemini to analyze document...");
            const imageBase64 = req.file.buffer.toString('base64');
            
            // Allow png/jpeg/etc.
            const mimeType = req.file.mimetype || 'image/png'; 

            const prompt = `Analyze this document image. Return a JSON object with keys: "docType", "docNumber", and "fullText".`;

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: imageBase64, mimeType: mimeType } }
            ]);
            
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            
            let extraction = {};
            try {
                extraction = JSON.parse(cleanJson);
            } catch (e) {
                console.log("Non-JSON response from Gemini, using raw text");
                extraction = { fullText: responseText };
            }
            
            text = extraction.fullText || responseText || '';
            extractedDocNumber = extraction.docNumber;
            
            console.log("Gemini Extracted:", extraction);

        } catch (aiError) {
            console.error("Gemini Processing Error:", aiError.message);
            return res.status(500).json({ 
                message: "AI analysis failed. Please ensure the image is clear.",
                error: aiError.message 
            });
        }





        const fileHash = web3.utils.sha3(req.file.buffer);

        // --- 2.2 IPFS UPLOAD LOGIC ---
        if (pinata && PINATA_API_KEY && PINATA_SECRET_API_KEY) {
            const readableStreamForFile = stream.Readable.from(req.file.buffer);
            readableStreamForFile.path = req.file.originalname;

            const pinataResponse = await pinata.pinFileToIPFS(readableStreamForFile, {
                pinataMetadata: {
                    name: `Verified_Doc_${docNumber}`,
                    keyvalues: { docNumber: docNumber, userId: userId.toString() }
                }
            });

            documentCID = pinataResponse.IpfsHash;
            console.log("IPFS Upload Successful. CID:", documentCID);
        } else {
            console.error("Pinata SDK not fully initialized (check environment keys). Document CID will be null.");
        }

        // --- 2.3 AUTHORIZATION AND BLOCKCHAIN ---

        // Helper to normalize strings (remove spaces/special chars, lowercase)
        const normalize = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        
        const docNumberFoundInText = (extractedDocNumber && normalize(extractedDocNumber) === normalize(docNumber)) 
                                     || (text && text.includes(docNumber));



        if (docNumberFoundInText) {
            const isAuthorized = await AuthorizedDocument.findOne({ docNumber: docNumber });
            if (isAuthorized) {
                verificationStatus = "Verified";

                if (documentCID) {
                    transactionHash = await sendHashToBlockchain(fileHash);
                } else {
                    verificationStatus = "Rejected";
                    console.error("Verification failed: Document could not be pinned to IPFS.");
                }
            }
        }

        // --- 2.4 FINAL RECORD AND QR GENERATION ---
        if (verificationStatus === "Verified" && transactionHash && documentCID) {
            qrId = uuidv4(); // Generate new QR ID only for a new successful verification
            const baseUrl = process.env.RENDER_APP_URL || `http://localhost:${port}`;
            qrLink = `${baseUrl}/verify-qr?id=${qrId}`;
            qrCodeDataUrl = await qrcode.toDataURL(qrLink);
        } else {
            verificationStatus = "Rejected";
        }

        const verificationData = {
            docId: uuidv4(),
            docType,
            docNumber,
            fileHash,
            transactionHash,
            verificationStatus,
            userId,
            documentCID
        };

// ✅ ONLY add qrId if it exists
        if (qrId) {
            verificationData.qrId = qrId;
        }

        const newVerification = new DocumentVerification(verificationData);
        await newVerification.save();


        if (verificationStatus === "Verified") {
            res.json({
                message: "Document Found and Verified!",
                verificationStatus: "Verified",
                fileHash,
                transactionHash,
                qrCodeDataUrl,
                documentCID: documentCID,
                qrCodeLink: qrLink,
            });
        } else {
            res.status(404).json({
                message: "Document not found or invalid. Verification Rejected.",
                verificationStatus: "Rejected",
                fileHash: newVerification.fileHash, // Return hash even if rejected for debugging
                transactionHash: null,
                documentCID: null,
                qrCodeDataUrl: null,
                qrCodeLink: null
            });
        }

    } catch (error) {
        console.error("Error during verification:", error.message);
        if (error.message && error.message.includes('API Key') || error.message.includes('pinFileToIPFS')) {
            return res.status(500).json({ message: "Verification failed. Pinata API Keys may be incorrect or missing from your .env/Render environment." });
        }
        res.status(500).json({ message: `An internal server error occurred during verification: ${error.message}` });
    }
});


// QR Code Initial Check Endpoint (omitted for brevity)
app.get("/api/qr-check", async (req, res) => {
    const qrId = req.query.id;
    if (!qrId) {
        return res.status(400).json({ message: "QR Document ID is required." });
    }

    try {
        const verificationRecord = await DocumentVerification.findOne({ qrId: qrId });

        if (!verificationRecord) {
            return res.status(404).json({ message: "Document verification record not found for this QR code." });
        }

        res.json({
            verificationStatus: verificationRecord.verificationStatus,
            docType: verificationRecord.docType,
            submittedAt: verificationRecord.submittedAt,
            message: "Initial verification check successful."
        });
    } catch (error) {
        console.error("Error during QR initial check:", error.message);
        res.status(500).json({ message: "An internal server error occurred during QR check." });
    }
});

// FINAL: Web3 Signature Verification Endpoint with Authorization Check
app.post("/api/qr-verify-signature", async (req, res) => {
    const { qrId, walletAddress, signature, message } = req.body;

    if (!qrId || !walletAddress || !signature || !message) {
        return res.status(400).json({ message: "QR ID, Wallet Address, Signature, and Message are required." });
    }

    try {
        const recoveredAddress = await web3.eth.accounts.recover(message, signature);
        const recoveredAddressChecksum = web3.utils.toChecksumAddress(recoveredAddress);
        const walletAddressChecksum = web3.utils.toChecksumAddress(walletAddress);

        if (recoveredAddressChecksum !== walletAddressChecksum) {
            return res.status(401).json({ message: "Invalid cryptographic signature." });
        }

        const verificationRecord = await DocumentVerification.findOne({ qrId: qrId });
        if (!verificationRecord) {
            return res.status(404).json({ message: "Document record not found." });
        }

        const owner = await User.findById(verificationRecord.userId);

        if (!owner) {
            return res.status(404).json({ message: "Document owner not found." });
        }

        // IMPROVED LOGIC: Allow access if user has no wallet linked OR if wallet matches
        if (!owner.walletAddress) {
            // If owner hasn't linked a wallet, allow any valid signature but warn
            console.log(`⚠️  Document owner has no wallet linked. Allowing access for wallet: ${recoveredAddressChecksum}`);
            
            return res.json({
                message: "Signature verified. Full details revealed. (Note: Document owner has not linked a wallet)",
                docType: verificationRecord.docType,
                docNumber: verificationRecord.docNumber,
                fileHash: verificationRecord.fileHash,
                transactionHash: verificationRecord.transactionHash,
                verificationStatus: verificationRecord.verificationStatus,
                documentCID: verificationRecord.documentCID,
                warning: "The document owner has not linked a MetaMask wallet to their account."
            });
        }

        const ownerWalletChecksum = web3.utils.toChecksumAddress(owner.walletAddress);

        if (recoveredAddressChecksum !== ownerWalletChecksum) {
            console.warn(`ACCESS DENIED: Wallet ${recoveredAddressChecksum} tried to unlock document owned by ${ownerWalletChecksum}`);
            return res.status(403).json({ 
                message: "Access Denied: The signing wallet does not match the registered document owner.",
                details: {
                    yourWallet: recoveredAddressChecksum,
                    requiredWallet: ownerWalletChecksum,
                    suggestion: "Please use the correct wallet or link your current wallet to your account in the Profile section."
                }
            });
        }

        // Perfect match - wallet is linked and matches
        console.log(`✅ Wallet verification successful: ${recoveredAddressChecksum} matches owner wallet`);
        
        res.json({
            message: "Signature verified. Full details revealed.",
            docType: verificationRecord.docType,
            docNumber: verificationRecord.docNumber,
            fileHash: verificationRecord.fileHash,
            transactionHash: verificationRecord.transactionHash,
            verificationStatus: verificationRecord.verificationStatus,
            documentCID: verificationRecord.documentCID,
        });

    } catch (error) {
        console.error("Error during signature verification:", error.message || error);
        res.status(500).json({ message: "An internal server error occurred during signature verification." });
    }
});

// Test endpoint to add authorized documents (for development)
app.post("/api/add-test-documents", async (req, res) => {
    try {
        const testDocuments = [
            { docNumber: "BC-2023-001", docType: "Birth Certificate" },
            { docNumber: "BC-2023-002", docType: "Birth Certificate" },
            { docNumber: "EC-2023-001", docType: "Educational Certificate" },
            { docNumber: "EC-2023-002", docType: "Educational Certificate" },
            { docNumber: "PD-2023-001", docType: "Property Document" },
            { docNumber: "PD-2023-002", docType: "Property Document" },
            { docNumber: "ID-2023-001", docType: "Identity Document" },
            { docNumber: "ID-2023-002", docType: "Identity Document" },
            { docNumber: "TEST-001", docType: "Birth Certificate" },
            { docNumber: "TEST-002", docType: "Educational Certificate" }
        ];

        for (const doc of testDocuments) {
            await AuthorizedDocument.findOneAndUpdate(
                { docNumber: doc.docNumber },
                doc,
                { upsert: true, new: true }
            );
        }

        res.json({ 
            message: "Test authorized documents added successfully!", 
            count: testDocuments.length,
            documents: testDocuments
        });
    } catch (error) {
        console.error("Error adding test documents:", error.message);
        res.status(500).json({ message: "Failed to add test documents." });
    }
});

// Statistics and Contact Routes (omitted for brevity)
app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        console.log("📊 Fetching statistics for user ID:", userId);

        // Get comprehensive document statistics
        const totalDocuments = await DocumentVerification.countDocuments({ userId });
        const verifiedDocuments = await DocumentVerification.countDocuments({
            userId,
            verificationStatus: "Verified",
        });
        const rejectedDocuments = await DocumentVerification.countDocuments({
            userId,
            verificationStatus: "Rejected",
        });
        const pendingDocuments = await DocumentVerification.countDocuments({
            userId,
            verificationStatus: "Pending",
        });

        // Get documents by type
        const documentsByType = await DocumentVerification.aggregate([
            { $match: { userId: userId } },
            { $group: { _id: "$docType", count: { $sum: 1 } } }
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivity = await DocumentVerification.countDocuments({
            userId,
            submittedAt: { $gte: thirtyDaysAgo }
        });

        // Calculate success rate
        const successRate = totalDocuments > 0 ? Math.round((verifiedDocuments / totalDocuments) * 100) : 0;

        const statistics = {
            // Dashboard compatibility (old field names)
            totalVerified: totalDocuments,
            successfulVerifications: verifiedDocuments,
            pendingRequests: pendingDocuments,
            
            // New comprehensive statistics
            totalDocuments,
            verifiedDocuments,
            rejectedDocuments,
            pendingDocuments,
            documentsByType: documentsByType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            recentActivity,
            successRate,
            
            // Additional metrics
            totalIPFSUploads: await DocumentVerification.countDocuments({ 
                userId, 
                documentCID: { $exists: true, $ne: null } 
            }),
            totalBlockchainTransactions: await DocumentVerification.countDocuments({ 
                userId, 
                transactionHash: { $exists: true, $ne: null } 
            }),
        };

        console.log("📊 Statistics calculated:", statistics);
        res.json(statistics);
    } catch (error) {
        console.error("Error fetching statistics:", error.message);
        res.status(500).json({ message: "Failed to fetch statistics." });
    }
});

// Get user's verified documents
app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        console.log("📊 Fetching documents for user ID:", userId);

        const documents = await DocumentVerification.find({ userId })
            .sort({ submittedAt: -1 }) // Most recent first
            .select('docId docType docNumber fileHash transactionHash verificationStatus submittedAt documentCID qrId');

        console.log(`📊 Found ${documents.length} documents for user`);

        // Transform the documents to match frontend expectations
        const transformedDocuments = documents.map(doc => ({
            id: doc.docId,
            docId: doc.docId,
            name: `${doc.docType} - ${doc.docNumber}`,
            docNumber: doc.docNumber,
            docType: doc.docType,
            ipfsHash: doc.documentCID,
            documentCID: doc.documentCID,
            uploadDate: doc.submittedAt, // Keep as Date object
            submittedAt: doc.submittedAt, // Keep as Date object
            status: doc.verificationStatus,
            fileType: 'application/pdf', // Default file type
            fileHash: doc.fileHash,
            transactionHash: doc.transactionHash,
            qrId: doc.qrId,
        }));

        console.log("📊 Transformed documents:", transformedDocuments.length);
        res.json(transformedDocuments);
    } catch (error) {
        console.error("Error fetching documents:", error.message);
        res.status(500).json({ message: "Failed to fetch documents." });
    }
});

// Get document content from IPFS with MetaMask verification
app.post("/api/documents/:docId/view", isAuthenticated, async (req, res) => {
    try {
        const { docId } = req.params;
        const { walletAddress, signature } = req.body;
        
        console.log("🔍 Document view request for docId:", docId);
        console.log("🦊 Wallet address:", walletAddress);
        
        // Find the document
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        const document = await DocumentVerification.findOne({ 
            docId: docId, 
            userId: userId 
        });
        
        if (!document) {
            return res.status(404).json({ message: "Document not found." });
        }
        
        // Verify MetaMask signature
        if (!walletAddress || !signature) {
            return res.status(400).json({ message: "MetaMask verification required." });
        }
        
        try {
            // Verify the signature
            const message = `Access document: ${docId}`;
            const recoveredAddress = web3.eth.accounts.recover(message, signature);
            
            if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(401).json({ message: "Invalid MetaMask signature." });
            }
            
            console.log("✅ MetaMask signature verified for document access");
        } catch (sigError) {
            console.error("❌ Signature verification failed:", sigError.message);
            return res.status(401).json({ message: "Invalid signature format." });
        }
        
        // Fetch document from IPFS
        if (!document.documentCID) {
            return res.status(404).json({ message: "Document not found in IPFS." });
        }
        
        try {
            console.log("📥 Fetching document from IPFS:", document.documentCID);
            
            // Fetch from Pinata IPFS gateway
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${document.documentCID}`;
            const response = await fetch(ipfsUrl);
            
            if (!response.ok) {
                throw new Error(`IPFS fetch failed: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            const buffer = await response.arrayBuffer();
            
            console.log("✅ Document fetched from IPFS successfully");
            
            // Return document metadata and content
            res.json({
                success: true,
                document: {
                    id: document.docId,
                    name: `${document.docType} - ${document.docNumber}`,
                    docType: document.docType,
                    docNumber: document.docNumber,
                    contentType: contentType,
                    size: buffer.byteLength,
                    ipfsHash: document.documentCID,
                    transactionHash: document.transactionHash,
                    verificationStatus: document.verificationStatus,
                    submittedAt: document.submittedAt
                },
                content: Buffer.from(buffer).toString('base64'), // Base64 encoded content
                downloadUrl: ipfsUrl
            });
            
        } catch (ipfsError) {
            console.error("❌ IPFS fetch error:", ipfsError.message);
            res.status(500).json({ message: "Failed to fetch document from IPFS." });
        }
        
    } catch (error) {
        console.error("❌ Document view error:", error.message);
        res.status(500).json({ message: "Failed to access document." });
    }
});

app.post("/api/contact", isAuthenticated, async (req, res) => {
    const { subject, message } = req.body;
    try {
        const contactMessage = new ContactMessage({
            subject,
            message,
            submittedBy: req.session.userId,
        });
        await contactMessage.save();
        res.status(201).json({ message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending contact message:", error.message);
        res.status(500).json({ message: "Failed to send message." });
    }
});

// ====================================================================
// --- ISSUER PORTAL ROUTES (MetaMask-wallet authenticated) ---
// ====================================================================

// Recover the signing wallet from a message + signature, checksummed.
async function recoverSigner(message, signature) {
    const recovered = await web3.eth.accounts.recover(message, signature);
    return web3.utils.toChecksumAddress(recovered);
}

// Middleware-style helper: verifies that `signature` over `message` was produced
// by `walletAddress`. Returns the checksummed address, or null on failure.
async function verifyWalletSignature(walletAddress, signature, message) {
    try {
        if (!walletAddress || !signature || !message) return null;
        if (!web3.utils.isAddress(walletAddress)) return null;
        const recovered = await recoverSigner(message, signature);
        if (recovered !== web3.utils.toChecksumAddress(walletAddress)) return null;
        return recovered;
    } catch (err) {
        console.error("Issuer signature verification failed:", err.message || err);
        return null;
    }
}

// --- Upload the original file to IPFS (issuer-authenticated) ---
// Returns the IPFS CID + keccak256 file hash so the frontend can publish them
// on-chain (via the issuer's MetaMask) before mirroring the record here.
app.post("/api/issuer/upload", heavyLimiter, handleUpload("document"), async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    const issuer = await verifyWalletSignature(walletAddress, signature, message);
    if (!issuer) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "A document file is required." });
    }

    try {
        if (!pinata || !PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
            return res.status(500).json({ message: "IPFS storage is not configured (missing Pinata keys)." });
        }

        // docId is generated here so the invisible watermark can carry it.
        const docId = web3.utils.sha3(uuidv4() + Date.now());
        const isEncrypted = String(req.body.encrypted) === "true";
        const passphrase = req.body.passphrase || "";
        const isImage = (req.file.mimetype || "").startsWith("image/");

        if (isEncrypted) {
            if (!isVaultConfigured()) {
                return res.status(500).json({ message: "Server vault not configured (missing DOC_MASTER_KEY)." });
            }
            if (!passphrase || passphrase.length < 6) {
                return res.status(400).json({ message: "A passphrase of at least 6 characters is required to encrypt." });
            }
        }

        // Start from the plaintext (the server receives plaintext for site-gated
        // encryption — that's what lets it gate decryption later).
        let plaintext = req.file.buffer;

        // --- Layer 2: embed an invisible watermark on the plaintext image
        //     (only when the Python service is configured/running). ---
        let watermarked = false;
        if (isImage && isWatermarkServiceConfigured()) {
            const wm = await embedWatermark(plaintext, docId, req.file.originalname);
            if (wm) { plaintext = wm; watermarked = true; }
        }

        // Fingerprints describe the PLAINTEXT the verifier will hold after the
        // server decrypts it — so the 5-layer check works for encrypted docs too.
        const sha256 = computeSha256(plaintext);          // L1
        const pHash = await computePHash(plaintext);      // L3 (null for non-images)

        // Encrypt with the server vault (master key + passphrase) if requested,
        // then pin the resulting bytes to IPFS.
        const storedBuffer = isEncrypted ? vaultEncrypt(plaintext, passphrase) : plaintext;
        const fileHash = web3.utils.sha3(storedBuffer);   // keccak256 -> bytes32 (on-chain L5)

        const readableStreamForFile = stream.Readable.from(storedBuffer);
        readableStreamForFile.path = req.file.originalname || `issued_${Date.now()}`;

        const pinataResponse = await pinata.pinFileToIPFS(readableStreamForFile, {
            pinataMetadata: {
                name: `Issued_Doc_${Date.now()}`,
                keyvalues: { issuer }
            }
        });

        const documentCID = pinataResponse.IpfsHash;
        console.log(`📤 Issuer upload pinned: ${documentCID} | watermark: ${watermarked} | pHash: ${pHash ? "yes" : "n/a"}`);

        res.json({
            docId, documentCID, fileHash, sha256, pHash, watermarked,
            mimeType: req.file.mimetype || "application/octet-stream",
            fileName: req.file.originalname || "document",
        });
    } catch (error) {
        console.error("Error during issuer upload:", error.message);
        res.status(500).json({ message: "Failed to upload document to IPFS." });
    }
});

// --- Mirror an on-chain published record (issuer-authenticated) ---
app.post("/api/issuer/record", async (req, res) => {
    const {
        docId, fileHash, documentCID, receiverWallet, receiverEmail,
        docType, docNumber, transactionHash, encrypted,
        sha256, pHash, watermarked, mimeType, fileName,
        walletAddress, signature, message
    } = req.body;

    const issuer = await verifyWalletSignature(walletAddress, signature, message);
    if (!issuer) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    if (!docId || !fileHash || !documentCID || !receiverWallet) {
        return res.status(400).json({ message: "docId, fileHash, documentCID and receiverWallet are required." });
    }
    if (!web3.utils.isAddress(receiverWallet)) {
        return res.status(400).json({ message: "Invalid receiver wallet address." });
    }
    if (receiverEmail && !/^\S+@\S+\.\S+$/.test(receiverEmail)) {
        return res.status(400).json({ message: "Invalid recipient email address." });
    }

    try {
        const record = await IssuedDocument.findOneAndUpdate(
            { docId },
            {
                docId,
                fileHash,
                sha256,
                pHash,
                watermarked: !!watermarked,
                issuerWallet: issuer,
                receiverWallet: web3.utils.toChecksumAddress(receiverWallet),
                receiverEmail: receiverEmail ? receiverEmail.toLowerCase().trim() : undefined,
                documentCID,
                mimeType,
                fileName,
                docType,
                docNumber,
                transactionHash,
                encrypted: !!encrypted,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`📝 Issued document recorded: ${docId} (${issuer} -> ${record.receiverWallet}${record.receiverEmail ? " / " + record.receiverEmail : ""})`);

        // Best-effort: notify the recipient by email that a document is waiting.
        if (record.receiverEmail && process.env.EMAIL_USER) {
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: record.receiverEmail,
                subject: "📄 A verified document was issued to you on DocVerify",
                text: `An issuer has published a document to you.\n\nType: ${docType || "Document"}\nNumber: ${docNumber || "—"}\n\nLog in to your DocVerify User Portal with this email to view it under "Received Documents".${record.encrypted ? "\n\nNote: this document is encrypted — ask the issuer for the passphrase to open it." : ""}`,
            }).then(() => console.log(`📧 Recipient notified: ${record.receiverEmail}`))
              .catch((e) => console.warn("Recipient email failed:", e.message));
        }

        res.status(201).json({ message: "Document published and recorded successfully!", docId: record.docId });
    } catch (error) {
        console.error("Error recording issued document:", error.message);
        res.status(500).json({ message: "Failed to record the published document." });
    }
});

// --- List documents accessible to a wallet: issued by OR received by it ---
app.post("/api/issuer/documents", async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    const wallet = await verifyWalletSignature(walletAddress, signature, message);
    if (!wallet) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    try {
        const docs = await IssuedDocument.find({
            $or: [{ issuerWallet: wallet }, { receiverWallet: wallet }]
        }).sort({ issuedAt: -1 });

        const transformed = docs.map(d => ({
            docId: d.docId,
            fileHash: d.fileHash,
            issuerWallet: d.issuerWallet,
            receiverWallet: d.receiverWallet,
            documentCID: d.documentCID,
            docType: d.docType,
            docNumber: d.docNumber,
            transactionHash: d.transactionHash,
            encrypted: d.encrypted,
            issuedAt: d.issuedAt,
            role: d.issuerWallet === wallet ? "issued" : "received",
        }));

        res.json(transformed);
    } catch (error) {
        console.error("Error listing issued documents:", error.message);
        res.status(500).json({ message: "Failed to fetch documents." });
    }
});

// --- Fetch a published document's content from IPFS (issuer/receiver only) ---
app.post("/api/issuer/documents/:docId/view", async (req, res) => {
    const { docId } = req.params;
    const { walletAddress, signature, message } = req.body;

    const wallet = await verifyWalletSignature(walletAddress, signature, message);
    if (!wallet) {
        return res.status(401).json({ message: "Invalid MetaMask signature. Please reconnect your wallet." });
    }

    try {
        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) {
            return res.status(404).json({ message: "Document not found." });
        }

        // Access control: only the issuer (sender) or the receiver may view.
        if (wallet !== doc.issuerWallet && wallet !== doc.receiverWallet) {
            return res.status(403).json({
                message: "Access Denied: only the issuer or the designated receiver can open this document.",
            });
        }

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${doc.documentCID}`;
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
            throw new Error(`IPFS fetch failed: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        let bytes = Buffer.from(await response.arrayBuffer());

        // Site-gated decryption: vault blobs can only be opened here, with the
        // passphrase the user submits to our server.
        if (isVaultBlob(bytes)) {
            if (!req.body.passphrase) {
                return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true });
            }
            try {
                bytes = vaultDecrypt(bytes, req.body.passphrase);
            } catch {
                return res.status(401).json({ message: "Wrong passphrase.", needsPassphrase: true });
            }
        }

        res.json({
            success: true,
            document: {
                docId: doc.docId,
                docType: doc.docType,
                docNumber: doc.docNumber,
                contentType: doc.mimeType || contentType,   // original mime so it opens correctly
                fileName: doc.fileName,
                size: bytes.byteLength,
                ipfsHash: doc.documentCID,
                transactionHash: doc.transactionHash,
                issuerWallet: doc.issuerWallet,
                receiverWallet: doc.receiverWallet,
                issuedAt: doc.issuedAt,
            },
            content: bytes.toString('base64'),
        });
    } catch (error) {
        console.error("Error viewing issued document:", error.message);
        res.status(500).json({ message: "Failed to fetch document from IPFS." });
    }
});

// ====================================================================
// --- 5-LAYER ANTI-COPY SECURITY CHECK (User Portal) ---
// ====================================================================
//
// Upload any file; the system fingerprints it (SHA-256 + pHash), finds the
// matching registered original (by exact hash, else nearest perceptual hash),
// then runs all five layers and returns a verdict. This is what rejects
// screenshots, photocopies, and phone photos of a registered document.
app.post("/api/security/check", heavyLimiter, isAuthenticated, handleUpload("document"), async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "A document file is required." });
    }

    try {
        const buffer = req.file.buffer;
        const sha256 = computeSha256(buffer);
        const pHash = await computePHash(buffer);

        // 1) Try an exact SHA-256 match against a registered original.
        let match = await IssuedDocument.findOne({ sha256 });
        let matchType = match ? "exact" : null;

        // 2) Otherwise find the nearest perceptual-hash match (detects copies).
        if (!match && pHash) {
            const candidates = await IssuedDocument.find({ pHash: { $exists: true, $ne: null } })
                .select("docId sha256 pHash watermarked transactionHash docType docNumber");
            let best = null, bestDist = Infinity;
            for (const c of candidates) {
                const { distance } = comparePHash(pHash, c.pHash);
                if (distance !== null && distance < bestDist) { bestDist = distance; best = c; }
            }
            if (best && bestDist <= 15) { match = best; matchType = "perceptual"; }
        }

        const expected = match ? {
            sha256: match.sha256,
            pHash: match.pHash,
            docId: match.docId,
            watermarked: match.watermarked,
            filename: req.file.originalname,
        } : {};

        const blockchainRegistered = match ? !!match.transactionHash : false;

        const result = await runSecurityCheck({
            buffer,
            model,
            mimeType: req.file.mimetype,
            expected,
            blockchainRegistered,
        });

        res.json({
            ...result,
            matched: !!match,
            matchType,
            registeredDoc: match ? {
                docType: match.docType,
                docNumber: match.docNumber,
                docId: match.docId,
                transactionHash: match.transactionHash,
            } : null,
            watermarkServiceConfigured: isWatermarkServiceConfigured(),
        });
    } catch (error) {
        console.error("Security check error:", error.message);
        res.status(500).json({ message: `Security check failed: ${error.message}` });
    }
});

// ====================================================================
// --- RECEIVED DOCUMENTS (User Portal sees docs issued to them) ---
// ====================================================================
//
// An issued document reaches the recipient here: matched by the logged-in
// user's email (set by the issuer) OR their linked wallet address.
app.get("/api/received-documents", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select("email walletAddress");
        if (!user) return res.status(404).json({ message: "User not found." });

        const or = [];
        if (user.email) or.push({ receiverEmail: user.email.toLowerCase().trim() });
        if (user.walletAddress) or.push({ receiverWallet: web3.utils.toChecksumAddress(user.walletAddress) });
        if (!or.length) return res.json([]);

        const docs = await IssuedDocument.find({ $or: or }).sort({ issuedAt: -1 });

        res.json(docs.map(d => ({
            docId: d.docId,
            docType: d.docType,
            docNumber: d.docNumber,
            issuerWallet: d.issuerWallet,
            receiverWallet: d.receiverWallet,
            documentCID: d.documentCID,
            transactionHash: d.transactionHash,
            encrypted: d.encrypted,
            watermarked: d.watermarked,
            issuedAt: d.issuedAt,
        })));
    } catch (error) {
        console.error("Error fetching received documents:", error.message);
        res.status(500).json({ message: "Failed to fetch received documents." });
    }
});

// --- View a received document (recipient, MetaMask-signature gated) ---
app.post("/api/received-documents/:docId/view", isAuthenticated, async (req, res) => {
    const { docId } = req.params;
    const { walletAddress, signature, message } = req.body;
    try {
        const user = await User.findById(req.session.userId).select("email walletAddress");
        const doc = await IssuedDocument.findOne({ docId });
        if (!doc) return res.status(404).json({ message: "Document not found." });

        // Authorisation: the logged-in user must be the recipient (by email),
        // and must prove control of a wallet that is the issuer or receiver.
        const emailMatch = user?.email && doc.receiverEmail &&
            user.email.toLowerCase().trim() === doc.receiverEmail;

        const signer = await verifyWalletSignature(walletAddress, signature, message);
        const walletMatch = signer &&
            (signer === doc.receiverWallet || signer === doc.issuerWallet);

        if (!emailMatch && !walletMatch) {
            return res.status(403).json({ message: "Access denied: you are not the recipient of this document." });
        }
        if (!walletMatch) {
            return res.status(401).json({ message: "Please sign with the recipient or issuer wallet to open this document." });
        }

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${doc.documentCID}`;
        const response = await fetch(ipfsUrl);
        if (!response.ok) throw new Error(`IPFS fetch failed: ${response.status}`);
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        let bytes = Buffer.from(await response.arrayBuffer());

        // Site-gated decryption — only this server (with DOC_MASTER_KEY) can open
        // a vault blob, and only with the passphrase the user enters here.
        if (isVaultBlob(bytes)) {
            if (!req.body.passphrase) {
                return res.status(428).json({ message: "Passphrase required.", needsPassphrase: true });
            }
            try {
                bytes = vaultDecrypt(bytes, req.body.passphrase);
            } catch {
                return res.status(401).json({ message: "Wrong passphrase.", needsPassphrase: true });
            }
        }

        res.json({
            success: true,
            document: {
                docId: doc.docId, docType: doc.docType, docNumber: doc.docNumber,
                contentType: doc.mimeType || contentType, fileName: doc.fileName,
                encrypted: doc.encrypted,
            },
            content: bytes.toString("base64"),
        });
    } catch (error) {
        console.error("Error viewing received document:", error.message);
        res.status(500).json({ message: "Failed to open document." });
    }
});

// Catch-all handler: send back vanilla frontend's index.html file for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// --- Server Start ---
app.listen(port, () => {
    console.log(` Server is running on http://localhost:${port}`);
});