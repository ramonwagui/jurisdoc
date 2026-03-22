import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

console.log("R2 Configuration:", {
  endpoint: process.env.R2_ENDPOINT,
  bucket: process.env.R2_BUCKET_NAME,
  hasKeyId: !!process.env.R2_ACCESS_KEY_ID,
  hasSecret: !!process.env.R2_SECRET_ACCESS_KEY,
});

export class ObjectStorageService {
  async uploadObjectEntity(
    buffer: Buffer,
    contentType: string,
  ): Promise<{ objectPath: string }> {
    const objectId = randomUUID();
    const objectKey = `uploads/${objectId}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return { objectPath: `/objects/uploads/${objectId}` };
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const objectKey = `uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    });

    return signedUrl;
  }

  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const objectKey = parts.slice(1).join("/");

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: objectKey,
        }),
      );
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === "NotFound" || err.name === "NoSuchKey") {
        throw new ObjectNotFoundError();
      }
      throw error;
    }

    return objectKey;
  }

  async downloadObject(objectKey: string): Promise<Response> {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      }),
    );

    const stream = response.Body as ReadableStream<Uint8Array>;
    const headers: Record<string, string> = {
      "Content-Type": response.ContentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    };

    if (response.ContentLength) {
      headers["Content-Length"] = String(response.ContentLength);
    }

    return new Response(stream, { headers });
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: objectKey,
        }),
      );
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name !== "NoSuchKey") {
        throw error;
      }
    }
  }

  async searchPublicObject(filePath: string): Promise<string | null> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `public/${filePath}`,
      MaxKeys: 1,
    });

    const response = await s3Client.send(command);

    if (response.Contents && response.Contents.length > 0) {
      return response.Contents[0].Key!;
    }

    return null;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.includes(BUCKET_NAME)) {
      const parts = rawPath.split(`${BUCKET_NAME}/`);
      if (parts.length > 1) {
        const objectKey = parts[1];
        const entityId = objectKey.replace("uploads/", "");
        return `/objects/uploads/${entityId}`;
      }
    }
    return rawPath;
  }
}
