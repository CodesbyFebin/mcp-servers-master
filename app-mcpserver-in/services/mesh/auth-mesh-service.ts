import { db } from '@/lib/db';
import { serverIdentities, trustPolicies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';

export class AuthMeshService {
  /**
   * Generate a new Identity (Key Pair) for a server
   */
  async generateIdentity(serverId: string, tenantId: string) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const [identity] = await db.insert(serverIdentities).values({
      serverId,
      tenantId,
      publicKey,
      privateKey, // In production, encrypt this field before storing!
    }).returning();

    return identity;
  }

  /**
   * Sign a request payload
   */
  async signRequest(serverId: string, payload: string): Promise<string> {
    const identity = await db.query.serverIdentities.findFirst({
      where: and(
        eq(serverIdentities.serverId, serverId),
        eq(serverIdentities.isActive, true)
      ),
    });

    if (!identity) throw new Error('Server identity not found');

    const privateKey = crypto.createPrivateKey(identity.privateKey);
    const signature = crypto.sign('sha256', Buffer.from(payload), privateKey);
    return crypto.createHash('sha256').update(signature).digest('hex');
  }

  /**
   * Verify a request signature using the sender's public key
   */
  async verifyRequest(serverId: string, payload: string, signature: string): Promise<boolean> {
    const identity = await db.query.serverIdentities.findFirst({
      where: and(
        eq(serverIdentities.serverId, serverId),
        eq(serverIdentities.isActive, true)
      ),
    });

    if (!identity) return false;

    const publicKey = crypto.createPublicKey(identity.publicKey);
    const verified = crypto.verify('sha256', Buffer.from(payload), publicKey, Buffer.from(signature, 'hex'));
    return verified;
  }

  /**
   * Check Trust Policy (Can Server A call Server B?)
   */
  async checkTrust(sourceServerId: string, targetServerId: string, action: string): Promise<{ allowed: boolean; reason: string }> {
    const policy = await db.query.trustPolicies.findFirst({
      where: and(
        eq(trustPolicies.sourceServerId, sourceServerId),
        eq(trustPolicies.targetServerId, targetServerId)
      ),
    });

    if (!policy) {
      return { allowed: false, reason: 'No trust policy found between servers' };
    }

    // Check if action is allowed
    const actions = policy.allowedActions as string[];
    if (!actions.includes(action)) {
      return { allowed: false, reason: `Action '${action}' not allowed by policy` };
    }

    return { allowed: true, reason: 'Trust policy verified' };
  }

  /**
   * Create a new Trust Policy
   */
  async createTrustPolicy(
    tenantId: string, 
    sourceServerId: string, 
    targetServerId: string, 
    actions: string[], 
    trustLevel: string
  ) {
    return await db.insert(trustPolicies).values({
      tenantId,
      sourceServerId,
      targetServerId,
      allowedActions: actions,
      trustLevel,
    });
  }
}

export const authMeshService = new AuthMeshService();