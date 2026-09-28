import{createCipheriv,createDecipheriv,randomBytes}from"node:crypto";
export interface EncryptedSecret{ciphertext:Buffer;iv:Buffer;authTag:Buffer;keyVersion:number}
export class CredentialSecretStore{
 private constructor(private readonly key:Buffer,private readonly keyVersion:number){}
 static fromBase64(encoded:string|undefined,keyVersion=1){if(!encoded)throw new Error("CONNECTION_MASTER_KEY_REQUIRED");if(!/^[A-Za-z0-9+/]{43}=$/.test(encoded)||!Number.isSafeInteger(keyVersion)||keyVersion<1)throw new Error("CONNECTION_MASTER_KEY_INVALID");const key=Buffer.from(encoded,"base64");if(key.length!==32||key.toString("base64")!==encoded)throw new Error("CONNECTION_MASTER_KEY_INVALID");return new CredentialSecretStore(key,keyVersion)}
 static fromEnvironment(){return this.fromBase64(process.env.CONNECTION_MASTER_KEY,Number(process.env.CONNECTION_KEY_VERSION??"1"))}
 encrypt(secret:string):EncryptedSecret{if(!secret)throw new Error("EMPTY_SECRET");const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",this.key,iv);const ciphertext=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);return{ciphertext,iv,authTag:cipher.getAuthTag(),keyVersion:this.keyVersion}}
 decrypt(value:EncryptedSecret){const decipher=createDecipheriv("aes-256-gcm",this.key,value.iv);decipher.setAuthTag(value.authTag);return Buffer.concat([decipher.update(value.ciphertext),decipher.final()]).toString("utf8")}
}
