import crypto from "crypto";

const PBKDF2_ITERS = 200000;

export async function hashPassword(pwd) {
  const salt = crypto.randomBytes(16);
  const saltHex = salt.toString("hex");
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(pwd, salt, PBKDF2_ITERS, 32, "sha256", (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`pbkdf2$${PBKDF2_ITERS}$${saltHex}$${derivedKey.toString("hex")}`);
    });
  });
}

function safeEqual(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export async function verifyPassword(pwd, stored) {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2$")) {
    const [, itersStr, saltHex, hashHex] = stored.split("$");
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(pwd, Buffer.from(saltHex, "hex"), parseInt(itersStr, 10), 32, "sha256", (err, derivedKey) => {
        if (err) reject(err);
        else resolve(safeEqual(derivedKey.toString("hex"), hashHex));
      });
    });
  }
  if (stored.startsWith("plain:")) return safeEqual(stored, "plain:" + pwd);
  // legacy sha256
  if (/^[a-f0-9]{64}$/.test(stored)) {
    const hash = crypto.createHash("sha256").update(pwd).digest("hex");
    return safeEqual(hash, stored);
  }
  return false;
}
