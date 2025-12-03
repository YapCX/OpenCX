import { importSPKI, exportJWK } from 'jose';
import fs from 'fs';

const publicKeyPem = fs.readFileSync('/tmp/jwt_pub.pem', 'utf8');
const publicKey = await importSPKI(publicKeyPem, 'RS256');
const jwk = await exportJWK(publicKey);

jwk.alg = 'RS256';
jwk.use = 'sig';
jwk.kid = 'convex-auth';

const jwks = { keys: [jwk] };
console.log(JSON.stringify(jwks));
