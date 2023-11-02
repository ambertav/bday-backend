import crypto from 'crypto';

const AUTH_HASH_ITER_ROUNDS = 16;
const AUTH_HASH_KEY_LENGTH=64;
const AUTH_HASH_DIGEST="sha512";

export function hashString(string: string): Promise<string> {
    const salt = crypto.randomBytes(Number(16)).toString('hex');
    return new Promise((resolve, reject) =>
        crypto.pbkdf2(string,
            salt,
            AUTH_HASH_ITER_ROUNDS,
            AUTH_HASH_KEY_LENGTH,
            AUTH_HASH_DIGEST,
            (err, key) => {
                if (err) {
                    reject(err);
                }
                resolve(`${salt}:${key.toString('hex')}`);
            }));
}

export function compareHash(string: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':');
    return new Promise((resolve, reject) =>
        crypto.pbkdf2(string,
            salt,
            Number(AUTH_HASH_ITER_ROUNDS),
            Number(AUTH_HASH_KEY_LENGTH),
            String(AUTH_HASH_DIGEST),
            (err, compKey) => {
                if (err) {
                    reject(err);
                }
                resolve(key === compKey.toString('hex'));
            }));
}

export function digest(data:string){
    return crypto.createHash('sha256').update(data).digest('hex');
}